import fs from 'fs'
import os from 'os'
import path from 'path'
import fsp from 'fs/promises'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { formatBytes, pathExists, type RunEvent } from './shared.js'

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const AUDIO_EXTENSIONS = new Set(['.wav', '.mp3', '.ogg'])
const AUDIO_ENCODE_PARAMS: Record<string, string[]> = {
    '.wav': ['-c:a', 'adpcm_ms'],
    '.mp3': ['-c:a', 'libmp3lame', '-b:a', '96k'],
    '.ogg': ['-c:a', 'libvorbis', '-q:a', '3'],
}

const DEFAULT_VTF_FORMAT = 'dxt1'
const DEFAULT_VTF_ALPHA_FORMAT = 'dxt5'
const DEFAULT_VTF_MAX_WIDTH = 1024
const DEFAULT_VTF_MAX_HEIGHT = 1024
const DEFAULT_SOUND_TIMEOUT_MS = 60_000
const DEFAULT_VTF_TIMEOUT_MS = 120_000
const DEFAULT_SOUND_CONCURRENCY = Math.max(1, os.cpus().length)
const DEFAULT_VTF_CONCURRENCY = Math.max(1, os.cpus().length)

function readConcurrencyEnv(envName: string, fallback: number): number {
    const raw = process.env[envName]
    if (raw === undefined) return fallback
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return fallback
    return Math.max(1, Math.trunc(parsed))
}

async function runWorkerPool<T>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
    if (items.length === 0) return

    let nextIndex = 0
    const lanes = Math.min(Math.max(1, concurrency), items.length)

    const lane = async () => {
        while (true) {
            const currentIndex = nextIndex
            nextIndex += 1
            if (currentIndex >= items.length) return
            const item = items[currentIndex]
            if (item === undefined) continue
            await worker(item, currentIndex)
        }
    }

    await Promise.all(Array.from({ length: lanes }, () => lane()))
}

export type PostProcessConfig = {
    compressSounds: boolean
    compressVtf: boolean
    ffmpegPath?: string
    vtfCmdPath?: string
}

type ProcessSummary = {
    processed: number
    skipped: number
    execErrors: number
    copyErrors: number
    originalBytes: number
    finalBytes: number
}

type SpawnResult = {
    ok: boolean
    stdout: string
    stderr: string
    timedOut: boolean
}

function trimOptionalPath(value: string | undefined): string | null {
    if (!value) return null

    const trimmed = value.trim()
    return trimmed ? trimmed : null
}

async function resolveExecutable(
    configuredPath: string | undefined,
    envKeys: string[],
    fileCandidates: string[],
    commandCandidates: string[],
): Promise<string> {
    const directCandidates = [
        trimOptionalPath(configuredPath),
        ...envKeys.map((key) => trimOptionalPath(process.env[key])),
    ].filter((value): value is string => Boolean(value))

    for (const candidate of directCandidates) {
        if (path.isAbsolute(candidate) || candidate.includes('\\') || candidate.includes('/')) {
            const resolvedPath = path.resolve(candidate)
            if (!await pathExists(resolvedPath)) {
                throw new Error(`Исполняемый файл не найден: ${resolvedPath}`)
            }
            return resolvedPath
        }

        return candidate
    }

    for (const candidate of fileCandidates) {
        const resolvedPath = path.resolve(PROJECT_ROOT, candidate)
        if (await pathExists(resolvedPath)) {
            return resolvedPath
        }
    }

    const fallback = commandCandidates[0]
    if (!fallback) {
        throw new Error('Не заданы кандидаты для поиска исполняемого файла')
    }

    return fallback
}

async function findFiles(rootDir: string, predicate: (filePath: string) => boolean): Promise<string[]> {
    const results: string[] = []
    const stack = [rootDir]

    while (stack.length > 0) {
        const currentDir = stack.pop()
        if (!currentDir) continue

        const entries = await fsp.readdir(currentDir, { withFileTypes: true })
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name)
            if (entry.isDirectory()) {
                stack.push(fullPath)
                continue
            }

            if (entry.isFile() && predicate(fullPath)) {
                results.push(fullPath)
            }
        }
    }

    return results
}

async function runProcess(executable: string, args: string[], timeoutMs: number): Promise<SpawnResult> {
    return await new Promise<SpawnResult>((resolve) => {
        const child = spawn(executable, args, { windowsHide: true })
        let stdout = ''
        let stderr = ''
        let timedOut = false

        child.stdout.on('data', (chunk) => {
            stdout += chunk.toString()
        })
        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString()
        })

        const timer = setTimeout(() => {
            timedOut = true
            try {
                child.kill('SIGKILL')
            } catch {
                child.kill()
            }
        }, timeoutMs)

        child.on('close', (code) => {
            clearTimeout(timer)
            resolve({
                ok: !timedOut && code === 0,
                stdout,
                stderr,
                timedOut,
            })
        })

        child.on('error', (error) => {
            clearTimeout(timer)
            resolve({
                ok: false,
                stdout,
                stderr: error.message,
                timedOut,
            })
        })
    })
}

async function compressAudioFile(filePath: string, ffmpegPath: string): Promise<{ originalSize: number; finalSize: number; error?: string }> {
    const ext = path.extname(filePath).toLowerCase()
    const encodeParams = AUDIO_ENCODE_PARAMS[ext]

    if (!encodeParams) {
        const originalSize = (await fsp.stat(filePath)).size
        return { originalSize, finalSize: originalSize }
    }

    const originalSize = (await fsp.stat(filePath)).size
    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'sat-snd-'))
    const tempFilePath = path.join(tempDir, `out${ext}`)

    try {
        const result = await runProcess(
            ffmpegPath,
            ['-y', '-i', filePath, '-loglevel', 'error', ...encodeParams, tempFilePath],
            DEFAULT_SOUND_TIMEOUT_MS,
        )

        if (!result.ok || !await pathExists(tempFilePath)) {
            return {
                originalSize,
                finalSize: originalSize,
                error: result.timedOut
                    ? 'ffmpeg завершился по таймауту'
                    : (result.stderr || result.stdout || 'ошибка ffmpeg').trim().slice(0, 300),
            }
        }

        const compressedSize = (await fsp.stat(tempFilePath)).size
        if (compressedSize < originalSize) {
            await fsp.copyFile(tempFilePath, filePath)
            return { originalSize, finalSize: compressedSize }
        }

        return { originalSize, finalSize: originalSize }
    } catch (error) {
        const err = error as Error
        return { originalSize, finalSize: originalSize, error: err.message ?? String(error) }
    } finally {
        await fsp.rm(tempDir, { recursive: true, force: true })
    }
}

async function exportVtfToTga(vtfCmdPath: string, inputVtfPath: string, outputDir: string): Promise<SpawnResult> {
    return await runProcess(
        vtfCmdPath,
        ['-file', inputVtfPath, '-output', outputDir, '-exportformat', 'tga', '-silent'],
        DEFAULT_VTF_TIMEOUT_MS,
    )
}

async function encodeTgaToVtf(vtfCmdPath: string, inputTgaPath: string, outputDir: string): Promise<SpawnResult> {
    return await runProcess(
        vtfCmdPath,
        [
            '-file',
            inputTgaPath,
            '-output',
            outputDir,
            '-format',
            process.env.VTF_FORMAT?.trim() || DEFAULT_VTF_FORMAT,
            '-alphaformat',
            process.env.VTF_ALPHA_FORMAT?.trim() || DEFAULT_VTF_ALPHA_FORMAT,
            '-resize',
            '-rclampwidth',
            String(Number(process.env.VTF_MAX_WIDTH ?? DEFAULT_VTF_MAX_WIDTH)),
            '-rclampheight',
            String(Number(process.env.VTF_MAX_HEIGHT ?? DEFAULT_VTF_MAX_HEIGHT)),
            '-silent',
        ],
        DEFAULT_VTF_TIMEOUT_MS,
    )
}

async function compressVtfFile(filePath: string, vtfCmdPath: string): Promise<{ originalSize: number; finalSize: number; error?: string }> {
    const originalSize = (await fsp.stat(filePath)).size
    const baseName = path.basename(filePath, '.vtf')
    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'sat-vtf-'))
    const workingVtfPath = path.join(tempDir, `${baseName}.vtf`)

    try {
        await fsp.copyFile(filePath, workingVtfPath)

        const exportResult = await exportVtfToTga(vtfCmdPath, workingVtfPath, tempDir)
        const exportedTgaPath = path.join(tempDir, `${baseName}.tga`)
        if (!await pathExists(exportedTgaPath)) {
            return {
                originalSize,
                finalSize: originalSize,
                error: exportResult.timedOut
                    ? 'Экспорт VTFCmd завершился по таймауту'
                    : `TGA не был создан: ${(exportResult.stderr || exportResult.stdout || 'неизвестная ошибка').trim().slice(0, 300)}`,
            }
        }

        await fsp.rm(workingVtfPath, { force: true })

        const encodeResult = await encodeTgaToVtf(vtfCmdPath, exportedTgaPath, tempDir)
        if (!await pathExists(workingVtfPath)) {
            return {
                originalSize,
                finalSize: originalSize,
                error: encodeResult.timedOut
                    ? 'Сжатие VTFCmd завершилось по таймауту'
                    : `VTF не был создан: ${(encodeResult.stderr || encodeResult.stdout || 'неизвестная ошибка').trim().slice(0, 300)}`,
            }
        }

        const compressedSize = (await fsp.stat(workingVtfPath)).size
        if (compressedSize < originalSize) {
            await fsp.copyFile(workingVtfPath, filePath)
            return { originalSize, finalSize: compressedSize }
        }

        return { originalSize, finalSize: originalSize }
    } catch (error) {
        const err = error as Error
        return { originalSize, finalSize: originalSize, error: err.message ?? String(error) }
    } finally {
        await fsp.rm(tempDir, { recursive: true, force: true })
    }
}

function makeEmptySummary(): ProcessSummary {
    return {
        processed: 0,
        skipped: 0,
        execErrors: 0,
        copyErrors: 0,
        originalBytes: 0,
        finalBytes: 0,
    }
}

async function runSoundCompression(
    outputPath: string,
    cfg: PostProcessConfig,
    emit: (event: RunEvent) => void,
): Promise<ProcessSummary> {
    const summary = makeEmptySummary()
    const files = await findFiles(outputPath, (filePath) => AUDIO_EXTENSIONS.has(path.extname(filePath).toLowerCase()))

    emit({ type: 'info', message: `Дополнительное сжатие звуков: найдено ${files.length} файл(ов)` })
    if (files.length === 0) {
        return summary
    }

    const ffmpegPath = await resolveExecutable(cfg.ffmpegPath, ['FFMPEG_PATH'], ['bin/ffmpeg.exe'], ['ffmpeg.exe', 'ffmpeg'])
    const concurrency = readConcurrencyEnv('SOUND_CONCURRENCY', DEFAULT_SOUND_CONCURRENCY)
    emit({ type: 'debug', tag: '[sound]', message: `ffmpeg=${ffmpegPath}; параллелизм=${concurrency}` })

    let completed = 0
    await runWorkerPool(files, concurrency, async (filePath) => {
        const result = await compressAudioFile(filePath, ffmpegPath)
        summary.originalBytes += result.originalSize
        summary.finalBytes += result.finalSize

        if (result.error) {
            summary.execErrors += 1
            emit({
                type: 'error',
                stage: 'exec',
                file: filePath,
                message: `Ошибка сжатия звука: ${result.error}`,
            })
        } else if (result.finalSize < result.originalSize) {
            summary.processed += 1
        } else {
            summary.skipped += 1
        }

        completed += 1
        if (completed % 100 === 0 || completed === files.length) {
            emit({
                type: 'debug',
                tag: '[sound]',
                message: `обработано ${completed}/${files.length}`,
            })
        }
    })

    const savedBytes = summary.originalBytes - summary.finalBytes
    emit({
        type: 'info',
        message: `Сжатие звуков завершено: изменено=${summary.processed}, пропущено=${summary.skipped}, ошибок=${summary.execErrors}, сэкономлено=${formatBytes(savedBytes)}`,
    })

    return summary
}

async function runVtfCompression(
    outputPath: string,
    cfg: PostProcessConfig,
    emit: (event: RunEvent) => void,
): Promise<ProcessSummary> {
    const summary = makeEmptySummary()
    const files = await findFiles(outputPath, (filePath) => path.extname(filePath).toLowerCase() === '.vtf')

    emit({ type: 'info', message: `Дополнительное сжатие VTF: найдено ${files.length} файл(ов)` })
    if (files.length === 0) {
        return summary
    }

    const vtfCmdPath = await resolveExecutable(cfg.vtfCmdPath, ['VTFCMD_PATH', 'VTF_CMD_PATH'], ['bin/VTFCmd.exe'], ['VTFCmd.exe'])
    const concurrency = readConcurrencyEnv('VTF_CONCURRENCY', DEFAULT_VTF_CONCURRENCY)
    emit({ type: 'debug', tag: '[vtf]', message: `VTFCmd=${vtfCmdPath}; параллелизм=${concurrency}` })

    let completed = 0
    await runWorkerPool(files, concurrency, async (filePath) => {
        const result = await compressVtfFile(filePath, vtfCmdPath)
        summary.originalBytes += result.originalSize
        summary.finalBytes += result.finalSize

        if (result.error) {
            summary.execErrors += 1
            emit({
                type: 'error',
                stage: 'exec',
                file: filePath,
                message: `Ошибка сжатия VTF: ${result.error}`,
            })
        } else if (result.finalSize < result.originalSize) {
            summary.processed += 1
        } else {
            summary.skipped += 1
        }

        completed += 1
        if (completed % 25 === 0 || completed === files.length) {
            emit({
                type: 'debug',
                tag: '[vtf]',
                message: `обработано ${completed}/${files.length}`,
            })
        }
    })

    const savedBytes = summary.originalBytes - summary.finalBytes
    emit({
        type: 'info',
        message: `Сжатие VTF завершено: изменено=${summary.processed}, пропущено=${summary.skipped}, ошибок=${summary.execErrors}, сэкономлено=${formatBytes(savedBytes)}`,
    })

    return summary
}

export async function runOptionalPostProcess(
    outputPath: string,
    cfg: PostProcessConfig,
    emit: (event: RunEvent) => void,
): Promise<{ execErrors: number; copyErrors: number }> {
    if (!cfg.compressSounds && !cfg.compressVtf) {
        return { execErrors: 0, copyErrors: 0 }
    }

    emit({ type: 'info', message: 'Запускаю дополнительную пост-обработку...' })

    let execErrors = 0
    let copyErrors = 0

    if (cfg.compressSounds) {
        try {
            const summary = await runSoundCompression(outputPath, cfg, emit)
            execErrors += summary.execErrors
            copyErrors += summary.copyErrors
        } catch (error) {
            const err = error as Error
            execErrors += 1
            emit({
                type: 'error',
                stage: 'exec',
                message: `Не удалось подготовить сжатие звуков: ${err.message ?? String(error)}`,
            })
        }
    }

    if (cfg.compressVtf) {
        try {
            const summary = await runVtfCompression(outputPath, cfg, emit)
            execErrors += summary.execErrors
            copyErrors += summary.copyErrors
        } catch (error) {
            const err = error as Error
            execErrors += 1
            emit({
                type: 'error',
                stage: 'exec',
                message: `Не удалось подготовить сжатие VTF: ${err.message ?? String(error)}`,
            })
        }
    }

    emit({
        type: 'info',
        message: `Дополнительная пост-обработка завершена: ошибок exec=${execErrors}, ошибок copy=${copyErrors}`,
    })

    return { execErrors, copyErrors }
}
