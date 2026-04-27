import path from 'path'
import fsp from 'fs/promises'
import {
    DEFAULT_CONTENT_PACK_OUTPUT_DIR,
    DEFAULT_CONTENT_SPLIT_OUTPUT_DIR,
    ensureOutputDirectory,
    formatBytes,
    isSameOrInside,
    pathExists,
    resolveRealPath,
    type RunEvent,
} from './shared.js'

export const DEFAULT_SPLIT_LIMIT_BYTES = 2 * 1024 * 1024 * 1024
export const DEFAULT_CONTENT_SPLIT_INPUT_PATH = DEFAULT_CONTENT_PACK_OUTPUT_DIR
export const DEFAULT_CONTENT_SPLIT_OUTPUT_PATH = DEFAULT_CONTENT_SPLIT_OUTPUT_DIR

export type ContentSplitConfig = {
    splitInputPath: string
    outputPath: string
    splitLimitBytes: number
    cleanSourceGroups: boolean
}

type SplitFileEntry = {
    groupFolder: string
    innerPath: string
    fullPath: string
    size: number
}

function getSplitKey(innerPath: string): string {
    const firstSlash = innerPath.indexOf('/')
    if (firstSlash === -1) return ''
    const secondSlash = innerPath.indexOf('/', firstSlash + 1)
    if (secondSlash === -1) return innerPath.slice(0, firstSlash)
    return innerPath.slice(0, secondSlash)
}

function assignParts(
    files: SplitFileEntry[],
    limitBytes: number,
): Map<string, number> {
    const keySizes = new Map<string, number>()

    for (const file of files) {
        const key = getSplitKey(file.innerPath)
        keySizes.set(key, (keySizes.get(key) ?? 0) + file.size)
    }

    const sortedKeys = [...keySizes.keys()].sort(
        (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }),
    )

    const partMap = new Map<string, number>()
    let currentPart = 0
    let currentPartBytes = 0

    for (const key of sortedKeys) {
        const keyBytes = keySizes.get(key) ?? 0

        if (limitBytes > 0 && currentPartBytes > 0 && currentPartBytes + keyBytes > limitBytes) {
            currentPart++
            currentPartBytes = 0
        }

        partMap.set(key, currentPart)
        currentPartBytes += keyBytes
    }

    return partMap
}

async function scanGroupFolder(groupFolderPath: string, groupFolder: string): Promise<SplitFileEntry[]> {
    const entries: SplitFileEntry[] = []
    const stack: string[] = [groupFolderPath]

    while (stack.length > 0) {
        const dirPath = stack.pop()!
        const dirEntries = await fsp.readdir(dirPath, { withFileTypes: true })

        for (const entry of dirEntries) {
            const fullPath = path.join(dirPath, entry.name)

            if (entry.isDirectory()) {
                stack.push(fullPath)
                continue
            }

            if (!entry.isFile()) continue

            const innerPath = path.relative(groupFolderPath, fullPath).replace(/\\/g, '/')
            const size = (await fsp.stat(fullPath)).size
            entries.push({ groupFolder, innerPath, fullPath, size })
        }
    }

    return entries
}

export async function runContentSplit(
    cfg: ContentSplitConfig,
    emit: (e: RunEvent) => void,
): Promise<void> {
    const startedAt = Date.now()

    try {
        const splitInputPathInput = cfg.splitInputPath.trim()
        const outputPathInput = cfg.outputPath.trim()

        if (!splitInputPathInput) {
            emit({ type: 'error', stage: 'fatal', message: 'Не выбрана папка для деления' })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }

        if (!outputPathInput) {
            emit({ type: 'error', stage: 'fatal', message: 'Не выбрана выходная папка' })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }

        if (cfg.splitLimitBytes <= 0) {
            emit({ type: 'error', stage: 'fatal', message: 'Лимит размера должен быть больше 0' })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }

        const resolvedSplitInputPath = path.resolve(splitInputPathInput)
        const resolvedOutputPath = path.resolve(outputPathInput)

        if (!await pathExists(resolvedSplitInputPath)) {
            emit({ type: 'error', stage: 'fatal', message: `Папка для деления не существует: ${resolvedSplitInputPath}` })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }

        const realSplitInputPath = await fsp.realpath(resolvedSplitInputPath)
        const realOutputPath = await resolveRealPath(resolvedOutputPath)

        const inPlace = realSplitInputPath.toLowerCase() === realOutputPath.toLowerCase()

        emit({ type: 'info', message: 'Режим: content-split' })
        emit({ type: 'info', message: `Папка для деления: ${realSplitInputPath}` })
        emit({ type: 'info', message: `Выход: ${realOutputPath}${inPlace ? ' (на месте)' : ''}` })
        emit({ type: 'info', message: `Лимит на часть: ${formatBytes(cfg.splitLimitBytes)}` })
        emit({
            type: 'debug',
            tag: '[cfg]',
            message: `cleanSourceGroups=${cfg.cleanSourceGroups}; inPlace=${inPlace}`,
        })

        await ensureOutputDirectory(realOutputPath)

        emit({ type: 'scanning', message: 'Сканирую папку для деления...' })

        const topLevelEntries = await fsp.readdir(realSplitInputPath, { withFileTypes: true })
        const groupFolders = topLevelEntries
            .filter(e => e.isDirectory() && !/_part\d+$/i.test(e.name))
            .map(e => e.name)
            .sort()

        if (groupFolders.length === 0) {
            emit({ type: 'warn', message: 'Не найдено папок групп для деления' })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }

        emit({ type: 'debug', tag: '[scan]', message: `Групп найдено: ${groupFolders.length}: ${groupFolders.join(', ')}` })

        const allFiles: SplitFileEntry[] = []
        for (const groupFolder of groupFolders) {
            const groupFolderPath = path.join(realSplitInputPath, groupFolder)
            const files = await scanGroupFolder(groupFolderPath, groupFolder)
            allFiles.push(...files)
            emit({ type: 'debug', tag: '[scan]', message: `${groupFolder}: ${files.length} файлов` })
        }

        emit({ type: 'info', message: `Просканировано файлов: ${allFiles.length}` })
        emit({ type: 'scanned', total: allFiles.length })

        const groupPartMaps = new Map<string, Map<string, number>>()

        for (const groupFolder of groupFolders) {
            const groupFiles = allFiles.filter(f => f.groupFolder === groupFolder)
            if (groupFiles.length === 0) continue

            const partMap = assignParts(groupFiles, cfg.splitLimitBytes)
            groupPartMaps.set(groupFolder, partMap)

            const partCount = partMap.size > 0 ? Math.max(...partMap.values()) + 1 : 1
            const partSizes = new Array<number>(partCount).fill(0)

            for (const file of groupFiles) {
                const key = getSplitKey(file.innerPath)
                const partIndex = partMap.get(key) ?? 0
                partSizes[partIndex] = (partSizes[partIndex] ?? 0) + file.size
            }

            const partDetails = partSizes.map((bytes, i) => `часть ${i + 1}: ${formatBytes(bytes)}`).join(', ')
            emit({
                type: 'info',
                message: `Группа "${groupFolder}": ${partCount} ${partCount === 1 ? 'часть' : 'части/частей'} — ${partDetails}`,
            })
        }

        let processed = 0
        let copyErrors = 0
        const total = allFiles.length

        for (const file of allFiles) {
            const partMap = groupPartMaps.get(file.groupFolder)
            const key = getSplitKey(file.innerPath)
            const partIndex = partMap?.get(key) ?? 0
            const partFolderName = `${file.groupFolder}_part${partIndex + 1}`
            const destinationPath = path.join(realOutputPath, partFolderName, ...file.innerPath.split('/'))

            try {
                await fsp.mkdir(path.dirname(destinationPath), { recursive: true })
                await fsp.copyFile(file.fullPath, destinationPath)
            } catch (error) {
                copyErrors += 1
                const err = error as NodeJS.ErrnoException
                emit({
                    type: 'error',
                    stage: 'copy',
                    file: file.fullPath,
                    message: `${err.code ?? ''} ${err.message ?? err}`.trim(),
                })
            }

            processed += 1
            emit({ type: 'progress', processed, total, file: file.fullPath })
        }

        if (cfg.cleanSourceGroups && copyErrors === 0) {
            for (const groupFolder of groupFolders) {
                const groupFolderPath = path.join(realSplitInputPath, groupFolder)

                if (isSameOrInside(groupFolderPath, realOutputPath)) {
                    emit({
                        type: 'warn',
                        message: `Пропускаю удаление "${groupFolder}": выходная папка находится внутри`,
                    })
                    continue
                }

                try {
                    await fsp.rm(groupFolderPath, { recursive: true, force: true })
                    emit({ type: 'debug', tag: '[clean]', message: `Удалена исходная папка: ${groupFolder}` })
                } catch (error) {
                    const err = error as Error
                    emit({
                        type: 'warn',
                        message: `Не удалось удалить исходную папку "${groupFolder}": ${err.message}`,
                    })
                }
            }
        }

        const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1)
        emit({
            type: 'info',
            message: `Итог: обработано=${processed}, ошибок copy=${copyErrors}, время=${elapsedSeconds}с`,
        })
        emit({ type: 'done', processed, execErrors: 0, copyErrors })
    } catch (error) {
        const err = error as Error
        emit({ type: 'error', stage: 'fatal', message: err.message ?? String(error) })
        emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
    }
}
