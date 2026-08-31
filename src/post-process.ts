import fs from 'fs'
import os from 'os'
import path from 'path'
import fsp from 'fs/promises'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { formatBytes, pathExists, type RunEvent } from './shared.js'

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// .ogg намеренно исключён из сжатия: исходник уже сжат Vorbis, перекодирование
// в q:a 3 почти никогда не уменьшает размер, поэтому ogg копируется как есть.
const AUDIO_EXTENSIONS = new Set(['.wav', '.mp3'])
const AUDIO_ENCODE_PARAMS: Record<string, string[]> = {
    '.wav': ['-c:a', 'adpcm_ms'],
    '.mp3': ['-c:a', 'libmp3lame', '-b:a', '96k'],
}

const DEFAULT_VTF_FORMAT = 'dxt1'
const DEFAULT_VTF_ALPHA_FORMAT = 'dxt5'
const DEFAULT_VTF_MAX_WIDTH = 1024
const DEFAULT_VTF_MAX_HEIGHT = 1024
const VTF_SIGNATURE = 'VTF\0'
const VTF_HEADER_MIN_SIZE = 65
const VTF_WIDTH_OFFSET = 16
const VTF_HEIGHT_OFFSET = 18
const VTF_FLAGS_OFFSET = 20
const VTF_FRAMES_OFFSET = 24
const VTF_HIGH_FORMAT_OFFSET = 52
const VTF_MIP_COUNT_OFFSET = 56
const VTF_LOW_FORMAT_OFFSET = 57
const VTF_LOW_WIDTH_OFFSET = 61
const VTF_LOW_HEIGHT_OFFSET = 62
const VTF_DEPTH_OFFSET = 63
const VTF_FLAG_NOMIP = 0x00000100
// Content-root markers: the first path segment with one of these names marks the
// start of the content-relative portion of a path (e.g. "materials/models/foo").
const CONTENT_ROOT_MARKERS = new Set([
    'materials', 'models', 'sound', 'maps', 'particles', 'particle',
    'scripts', 'lua', 'resource', 'cfg', 'data', 'gamemodes', 'fonts',
])

/** Extracts the content-relative path beginning at the first content-root marker segment.
 *  Returns lowercase forward-slash path, e.g. "materials/models/menu_circle".
 *  Returns null if no marker is found. */
function getContentRelativePath(filePath: string): string | null {
    const parts = filePath.replace(/\\/g, '/').split('/')
    const idx = parts.findIndex(p => CONTENT_ROOT_MARKERS.has(p.toLowerCase()))
    if (idx === -1) return null
    return parts.slice(idx).join('/').toLowerCase()
}

/** Filters out files whose content-relative path starts with one of the excluded content-relative paths. */
function filterByExcludePaths(allFiles: string[], excludePaths: string[]): string[] {
    if (excludePaths.length === 0) return allFiles
    const excludeContentPaths = excludePaths
        .map(p => getContentRelativePath(p))
        .filter((p): p is string => p !== null)
    if (excludeContentPaths.length === 0) return allFiles
    return allFiles.filter(f => {
        const fileContentPath = getContentRelativePath(f)
        if (!fileContentPath) return true
        return !excludeContentPaths.some(exc =>
            fileContentPath === exc || fileContentPath.startsWith(exc + '/'),
        )
    })
}

function isParticleMaterialVtf(filePath: string): boolean {
    const contentPath = getContentRelativePath(filePath)
    if (!contentPath) return false

    return contentPath.startsWith('materials/particle/')
        || contentPath.startsWith('materials/particles/')
}

const DEFAULT_SOUND_TIMEOUT_MS = 60_000
const DEFAULT_VTF_TIMEOUT_MS = 120_000
const DEFAULT_SOUND_CONCURRENCY = Math.max(1, os.cpus().length)
const DEFAULT_VTF_CONCURRENCY = Math.max(1, os.cpus().length)

const VTF_IMAGE_FORMAT_NAMES: Record<number, string> = {
    0: 'rgba8888',
    1: 'abgr8888',
    2: 'rgb888',
    3: 'bgr888',
    4: 'rgb565',
    5: 'i8',
    6: 'ia88',
    7: 'p8',
    8: 'a8',
    9: 'rgb888_bluescreen',
    10: 'bgr888_bluescreen',
    11: 'argb8888',
    12: 'bgra8888',
    13: 'dxt1',
    14: 'dxt3',
    15: 'dxt5',
    16: 'bgrx8888',
    17: 'bgr565',
    18: 'bgrx5551',
    19: 'bgra4444',
    20: 'dxt1_onebitalpha',
    21: 'bgra5551',
    22: 'uv88',
    23: 'uvwq8888',
    24: 'rgba16161616f',
    25: 'rgba16161616',
    26: 'uvlx8888',
}

type VtfMetadata = {
    width: number
    height: number
    flags: number
    frames: number
    highFormat: number
    highFormatName: string | null
    mipCount: number
    lowFormat: number
    lowWidth: number
    lowHeight: number
    depth: number
}

function readConcurrencyEnv(envName: string, fallback: number): number {
    const raw = process.env[envName]
    if (raw === undefined) return fallback
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return fallback
    return Math.max(1, Math.trunc(parsed))
}

function readOptionalPositiveIntEnv(envName: string): number | null {
    const raw = process.env[envName]
    if (raw === undefined || raw.trim() === '') return null
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed <= 0) return null
    return Math.trunc(parsed)
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
    excludePaths?: string[]
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

type CompressionResult = {
    originalSize: number
    finalSize: number
    error?: string
    skippedReason?: string
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

async function compressAudioFile(filePath: string, ffmpegPath: string): Promise<CompressionResult> {
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

async function readVtfMetadata(filePath: string): Promise<VtfMetadata | null> {
    const handle = await fsp.open(filePath, 'r')
    try {
        const buffer = Buffer.alloc(VTF_HEADER_MIN_SIZE)
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
        if (bytesRead < buffer.length) {
            return null
        }

        if (buffer.toString('ascii', 0, 4) !== VTF_SIGNATURE) {
            return null
        }

        const highFormat = buffer.readUInt32LE(VTF_HIGH_FORMAT_OFFSET)
        return {
            width: buffer.readUInt16LE(VTF_WIDTH_OFFSET),
            height: buffer.readUInt16LE(VTF_HEIGHT_OFFSET),
            flags: buffer.readUInt32LE(VTF_FLAGS_OFFSET),
            frames: buffer.readUInt16LE(VTF_FRAMES_OFFSET),
            highFormat,
            highFormatName: VTF_IMAGE_FORMAT_NAMES[highFormat] ?? null,
            mipCount: buffer.readUInt8(VTF_MIP_COUNT_OFFSET),
            lowFormat: buffer.readUInt32LE(VTF_LOW_FORMAT_OFFSET),
            lowWidth: buffer.readUInt8(VTF_LOW_WIDTH_OFFSET),
            lowHeight: buffer.readUInt8(VTF_LOW_HEIGHT_OFFSET),
            depth: buffer.readUInt16LE(VTF_DEPTH_OFFSET),
        }
    } finally {
        await handle.close()
    }
}

async function encodeTgaToVtf(vtfCmdPath: string, inputTgaPath: string, outputDir: string, meta: VtfMetadata | null): Promise<SpawnResult> {
    const formatOverride = process.env.VTF_FORMAT?.trim()
    const alphaFormatOverride = process.env.VTF_ALPHA_FORMAT?.trim()
    const targetFormat = formatOverride || meta?.highFormatName || DEFAULT_VTF_FORMAT
    const clampWidth = readOptionalPositiveIntEnv('VTF_MAX_WIDTH') ?? meta?.width ?? DEFAULT_VTF_MAX_WIDTH
    const clampHeight = readOptionalPositiveIntEnv('VTF_MAX_HEIGHT') ?? meta?.height ?? DEFAULT_VTF_MAX_HEIGHT

    const args = [
        '-file',
        inputTgaPath,
        '-output',
        outputDir,
        '-format',
        targetFormat,
    ]

    if (alphaFormatOverride) {
        args.push('-alphaformat', alphaFormatOverride)
    }

    if ((meta?.mipCount ?? 1) <= 1 || Boolean(meta && (meta.flags & VTF_FLAG_NOMIP))) {
        args.push('-nomipmaps')
    }

    args.push(
        '-resize',
        '-rclampwidth',
        String(clampWidth),
        '-rclampheight',
        String(clampHeight),
        '-silent',
    )

    return await runProcess(
        vtfCmdPath,
        args,
        DEFAULT_VTF_TIMEOUT_MS,
    )
}

async function compressVtfFile(filePath: string, vtfCmdPath: string): Promise<CompressionResult> {
    const originalSize = (await fsp.stat(filePath)).size

    if (isParticleMaterialVtf(filePath)) {
        return {
            originalSize,
            finalSize: originalSize,
            skippedReason: 'particle VTF: export/import через VTFCmd ломает формат/альфу у партиклов',
        }
    }

    const meta = await readVtfMetadata(filePath)
    if (meta !== null && meta.frames > 1) {
        return {
            originalSize,
            finalSize: originalSize,
            skippedReason: `анимированный VTF (${meta.frames} frames): VTFCmd export/import схлопывает его до одного кадра`,
        }
    }

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

        const encodeResult = await encodeTgaToVtf(vtfCmdPath, exportedTgaPath, tempDir, meta)
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
    const allFiles = await findFiles(outputPath, (filePath) => AUDIO_EXTENSIONS.has(path.extname(filePath).toLowerCase()))

    const files = filterByExcludePaths(allFiles, cfg.excludePaths ?? [])

    const excludedCount = allFiles.length - files.length
    const excludedSuffix = excludedCount > 0 ? `, в исключениях ${excludedCount}` : ''
    emit({ type: 'info', message: `Дополнительное сжатие звуков: найдено ${allFiles.length} файл(ов)${excludedSuffix}` })
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
    const allFiles = await findFiles(outputPath, (filePath) => path.extname(filePath).toLowerCase() === '.vtf')

    const files = filterByExcludePaths(allFiles, cfg.excludePaths ?? [])

    const excludedCount = allFiles.length - files.length
    const excludedSuffix = excludedCount > 0 ? `, в исключениях ${excludedCount}` : ''
    emit({ type: 'info', message: `Дополнительное сжатие VTF: найдено ${allFiles.length} файл(ов)${excludedSuffix}` })
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
        } else if (result.skippedReason) {
            summary.skipped += 1
            emit({
                type: 'warn',
                file: filePath,
                message: `Пропускаю сжатие VTF: ${result.skippedReason}`,
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

// ---------------------------------------------------------------------------
// Model-material shader guard
//
// LightmappedGeneric (and the other lightmap-based world shaders) sample the
// BSP lightmap — which brush geometry has and models do NOT. When such a shader
// lands on a material under materials/models/** — e.g. a brush VMT gets
// mispackaged into a model's material path, or a propper-converted prop keeps
// its original world shader — the prop renders INVISIBLE in-engine: no error,
// no pink checkerboard, the shader simply draws nothing (collision still works,
// so you walk into an invisible wall). Rewriting the shader to VertexLitGeneric
// (the model equivalent) makes the prop render again.
// ---------------------------------------------------------------------------
const BRUSH_ONLY_SHADERS = new Set([
    'lightmappedgeneric',
    'lightmapped_4wayblend',
    'worldvertextransition',
    'worldtwotextureblend',
])
const MODEL_SHADER_REPLACEMENT = 'VertexLitGeneric'

type LeadingShaderToken = { name: string; tokenStart: number; tokenEnd: number }

/** Locates the shader name in a VMT: the first token that isn't blank or a //
 *  comment. Returns the name plus the character range of just the name, so any
 *  surrounding quotes are preserved on rewrite. Null if none is found. */
function findLeadingShaderToken(text: string): LeadingShaderToken | null {
    let offset = 0
    for (const rawLine of text.split('\n')) {
        const lineStart = offset
        offset += rawLine.length + 1 // account for the '\n' consumed by split
        const trimmed = rawLine.trim()
        if (trimmed === '' || trimmed.startsWith('//')) continue

        const match = rawLine.match(/^(\s*)("?)([A-Za-z_][A-Za-z0-9_]*)/)
        if (!match) return null
        const leading = match[1] ?? ''
        const quote = match[2] ?? ''
        const name = match[3] ?? ''
        const tokenStart = lineStart + leading.length + quote.length
        return { name, tokenStart, tokenEnd: tokenStart + name.length }
    }
    return null
}

/** Rewrites brush-only shaders found on materials/models/** VMTs to the model
 *  shader. VMTs are read/written as latin1 so non-UTF-8 bytes (Windows-1252)
 *  pass through untouched; the shader token itself is pure ASCII. */
export async function fixModelMaterialShaders(
    outputPath: string,
    emit: (event: RunEvent) => void,
): Promise<{ fixed: number; scanned: number }> {
    const vmtFiles = await findFiles(outputPath, (filePath) => {
        if (path.extname(filePath).toLowerCase() !== '.vmt') return false
        const relative = getContentRelativePath(filePath)
        return relative !== null && relative.startsWith('materials/models/')
    })

    let fixed = 0
    for (const filePath of vmtFiles) {
        let text: string
        try {
            text = await fsp.readFile(filePath, 'latin1')
        } catch (error) {
            emit({ type: 'warn', file: filePath, message: `Не удалось прочитать VMT для проверки шейдера: ${(error as Error).message}` })
            continue
        }

        const shader = findLeadingShaderToken(text)
        if (!shader || !BRUSH_ONLY_SHADERS.has(shader.name.toLowerCase())) continue

        const rewritten = text.slice(0, shader.tokenStart) + MODEL_SHADER_REPLACEMENT + text.slice(shader.tokenEnd)
        try {
            await fsp.writeFile(filePath, rewritten, 'latin1')
            fixed += 1
            emit({
                type: 'warn',
                file: filePath,
                message: `Браш-шейдер ${shader.name} на материале модели → ${MODEL_SHADER_REPLACEMENT} (иначе проп невидим в игре)`,
            })
        } catch (error) {
            emit({ type: 'error', stage: 'copy', file: filePath, message: `Не удалось переписать шейдер: ${(error as Error).message}` })
        }
    }

    if (vmtFiles.length > 0) {
        emit({
            type: 'info',
            message: `Проверка шейдеров моделей: VMT под materials/models/ — ${vmtFiles.length}, исправлено браш-шейдеров — ${fixed}`,
        })
    }

    return { fixed, scanned: vmtFiles.length }
}

export async function runOptionalPostProcess(
    outputPath: string,
    cfg: PostProcessConfig,
    emit: (event: RunEvent) => void,
): Promise<{ execErrors: number; copyErrors: number }> {
    let execErrors = 0
    let copyErrors = 0

    // Always guard model materials against brush-only shaders (they render props
    // invisible). Runs independently of the optional audio/VTF compression below;
    // disable with FIX_MODEL_SHADERS=0.
    if (process.env.FIX_MODEL_SHADERS !== '0') {
        try {
            await fixModelMaterialShaders(outputPath, emit)
        } catch (error) {
            execErrors += 1
            emit({ type: 'error', stage: 'exec', message: `Проверка шейдеров моделей не удалась: ${(error as Error).message}` })
        }
    }

    if (!cfg.compressSounds && !cfg.compressVtf) {
        return { execErrors, copyErrors }
    }

    emit({ type: 'info', message: 'Запускаю дополнительную пост-обработку...' })

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
