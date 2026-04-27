import fs from 'fs'
import os from 'os'
import path from 'path'
import fsp from 'fs/promises'
import { createHash } from 'crypto'
import { pipeline } from 'stream/promises'
import {
    DEFAULT_CONTENT_PACK_OUTPUT_DIR,
    DEFAULT_CONTENT_PACK_SOURCE_DIR,
    DEFAULT_VMF_PACK_OUTPUT_DIR,
    ensureCleanOutputDirectory,
    ensureOutputDirectory,
    formatBytes,
    isSameOrInside,
    pathExists,
    resolveRealPath,
    type RunEvent,
} from './shared.js'
import { runOptionalPostProcess, type PostProcessConfig } from './post-process.js'

export const DEFAULT_CONTENT_PACK_CONTENT_DIR = DEFAULT_CONTENT_PACK_SOURCE_DIR
export const DEFAULT_CONTENT_PACK_CONTENT_DIRS = [DEFAULT_CONTENT_PACK_SOURCE_DIR, DEFAULT_VMF_PACK_OUTPUT_DIR]
export const DEFAULT_CONTENT_PACK_OUTPUT_PATH = DEFAULT_CONTENT_PACK_OUTPUT_DIR
export const DEFAULT_CONTENT_PACK_RULES_PATH = ''

export type ContentPackGroupInput = {
    id: string
    folder: string
    displayName?: string
}

export type ContentPackRuleMatchInput = {
    addonName?: string
    addonNamePattern?: string
}

export type ContentPackRuleInput = {
    id?: string
    match: ContentPackRuleMatchInput
    action?: 'pack' | 'skip'
    groupId?: string
    priority?: number
}

export type ContentPackUnmatchedInput =
    | {
        action: 'skip'
    }
    | {
        action: 'pack'
        groupId: string
        priority?: number
    }

export type ContentPackRulesInput = {
    groups: ContentPackGroupInput[]
    rules: ContentPackRuleInput[]
    unmatched?: ContentPackUnmatchedInput
}

export function createDefaultContentPackRulesInput(): ContentPackRulesInput {
    return {
        groups: [],
        rules: [],
        unmatched: { action: 'skip' },
    }
}

export type ContentPackConfig = {
    contentDir?: string
    contentDirs?: string[]
    outputPath: string
    cleanOutput: boolean
    rulesPath?: string
    rulesConfig?: ContentPackRulesInput
} & PostProcessConfig

type ContentPackGroup = ContentPackGroupInput
type ContentPackRuleMatch = ContentPackRuleMatchInput
type ContentPackRule = ContentPackRuleInput
type ContentPackUnmatchedRule = ContentPackUnmatchedInput
type ContentPackRulesFile = ContentPackRulesInput

type CompiledRule = {
    id: string
    action: 'pack' | 'skip'
    groupId?: string
    priority: number
    exactAddonName?: string
    addonNameRegex?: RegExp
}

type CompiledRules = {
    groups: Map<string, ContentPackGroup>
    rules: CompiledRule[]
    unmatched: ContentPackUnmatchedRule
}

type FileEntry = {
    fullPath: string
    addonName: string
    relativeInAddon: string
    outputGroup: ContentPackGroup
    priority: number
    size: number
}

type CollectState = {
    byNormalizedInnerPath: Map<string, FileEntry[]>
    scannedFiles: number
    candidateFiles: number
    skippedExplicitAddons: Set<string>
    skippedUnknownAddons: Set<string>
    packedUnmatchedAddons: Set<string>
}

type ContentSource = {
    rootDir: string
    label: string
    mode: 'addon-library' | 'loose-root'
    addonName?: string
}

const DEFAULT_HASH_CONCURRENCY = Math.max(1, os.cpus().length)
const LOOSE_CONTENT_MARKERS = new Set([
    'materials',
    'models',
    'sound',
    'particle',
    'particles',
    'lua',
    'resource',
    'scripts',
    'maps',
    'gamemodes',
    'cfg',
    'data',
])

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function asNonEmptyString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`Некорректное значение ${fieldName}: ожидается непустая строка`)
    }

    return value.trim()
}

function parseRulesData(parsed: unknown, sourceLabel: string): ContentPackRulesFile {
    if (!isObject(parsed)) {
        throw new Error(`${sourceLabel} должны содержать JSON-объект`)
    }

    const rawGroups = parsed.groups
    const rawRules = parsed.rules
    const rawUnmatched = parsed.unmatched

    if (!Array.isArray(rawGroups) || rawGroups.length === 0) {
        throw new Error(`${sourceLabel} должны содержать непустой массив "groups"`)
    }

    if (!Array.isArray(rawRules)) {
        throw new Error(`${sourceLabel} должны содержать массив "rules"`)
    }

    const groups = rawGroups.map((group, index) => {
        if (!isObject(group)) {
            throw new Error(`Группа #${index + 1} должна быть объектом`)
        }

        const displayName = typeof group.displayName === 'string' && group.displayName.trim() !== ''
            ? group.displayName.trim()
            : null

        return {
            id: asNonEmptyString(group.id, `groups[${index}].id`),
            folder: asNonEmptyString(group.folder, `groups[${index}].folder`),
            ...(displayName ? { displayName } : {}),
        } satisfies ContentPackGroup
    })

    const rules = rawRules.map((rule, index) => {
        if (!isObject(rule)) {
            throw new Error(`Правило #${index + 1} должно быть объектом`)
        }

        const match = rule.match
        if (!isObject(match)) {
            throw new Error(`rules[${index}].match должен быть объектом`)
        }

        const addonName = typeof match.addonName === 'string' && match.addonName.trim() !== ''
            ? match.addonName.trim()
            : undefined
        const addonNamePattern = typeof match.addonNamePattern === 'string' && match.addonNamePattern.trim() !== ''
            ? match.addonNamePattern.trim()
            : undefined

        if (!addonName && !addonNamePattern) {
            throw new Error(`rules[${index}].match должен задавать addonName или addonNamePattern`)
        }

        const action = rule.action === 'skip' ? 'skip' : 'pack'
        const groupId = typeof rule.groupId === 'string' && rule.groupId.trim() !== ''
            ? rule.groupId.trim()
            : undefined
        const priority = typeof rule.priority === 'number' && Number.isFinite(rule.priority)
            ? Math.trunc(rule.priority)
            : undefined
        const id = typeof rule.id === 'string' && rule.id.trim() !== '' ? rule.id.trim() : `rule-${index + 1}`

        const matchData = {
            ...(addonName ? { addonName } : {}),
            ...(addonNamePattern ? { addonNamePattern } : {}),
        } satisfies ContentPackRuleMatch

        return {
            id,
            match: matchData,
            action,
            ...(groupId ? { groupId } : {}),
            ...(priority !== undefined ? { priority } : {}),
        } satisfies ContentPackRule
    })

    let unmatched: ContentPackUnmatchedRule = { action: 'skip' }
    if (rawUnmatched !== undefined) {
        if (!isObject(rawUnmatched)) {
            throw new Error('"unmatched" должен быть объектом, если он указан')
        }

        if (rawUnmatched.action === 'pack') {
            const priority = typeof rawUnmatched.priority === 'number' && Number.isFinite(rawUnmatched.priority)
                ? Math.trunc(rawUnmatched.priority)
                : undefined

            unmatched = {
                action: 'pack',
                groupId: asNonEmptyString(rawUnmatched.groupId, 'unmatched.groupId'),
                ...(priority !== undefined ? { priority } : {}),
            }
        } else {
            unmatched = { action: 'skip' }
        }
    }

    return { groups, rules, unmatched }
}

function parseRulesFile(jsonText: string): ContentPackRulesFile {
    return parseRulesData(JSON.parse(jsonText) as unknown, 'Файл правил')
}

function compileRules(rulesFile: ContentPackRulesFile): CompiledRules {
    const groups = new Map<string, ContentPackGroup>()
    const folders = new Set<string>()

    for (const group of rulesFile.groups) {
        const key = group.id.toLowerCase()
        const folderKey = group.folder.toLowerCase()

        if (groups.has(key)) {
            throw new Error(`Дублирующийся id группы: ${group.id}`)
        }

        if (folders.has(folderKey)) {
            throw new Error(`Дублирующаяся папка группы: ${group.folder}`)
        }

        groups.set(key, group)
        folders.add(folderKey)
    }

    const compiledRules = rulesFile.rules.map((rule, index) => {
        const exactAddonName = rule.match.addonName?.toLowerCase()
        let addonNameRegex: RegExp | undefined

        if (rule.match.addonNamePattern) {
            try {
                addonNameRegex = new RegExp(rule.match.addonNamePattern, 'i')
            } catch (error) {
                const err = error as Error
                throw new Error(`Некорректная regex в rules[${index}].match.addonNamePattern: ${err.message}`)
            }
        }

        if (rule.action === 'pack') {
            if (!rule.groupId) {
                throw new Error(`rules[${index}] с действием "pack" должен задавать groupId`)
            }

            if (!groups.has(rule.groupId.toLowerCase())) {
                throw new Error(`rules[${index}] ссылается на неизвестный groupId: ${rule.groupId}`)
            }
        }

        return {
            id: rule.id ?? `rule-${index + 1}`,
            action: rule.action ?? 'pack',
            priority: rule.priority ?? 0,
            ...(rule.groupId ? { groupId: rule.groupId } : {}),
            ...(exactAddonName ? { exactAddonName } : {}),
            ...(addonNameRegex ? { addonNameRegex } : {}),
        } satisfies CompiledRule
    })

    if (rulesFile.unmatched?.action === 'pack' && !groups.has(rulesFile.unmatched.groupId.toLowerCase())) {
        throw new Error(`"unmatched" ссылается на неизвестный groupId: ${rulesFile.unmatched.groupId}`)
    }

    return {
        groups,
        rules: compiledRules,
        unmatched: rulesFile.unmatched ?? { action: 'skip' },
    }
}

function splitAddonAndInner(filePath: string, source: ContentSource): [string, string] | null {
    const relativePath = path.relative(source.rootDir, filePath)
    if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        return null
    }

    const pathParts = relativePath.split(path.sep).filter(Boolean)
    if (source.mode === 'loose-root') {
        if (pathParts.length < 1 || !source.addonName) {
            return null
        }

        return [source.addonName, pathParts.join('/')]
    }

    if (pathParts.length < 2) {
        return null
    }

    const addonName = pathParts[0]
    if (!addonName) {
        return null
    }

    return [addonName, pathParts.slice(1).join('/')]
}

function countPathDepth(relativePath: string): number {
    const matches = relativePath.match(/\//g)
    return matches ? matches.length : 0
}

function normalizeInnerPathKey(relativePath: string): string {
    return relativePath.replace(/\\/g, '/').toLowerCase()
}

function normalizeContentPackInputDirs(cfg: ContentPackConfig): string[] {
    const legacySingle = cfg.contentDir?.trim()
    const many = Array.isArray(cfg.contentDirs)
        ? cfg.contentDirs.map((dir) => String(dir).trim()).filter(Boolean)
        : []

    const deduped = new Set<string>()
    for (const dir of [...many, ...(legacySingle ? [legacySingle] : [])]) {
        deduped.add(path.resolve(dir))
    }

    return [...deduped]
}

async function resolveContentSources(inputDirs: string[]): Promise<ContentSource[]> {
    const sources: ContentSource[] = []

    for (const inputDir of inputDirs) {
        const rootDir = await fsp.realpath(path.resolve(inputDir))
        const entries = await fsp.readdir(rootDir, { withFileTypes: true })
        const childNames = new Set(entries.map((entry) => entry.name.toLowerCase()))
        const hasLooseMarkers = [...LOOSE_CONTENT_MARKERS].some((marker) => childNames.has(marker))

        if (hasLooseMarkers) {
            sources.push({
                rootDir,
                label: rootDir,
                mode: 'loose-root',
                addonName: path.basename(rootDir),
            })
            continue
        }

        sources.push({
            rootDir,
            label: rootDir,
            mode: 'addon-library',
        })
    }

    return sources
}

function betterCandidate(candidate: FileEntry, currentBest: FileEntry): boolean {
    if (candidate.priority !== currentBest.priority) {
        return candidate.priority > currentBest.priority
    }

    const candidateDepth = countPathDepth(candidate.relativeInAddon)
    const currentBestDepth = countPathDepth(currentBest.relativeInAddon)
    if (candidateDepth !== currentBestDepth) {
        return candidateDepth < currentBestDepth
    }

    if (candidate.size !== currentBest.size) {
        return candidate.size > currentBest.size
    }

    return candidate.addonName.localeCompare(currentBest.addonName, undefined, { sensitivity: 'base' }) < 0
}

async function hashFile(filePath: string): Promise<string> {
    const hash = createHash('sha1')
    await pipeline(fs.createReadStream(filePath), hash)
    return hash.digest('hex')
}

async function precomputeHashes(
    entriesToHash: FileEntry[],
    hashCache: Map<string, string>,
    concurrency: number,
): Promise<void> {
    const unique: string[] = []
    const seen = new Set<string>()
    for (const entry of entriesToHash) {
        if (seen.has(entry.fullPath) || hashCache.has(entry.fullPath)) continue
        seen.add(entry.fullPath)
        unique.push(entry.fullPath)
    }

    if (unique.length === 0) return

    let nextIndex = 0
    const worker = async () => {
        while (true) {
            const currentIndex = nextIndex
            nextIndex += 1
            if (currentIndex >= unique.length) return
            const filePath = unique[currentIndex]
            if (!filePath) continue
            hashCache.set(filePath, await hashFile(filePath))
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(concurrency, unique.length) }, () => worker()),
    )
}

function getEntryHash(entry: FileEntry, hashCache: Map<string, string>): string {
    const cached = hashCache.get(entry.fullPath)
    if (cached === undefined) {
        throw new Error(`Хеш не предрасчитан для: ${entry.fullPath}`)
    }
    return cached
}

function resolveAddonRule(
    addonName: string,
    compiledRules: CompiledRules,
): { type: 'pack'; group: ContentPackGroup; priority: number; viaUnmatched: boolean } | { type: 'skip'; explicit: boolean } {
    const normalizedAddonName = addonName.toLowerCase()

    for (const rule of compiledRules.rules) {
        const matchesExact = rule.exactAddonName ? rule.exactAddonName === normalizedAddonName : false
        const matchesPattern = rule.addonNameRegex ? rule.addonNameRegex.test(addonName) : false

        if (!matchesExact && !matchesPattern) {
            continue
        }

        if (rule.action === 'skip') {
            return { type: 'skip', explicit: true }
        }

        const group = compiledRules.groups.get((rule.groupId ?? '').toLowerCase())
        if (!group) {
            throw new Error(`Не найдена скомпилированная группа для аддона ${addonName}`)
        }

        return { type: 'pack', group, priority: rule.priority, viaUnmatched: false }
    }

    if (compiledRules.unmatched.action === 'pack') {
        const group = compiledRules.groups.get(compiledRules.unmatched.groupId.toLowerCase())
        if (!group) {
            throw new Error(`Не найдена fallback-группа для аддона ${addonName}`)
        }

        return {
            type: 'pack',
            group,
            priority: compiledRules.unmatched.priority ?? 0,
            viaUnmatched: true,
        }
    }

    return { type: 'skip', explicit: false }
}

async function fileEntryFromPath(
    filePath: string,
    source: ContentSource,
    compiledRules: CompiledRules,
    state: CollectState,
    emit: (event: RunEvent) => void,
): Promise<FileEntry | null> {
    const split = splitAddonAndInner(filePath, source)
    if (!split) return null

    const [addonName, relativeInAddon] = split
    if (!relativeInAddon) return null

    const resolution = resolveAddonRule(addonName, compiledRules)
    if (resolution.type === 'skip') {
        if (resolution.explicit) {
            state.skippedExplicitAddons.add(addonName)
        } else if (!state.skippedUnknownAddons.has(addonName)) {
            state.skippedUnknownAddons.add(addonName)
            emit({ type: 'warn', message: `Пропускаю аддон без совпавшего правила: ${addonName}` })
        }
        return null
    }

    if (resolution.viaUnmatched) {
        state.packedUnmatchedAddons.add(addonName)
    }

    const size = (await fsp.stat(filePath)).size
    return {
        fullPath: filePath,
        addonName,
        relativeInAddon,
        outputGroup: resolution.group,
        priority: resolution.priority,
        size,
    }
}

async function collectCandidates(
    dirPath: string,
    source: ContentSource,
    compiledRules: CompiledRules,
    state: CollectState,
    emit: (event: RunEvent) => void,
): Promise<void> {
    const entries = await fsp.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)

        if (entry.isDirectory()) {
            await collectCandidates(fullPath, source, compiledRules, state, emit)
            continue
        }

        if (!entry.isFile()) {
            continue
        }

        state.scannedFiles += 1
        const fileEntry = await fileEntryFromPath(fullPath, source, compiledRules, state, emit)
        if (!fileEntry) {
            continue
        }

        const normalizedInnerPath = normalizeInnerPathKey(fileEntry.relativeInAddon)
        const bucket = state.byNormalizedInnerPath.get(normalizedInnerPath) ?? []
        bucket.push(fileEntry)
        state.byNormalizedInnerPath.set(normalizedInnerPath, bucket)
        state.candidateFiles += 1
    }
}

type WinnerEntry = {
    innerPath: string
    best: FileEntry
}

async function copyOne(sourcePath: string, destinationPath: string): Promise<number> {
    await fsp.mkdir(path.dirname(destinationPath), { recursive: true })
    await fsp.copyFile(sourcePath, destinationPath)
    return (await fsp.stat(sourcePath)).size
}

export async function runContentPack(
    cfg: ContentPackConfig,
    emit: (event: RunEvent) => void,
): Promise<void> {
    const startedAt = Date.now()

    try {
        const contentDirInputs = normalizeContentPackInputDirs(cfg)
        const rulesPathInput = cfg.rulesPath?.trim() ?? ''
        const rulesConfigInput = cfg.rulesConfig
        const outputPathInput = cfg.outputPath.trim()

        if (contentDirInputs.length === 0) {
            emit({ type: 'error', stage: 'fatal', message: 'Не выбрана ни одна папка контента' })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }

        if (!rulesConfigInput && !rulesPathInput) {
            emit({ type: 'error', stage: 'fatal', message: 'Не заданы правила объединения контента' })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }

        if (!outputPathInput) {
            emit({ type: 'error', stage: 'fatal', message: 'Не выбрана выходная папка' })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }

        const resolvedContentDirInputs = contentDirInputs.map((dir) => path.resolve(dir))
        const resolvedOutputPath = path.resolve(outputPathInput)
        const resolvedRulesPath = !rulesConfigInput && rulesPathInput ? path.resolve(rulesPathInput) : null

        for (const resolvedContentDirInput of resolvedContentDirInputs) {
            if (!await pathExists(resolvedContentDirInput)) {
                emit({ type: 'error', stage: 'fatal', message: `Папка контента не существует: ${resolvedContentDirInput}` })
                emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
                return
            }
        }

        if (resolvedRulesPath && !await pathExists(resolvedRulesPath)) {
            emit({ type: 'error', stage: 'fatal', message: `Файл правил не существует: ${resolvedRulesPath}` })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }

        const resolvedContentSources = await resolveContentSources(resolvedContentDirInputs)
        const realOutputPath = await resolveRealPath(resolvedOutputPath)

        for (const source of resolvedContentSources) {
            if (isSameOrInside(source.rootDir, realOutputPath)) {
                emit({
                    type: 'error',
                    stage: 'fatal',
                    message: `Выходная папка не должна совпадать с папкой контента или быть вложенной в неё: ${resolvedOutputPath}`,
                })
                emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
                return
            }
        }

        const compiledRules = rulesConfigInput
            ? compileRules(parseRulesData(rulesConfigInput, 'Правила из интерфейса'))
            : compileRules(parseRulesFile(await fsp.readFile(resolvedRulesPath!, 'utf8')))

        emit({ type: 'info', message: 'Режим: content-pack' })
        emit({ type: 'info', message: `Папок контента: ${resolvedContentSources.length}` })
        for (const source of resolvedContentSources) {
            const sourceModeLabel = source.mode === 'loose-root'
                ? `loose-root; addon=${source.addonName ?? 'unknown'}`
                : 'addon-library'
            emit({ type: 'debug', tag: '[source]', message: `${source.label} (${sourceModeLabel})` })
        }
        emit({
            type: 'info',
            message: resolvedRulesPath
                ? `Файл правил: ${resolvedRulesPath}`
                : 'Правила: из интерфейса',
        })
        emit({ type: 'info', message: `Выход: ${resolvedOutputPath}` })
        emit({
            type: 'debug',
            tag: '[rules]',
            message: `групп=${compiledRules.groups.size}; правил=${compiledRules.rules.length}; unmatched=${compiledRules.unmatched.action}`,
        })

        if (cfg.cleanOutput) {
            emit({ type: 'info', message: `Очищаю выходную папку: ${resolvedOutputPath}` })
            const protectedPaths = resolvedContentSources.map((source) => ({
                path: source.rootDir,
                label: `папка контента: ${source.rootDir}`,
            }))
            if (resolvedRulesPath) {
                protectedPaths.push({ path: resolvedRulesPath, label: 'файл правил' })
            }
            await ensureCleanOutputDirectory(resolvedOutputPath, protectedPaths)
        } else {
            const created = await ensureOutputDirectory(resolvedOutputPath)
            emit({
                type: created ? 'info' : 'debug',
                ...(created
                    ? { message: `Создана выходная папка: ${resolvedOutputPath}` }
                    : { tag: '[output]', message: 'Очистка output отключена, существующие файлы будут сохранены' }),
            } as RunEvent)
        }

        emit({ type: 'scanning', message: 'Сканирую папку контента...' })

        const state: CollectState = {
            byNormalizedInnerPath: new Map(),
            scannedFiles: 0,
            candidateFiles: 0,
            skippedExplicitAddons: new Set(),
            skippedUnknownAddons: new Set(),
            packedUnmatchedAddons: new Set(),
        }

        for (const source of resolvedContentSources) {
            await collectCandidates(source.rootDir, source, compiledRules, state, emit)
        }

        emit({ type: 'info', message: `Просканировано файлов: ${state.scannedFiles}` })
        emit({ type: 'info', message: `Файлов-кандидатов: ${state.candidateFiles}` })
        emit({ type: 'scanned', total: state.byNormalizedInnerPath.size })

        const hashCache = new Map<string, string>()
        let copiedBytes = 0
        let copyErrors = 0
        let execErrors = 0

        let duplicateSameHashGroups = 0
        let duplicateSameHashExtraFiles = 0
        let duplicateSameHashExtraBytes = 0

        let conflictSamePathDiffHashGroups = 0
        let conflictSamePathDiffHashFiles = 0
        let conflictSamePathDiffHashBytes = 0

        const entriesNeedingHash: FileEntry[] = []
        for (const entries of state.byNormalizedInnerPath.values()) {
            if (entries.length > 1) {
                entriesNeedingHash.push(...entries)
            }
        }

        if (entriesNeedingHash.length > 0) {
            const hashConcurrency = Math.max(
                1,
                Number.isFinite(Number(process.env.HASH_CONCURRENCY))
                    ? Math.trunc(Number(process.env.HASH_CONCURRENCY))
                    : DEFAULT_HASH_CONCURRENCY,
            )
            emit({
                type: 'debug',
                tag: '[hash]',
                message: `Хеширую конфликтные файлы: ${entriesNeedingHash.length}, параллелизм=${hashConcurrency}`,
            })
            await precomputeHashes(entriesNeedingHash, hashCache, hashConcurrency)
        }

        // Проход 1: выбор победителей + статистика конфликтов
        const winners: WinnerEntry[] = []

        for (const entries of state.byNormalizedInnerPath.values()) {
            if (entries.length === 0) continue

            const firstEntry = entries[0]
            if (!firstEntry) continue

            let best = firstEntry
            for (const entry of entries.slice(1)) {
                if (betterCandidate(entry, best)) {
                    best = entry
                }
            }

            if (entries.length > 1) {
                const hashes = new Set<string>()
                for (const entry of entries) {
                    hashes.add(getEntryHash(entry, hashCache))
                }

                const losersBytes = entries
                    .filter(entry => entry.fullPath !== best.fullPath)
                    .reduce((sum, entry) => sum + entry.size, 0)

                if (hashes.size === 1) {
                    duplicateSameHashGroups += 1
                    duplicateSameHashExtraFiles += entries.length - 1
                    duplicateSameHashExtraBytes += losersBytes
                } else {
                    conflictSamePathDiffHashGroups += 1
                    conflictSamePathDiffHashFiles += entries.length - 1
                    conflictSamePathDiffHashBytes += losersBytes
                }
            }

            winners.push({ innerPath: best.relativeInAddon, best })
        }

        // Проход 2: копирование
        const total = winners.length
        let processed = 0

        for (const { innerPath, best } of winners) {
            const destinationPath = path.join(resolvedOutputPath, best.outputGroup.folder, ...innerPath.split('/'))

            try {
                copiedBytes += await copyOne(best.fullPath, destinationPath)
            } catch (error) {
                copyErrors += 1
                const err = error as NodeJS.ErrnoException
                emit({
                    type: 'error',
                    stage: 'copy',
                    file: best.fullPath,
                    message: `${err.code ?? ''} ${err.message ?? err}`.trim(),
                })
            }

            processed += 1
            emit({ type: 'progress', processed, total, file: best.fullPath })
        }

        emit({ type: 'info', message: `Сохранено файлов: ${processed}` })
        emit({ type: 'info', message: `Скопированный размер: ${formatBytes(copiedBytes)} (${copiedBytes} bytes)` })
        emit({
            type: 'info',
            message: `Одинаковый путь + одинаковый hash: групп=${duplicateSameHashGroups}, лишних файлов=${duplicateSameHashExtraFiles}, лишний размер=${formatBytes(duplicateSameHashExtraBytes)}`,
        })
        emit({
            type: 'info',
            message: `Одинаковый путь + разный hash: групп=${conflictSamePathDiffHashGroups}, лишних файлов=${conflictSamePathDiffHashFiles}, лишний размер=${formatBytes(conflictSamePathDiffHashBytes)}`,
        })

        if (state.skippedExplicitAddons.size > 0) {
            emit({
                type: 'info',
                message: `Явно пропущенных аддонов: ${state.skippedExplicitAddons.size}`,
            })
        }

        if (state.skippedUnknownAddons.size > 0) {
            emit({
                type: 'warn',
                message: `Пропущено аддонов без совпавшего правила: ${state.skippedUnknownAddons.size}`,
            })
        }

        if (state.packedUnmatchedAddons.size > 0) {
            emit({
                type: 'info',
                message: `Упаковано аддонов через fallback-правило: ${state.packedUnmatchedAddons.size}`,
            })
        }

        const postProcessResult = await runOptionalPostProcess(resolvedOutputPath, cfg, emit)
        execErrors += postProcessResult.execErrors
        copyErrors += postProcessResult.copyErrors

        const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1)
        emit({
            type: 'info',
            message: `Итог: обработано=${processed}, ошибок exec=${execErrors}, ошибок copy=${copyErrors}, время=${elapsedSeconds}с`,
        })
        emit({ type: 'done', processed, execErrors, copyErrors })
    } catch (error) {
        const err = error as Error
        emit({ type: 'error', stage: 'fatal', message: err.message ?? String(error) })
        emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
    }
}
