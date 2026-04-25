import path from 'path'
import fsp from 'fs/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { fileURLToPath } from 'url'
import vmfparserModule from 'vmfparser'

const parser = vmfparserModule.default
const execFileAsync = promisify(execFile)

export const DEFAULT_EXTS = ['vmt', 'vtf', 'mp3', 'wav', 'ogg', 'mdl', 'spr']
export const DEFAULT_CONTENT_KEYS = ['RopeMaterial', 'model', 'texture', 'material']
export const DEFAULT_GMOD_PATH = 'F:/steam/steamapps/common/GarrysMod/garrysmod'
export const DEFAULT_CONTENT_ROOTS = [DEFAULT_GMOD_PATH]
export const DEFAULT_VMF_PATH = path.resolve('maps/shabonka_1_final_optimize.vmf')
export const DEFAULT_OUTPUT_PATH = path.resolve('output/')

export type RunConfig = {
    contentRoots: string[]
    vmfPath: string
    outputPath: string
    cleanOutput: boolean
    exts: string[]
    contentKeys: string[]
}

export type RunEvent =
    | { type: 'info'; message: string }
    | { type: 'debug'; tag: string; message: string }
    | { type: 'scanning' }
    | { type: 'scanned'; total: number }
    | { type: 'progress'; processed: number; total: number; file: string }
    | { type: 'warn'; message: string }
    | { type: 'error'; stage: 'exec' | 'copy' | 'fatal'; file?: string; message: string }
    | { type: 'done'; processed: number; execErrors: number; copyErrors: number }

type SearchLocation = {
    searchPath: string
    rootPath: string
}

type ResolvedAsset = {
    absPath: string
    rootPath: string
}

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_ASSET_TRACER_ENV = 'SOURCE_ASSET_TRACER_PATH'
const SOURCE_ASSET_TRACER_FILENAME = 'source_asset_tracer.exe'
const DEV_SOURCE_ASSET_TRACER_PATH = 'E:\\prog\\rust\\source-asset-tracer\\source_asset_tracer\\target\\debug\\source_asset_tracer.exe'

function getSourceAssetTracerCandidates(): string[] {
    return [
        path.join(PROJECT_ROOT, 'bin', SOURCE_ASSET_TRACER_FILENAME),
        DEV_SOURCE_ASSET_TRACER_PATH,
    ]
}

async function resolveSourceAssetTracerPath(): Promise<string> {
    const envPath = process.env[SOURCE_ASSET_TRACER_ENV]?.trim().replace(/^["']|["']$/g, '')

    if (envPath) {
        const resolvedEnvPath = path.resolve(envPath)
        if (!await fspExists(resolvedEnvPath)) {
            throw new Error(`${SOURCE_ASSET_TRACER_ENV} points to a missing file: ${resolvedEnvPath}`)
        }
        return resolvedEnvPath
    }

    for (const candidate of getSourceAssetTracerCandidates()) {
        const resolvedCandidate = path.resolve(candidate)
        if (await fspExists(resolvedCandidate)) {
            return resolvedCandidate
        }
    }

    throw new Error(
        `Missing ${SOURCE_ASSET_TRACER_FILENAME}. Checked: ${getSourceAssetTracerCandidates().map(p => path.resolve(p)).join('; ')}`,
    )
}

async function fspExists(filePath: string): Promise<boolean> {
    try {
        await fsp.access(filePath)
        return true
    } catch {
        return false
    }
}

function normalizeRelativeAssetPath(filePath: string): string {
    return filePath
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/[\\/]+/g, path.sep)
        .replace(/^[\\/]+/, '')
}

function escapeRegexPart(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeContentRoots(contentRoots: string[]): string[] {
    const deduped = new Set<string>()

    for (const contentRoot of contentRoots) {
        const trimmed = contentRoot.trim()
        if (!trimmed) continue
        deduped.add(path.resolve(trimmed))
    }

    return [...deduped]
}

function isSameOrInside(parentPath: string, childPath: string): boolean {
    const relativePath = path.relative(
        path.resolve(parentPath).toLowerCase(),
        path.resolve(childPath).toLowerCase(),
    )
    return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
}

function getUnsafeOutputReason(outputPath: string, contentRoots: string[], vmfPath: string): string | null {
    const resolvedOutputPath = path.resolve(outputPath)
    const parsedOutputPath = path.parse(resolvedOutputPath)

    if (resolvedOutputPath === parsedOutputPath.root) {
        return `Нельзя очищать корень диска: ${resolvedOutputPath}`
    }

    const resolvedVmfPath = path.resolve(vmfPath)
    if (isSameOrInside(resolvedOutputPath, resolvedVmfPath)) {
        return `Output папка содержит VMF файл, очистка небезопасна: ${resolvedOutputPath}`
    }

    for (const contentRoot of contentRoots) {
        const resolvedContentRoot = path.resolve(contentRoot)
        if (isSameOrInside(resolvedOutputPath, resolvedContentRoot)) {
            return `Output папка содержит папку контента, очистка небезопасна: ${resolvedOutputPath}`
        }
    }

    return null
}

async function ensureCleanOutputDirectory(
    outputPath: string,
    contentRoots: string[],
    vmfPath: string,
): Promise<void> {
    const resolvedOutputPath = path.resolve(outputPath)
    const unsafeReason = getUnsafeOutputReason(resolvedOutputPath, contentRoots, vmfPath)

    if (unsafeReason) {
        throw new Error(unsafeReason)
    }

    try {
        const stat = await fsp.stat(resolvedOutputPath)
        if (!stat.isDirectory()) {
            throw new Error(`outputPath указывает не на папку: ${resolvedOutputPath}`)
        }
    } catch (error) {
        const err = error as NodeJS.ErrnoException
        if (err.code !== 'ENOENT') throw error
    }

    await fsp.rm(resolvedOutputPath, { recursive: true, force: true })
    await fsp.mkdir(resolvedOutputPath, { recursive: true })
}

async function ensureOutputDirectory(outputPath: string): Promise<boolean> {
    const resolvedOutputPath = path.resolve(outputPath)

    try {
        const stat = await fsp.stat(resolvedOutputPath)
        if (!stat.isDirectory()) {
            throw new Error(`outputPath указывает не на папку: ${resolvedOutputPath}`)
        }
        return false
    } catch (error) {
        const err = error as NodeJS.ErrnoException
        if (err.code !== 'ENOENT') throw error
    }

    await fsp.mkdir(resolvedOutputPath, { recursive: true })
    return true
}

function buildExtsFindPaths(contentRoots: string[], exts: string[]): Record<string, SearchLocation[]> {
    const all = new Map<string, SearchLocation[]>()

    for (const contentRoot of contentRoots) {
        const matsPath = path.join(contentRoot, 'materials')
        const particlePath = path.join(contentRoot, 'particle')
        const particlesPath = path.join(contentRoot, 'particles')
        const soundPath = path.join(contentRoot, 'sound')

        const locations: Record<string, SearchLocation[]> = {
            vmt: [
                { searchPath: matsPath, rootPath: contentRoot },
                { searchPath: particlePath, rootPath: contentRoot },
            ],
            vtf: [
                { searchPath: matsPath, rootPath: contentRoot },
                { searchPath: particlePath, rootPath: contentRoot },
            ],
            mp3: [{ searchPath: soundPath, rootPath: contentRoot }],
            wav: [{ searchPath: soundPath, rootPath: contentRoot }],
            ogg: [{ searchPath: soundPath, rootPath: contentRoot }],
            mdl: [{ searchPath: contentRoot, rootPath: contentRoot }],
            spr: [
                { searchPath: particlePath, rootPath: contentRoot },
                { searchPath: particlesPath, rootPath: contentRoot },
            ],
        }

        for (const [ext, searchLocations] of Object.entries(locations)) {
            const existing = all.get(ext) ?? []
            existing.push(...searchLocations)
            all.set(ext, existing)
        }
    }

    const result: Record<string, SearchLocation[]> = {}
    for (const ext of exts) {
        const lower = ext.toLowerCase()
        if (all.has(lower)) result[lower] = all.get(lower)!
    }

    return result
}

function addResolvedAsset(list: Map<string, ResolvedAsset>, absPath: string, rootPath: string) {
    if (!list.has(absPath)) {
        list.set(absPath, { absPath, rootPath })
    }
}

function buildAssetPathCandidates(filePath: string, extname: string): string[] {
    const candidates = [filePath]
    const prefixesByExt: Record<string, string[]> = {
        vmt: ['materials'],
        vtf: ['materials'],
        mp3: ['sound'],
        wav: ['sound'],
        ogg: ['sound'],
        spr: ['particle', 'particles'],
    }

    const lowerPath = filePath.toLowerCase()
    for (const prefix of prefixesByExt[extname] ?? []) {
        const normalizedPrefix = prefix + path.sep
        if (lowerPath.startsWith(normalizedPrefix)) {
            candidates.push(filePath.slice(normalizedPrefix.length))
        }
    }

    return [...new Set(candidates)]
}

async function tryAddFileToList(
    list: Map<string, ResolvedAsset>,
    filePath: string,
    extsFindPaths: Record<string, SearchLocation[]>,
) {
    const normalizedPath = normalizeRelativeAssetPath(filePath)
    const extname = path.extname(normalizedPath).slice(1).toLowerCase()
    const findPaths = extsFindPaths[extname]

    if (!findPaths || path.isAbsolute(normalizedPath)) return

    const pathCandidates = buildAssetPathCandidates(normalizedPath, extname)

    for (const findPath of findPaths) {
        for (const pathCandidate of pathCandidates) {
            const absPath = path.resolve(findPath.searchPath, pathCandidate)
            if (!isSameOrInside(findPath.searchPath, absPath)) continue

            if (await fspExists(absPath)) {
                addResolvedAsset(list, absPath, findPath.rootPath)
                return
            }
        }
    }
}

async function checkAndAddFile(
    list: Map<string, ResolvedAsset>,
    filePath: string,
    extsFindPaths: Record<string, SearchLocation[]>,
) {
    if (path.extname(filePath)) {
        await tryAddFileToList(list, filePath, extsFindPaths)
    } else {
        await tryAddFileToList(list, `${filePath}.vmt`, extsFindPaths)
        await tryAddFileToList(list, `${filePath}.vtf`, extsFindPaths)
    }
}

async function scanData(
    data: object,
    extsRegex: RegExp,
    contentKeys: string[],
    extsFindPaths: Record<string, SearchLocation[]>,
    list: Map<string, ResolvedAsset>,
): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
        if (typeof value !== 'string') continue

        if (extsRegex.test(value) || contentKeys.includes(key)) {
            await checkAndAddFile(list, value, extsFindPaths)

            const cleanedPath = value.toLowerCase().trim().split(/\s+/)[0]
            if (cleanedPath && cleanedPath !== value) {
                await checkAndAddFile(list, cleanedPath, extsFindPaths)
            }
        }
    }
}

async function getVmfFileList(
    ents: any[],
    worldData: any,
    extsRegex: RegExp,
    contentKeys: string[],
    extsFindPaths: Record<string, SearchLocation[]>,
): Promise<ResolvedAsset[]> {
    const list = new Map<string, ResolvedAsset>()

    if (worldData.detailmaterial) {
        await tryAddFileToList(list, `${String(worldData.detailmaterial).toLowerCase()}.vmt`, extsFindPaths)
    }

    await scanData(worldData, extsRegex, contentKeys, extsFindPaths, list)

    const worldSolids = worldData.solid
        ? (Array.isArray(worldData.solid) ? worldData.solid : [worldData.solid])
        : []

    for (const solid of worldSolids) {
        await scanData(solid, extsRegex, contentKeys, extsFindPaths, list)

        const sides = solid.side
            ? (Array.isArray(solid.side) ? solid.side : [solid.side])
            : []

        for (const side of sides) {
            await scanData(side, extsRegex, contentKeys, extsFindPaths, list)
        }
    }

    for (const data of ents) {
        if (!data) continue

        await scanData(data, extsRegex, contentKeys, extsFindPaths, list)

        const solids = data.solid
            ? (Array.isArray(data.solid) ? data.solid : [data.solid])
            : []

        for (const solid of solids) {
            await scanData(solid, extsRegex, contentKeys, extsFindPaths, list)

            const sides = solid.side
                ? (Array.isArray(solid.side) ? solid.side : [solid.side])
                : []

            for (const side of sides) {
                await scanData(side, extsRegex, contentKeys, extsFindPaths, list)
            }
        }
    }

    return [...list.values()]
}

export async function runFindContent(
    cfg: RunConfig,
    emit: (e: RunEvent) => void,
): Promise<void> {
    const startedAt = Date.now()

    try {
        const contentRoots = normalizeContentRoots(cfg.contentRoots)

        if (contentRoots.length === 0) {
            emit({ type: 'error', stage: 'fatal', message: 'Не выбрана ни одна папка контента' })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }

        const missingRoots: string[] = []
        for (const contentRoot of contentRoots) {
            if (!await fspExists(contentRoot)) {
                missingRoots.push(contentRoot)
            }
        }

        if (missingRoots.length > 0) {
            emit({
                type: 'error',
                stage: 'fatal',
                message: `Папки контента не существуют: ${missingRoots.join('; ')}`,
            })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }

        if (!await fspExists(cfg.vmfPath)) {
            emit({ type: 'error', stage: 'fatal', message: `vmf_path не существует: ${cfg.vmfPath}` })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }

        emit({ type: 'info', message: `VMF: ${path.resolve(cfg.vmfPath)}` })
        emit({ type: 'info', message: `Output: ${path.resolve(cfg.outputPath)}` })
        emit({ type: 'info', message: `Content roots (${contentRoots.length}): ${contentRoots.join('; ')}` })
        emit({ type: 'debug', tag: '[cfg]', message: `cleanOutput=${cfg.cleanOutput}; exts=${cfg.exts.join(', ')}; keys=${cfg.contentKeys.join(', ')}` })

        if (cfg.cleanOutput) {
            emit({ type: 'info', message: `Очищаю output папку: ${path.resolve(cfg.outputPath)}` })
            await ensureCleanOutputDirectory(cfg.outputPath, contentRoots, cfg.vmfPath)
        } else {
            const outputWasCreated = await ensureOutputDirectory(cfg.outputPath)
            if (outputWasCreated) {
                emit({ type: 'info', message: `Создаю output папку: ${path.resolve(cfg.outputPath)}` })
            } else {
                emit({ type: 'debug', tag: '[output]', message: 'Очистка output отключена, существующие файлы будут сохранены' })
            }
        }

        emit({ type: 'scanning' })

        const extsLower = cfg.exts.map(e => e.toLowerCase().replace(/^\./, '')).filter(Boolean)
        if (extsLower.length === 0) {
            emit({ type: 'error', stage: 'fatal', message: 'Не выбрано ни одного расширения для поиска' })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }

        const extsRegex = new RegExp(`\\.(${extsLower.map(escapeRegexPart).join('|')})$`, 'i')
        const extsFindPaths = buildExtsFindPaths(contentRoots, extsLower)

        const vmfText = await fsp.readFile(cfg.vmfPath, { encoding: 'utf-8' })
        emit({ type: 'debug', tag: '[vmf]', message: `Прочитано ${(Buffer.byteLength(vmfText, 'utf-8') / 1024 / 1024).toFixed(2)} MB` })

        const { entity, world } = parser(vmfText)
        const ents = entity ? (Array.isArray(entity) ? entity : [entity]) : []
        const worldData = world ?? {}
        const entityCount = ents.length
        const solidCount = worldData.solid ? (Array.isArray(worldData.solid) ? worldData.solid.length : 1) : 0
        emit({ type: 'debug', tag: '[vmf]', message: `Сущностей: ${entityCount}; world solids: ${solidCount}` })

        const fileList = await getVmfFileList(ents, worldData, extsRegex, cfg.contentKeys, extsFindPaths)
        const total = fileList.length

        emit({ type: 'scanned', total })
        emit({ type: 'debug', tag: '[scan]', message: `Уникальных найденных ассетов: ${total}` })

        if (total === 0) {
            emit({
                type: 'warn',
                message: `Список файлов пуст. Проверь папки контента: ${contentRoots.join('; ')}`,
            })
        }

        const needsExternalFinder = fileList.some(asset => {
            const extname = path.extname(asset.absPath).toLowerCase()
            return extname === '.mdl' || extname === '.vmt'
        })
        const sourceAssetTracerPath = needsExternalFinder
            ? await resolveSourceAssetTracerPath()
            : null

        if (sourceAssetTracerPath) {
            emit({ type: 'debug', tag: '[exec]', message: `source_asset_tracer=${sourceAssetTracerPath}` })
        }

        let processed = 0
        let execErrors = 0
        let copyErrors = 0
        let execProcessed = 0
        let copyProcessed = 0

        for (const asset of fileList) {
            const extname = path.extname(asset.absPath).toLowerCase()

            if (extname === '.mdl' || extname === '.vmt') {
                try {
                    emit({ type: 'debug', tag: '[exec]', message: `${path.relative(asset.rootPath, asset.absPath)} | root=${asset.rootPath}` })
                    await execFileAsync(
                        sourceAssetTracerPath!,
                        [asset.absPath, asset.rootPath, cfg.outputPath],
                        { maxBuffer: 10 * 1024 * 1024 },
                    )
                    execProcessed++
                } catch (error) {
                    execErrors++
                    const err = error as { message?: string; code?: number; stderr?: string }
                    const parts: string[] = []
                    if (err.code !== undefined) parts.push(`exit=${err.code}`)
                    if (err.stderr) parts.push(`stderr: ${err.stderr.trim()}`)
                    if (err.message) parts.push(err.message)

                    emit({
                        type: 'error',
                        stage: 'exec',
                        file: asset.absPath,
                        message: parts.join(' | ') || 'unknown error',
                    })
                }
            } else {
                try {
                    const relativePath = path.relative(asset.rootPath, asset.absPath)
                    const outputFilePath = path.join(cfg.outputPath, relativePath)
                    const outputDir = path.dirname(outputFilePath)

                    await fsp.mkdir(outputDir, { recursive: true })

                    if (await fspExists(asset.absPath)) {
                        await fsp.copyFile(asset.absPath, outputFilePath)
                        copyProcessed++
                        emit({ type: 'debug', tag: '[copy]', message: `${relativePath} -> ${outputFilePath}` })
                    }
                } catch (error) {
                    copyErrors++
                    const err = error as NodeJS.ErrnoException
                    emit({
                        type: 'error',
                        stage: 'copy',
                        file: asset.absPath,
                        message: `${err.code ?? ''} ${err.message ?? err}`.trim(),
                    })
                }
            }

            processed++
            emit({ type: 'progress', processed, total, file: asset.absPath })
        }

        const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1)
        emit({
            type: 'info',
            message: `Итог: найдено=${total}, exec=${execProcessed}, copy=${copyProcessed}, execErrors=${execErrors}, copyErrors=${copyErrors}, время=${elapsedSeconds}s`,
        })
        emit({ type: 'done', processed, execErrors, copyErrors })
    } catch (error) {
        const err = error as Error
        emit({ type: 'error', stage: 'fatal', message: err.message ?? String(error) })
        emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
    }
}
