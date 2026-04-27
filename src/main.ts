import cliProgress from 'cli-progress'
import {
    runFindContent,
    DEFAULT_CONTENT_ROOTS,
    DEFAULT_VMF_OUTPUT_PATH,
    DEFAULT_EXTS,
    DEFAULT_CONTENT_KEYS,
    type RunEvent,
    type VmfPackConfig,
} from './core.js'
import {
    runContentPack,
    DEFAULT_CONTENT_PACK_CONTENT_DIR,
    DEFAULT_CONTENT_PACK_CONTENT_DIRS,
    DEFAULT_CONTENT_PACK_OUTPUT_PATH,
    DEFAULT_CONTENT_PACK_RULES_PATH,
    type ContentPackConfig,
} from './content-pack.js'
import {
    runContentSplit,
    DEFAULT_CONTENT_SPLIT_INPUT_PATH,
    DEFAULT_CONTENT_SPLIT_OUTPUT_PATH,
    DEFAULT_SPLIT_LIMIT_BYTES,
    type ContentSplitConfig,
} from './content-split.js'
import { normalizeRunMode } from './run-mode.js'

const envContentRoots = (process.env.CONTENT_ROOTS ?? '')
    .split(';')
    .map(x => x.trim())
    .filter(Boolean)

function emitCliEvent(progressBar: cliProgress.SingleBar, state: { started: boolean }, event: RunEvent) {
    switch (event.type) {
        case 'info':
            console.log(event.message)
            break
        case 'debug':
            console.log(`${event.tag} ${event.message}`)
            break
        case 'scanning':
            console.log(event.message)
            break
        case 'scanned':
            progressBar.start(event.total, 0)
            state.started = true
            break
        case 'progress':
            progressBar.update(event.processed)
            break
        case 'warn':
            console.warn(`\n[предупр] ${event.message}`)
            break
        case 'error':
            console.error(`\n[${event.stage}] ${event.file ? `${event.file} | ` : ''}${event.message}`)
            break
        case 'done':
            if (state.started) progressBar.stop()
            console.log(`\nГотово. Ошибки: exec=${event.execErrors}, copy=${event.copyErrors}`)
            break
    }
}

function buildVmfPackConfig(): VmfPackConfig {
    return {
        contentRoots: envContentRoots.length > 0
            ? envContentRoots
            : DEFAULT_CONTENT_ROOTS,
        vmfPath: process.env.VMF_PATH ?? '',
        outputPath: process.env.OUTPUT_PATH ?? DEFAULT_VMF_OUTPUT_PATH,
        cleanOutput: process.env.CLEAN_OUTPUT === '1' || process.env.CLEAN_OUTPUT === 'true',
        exts: DEFAULT_EXTS,
        contentKeys: DEFAULT_CONTENT_KEYS,
    }
}

function buildContentPackConfig(): ContentPackConfig {
    const envContentDirs = (process.env.PACK_CONTENT_DIRS ?? process.env.CONTENT_DIRS ?? '')
        .split(';')
        .map(x => x.trim())
        .filter(Boolean)

    return {
        contentDir: process.env.PACK_CONTENT_DIR ?? process.env.CONTENT_DIR ?? DEFAULT_CONTENT_PACK_CONTENT_DIR,
        contentDirs: envContentDirs.length > 0 ? envContentDirs : DEFAULT_CONTENT_PACK_CONTENT_DIRS,
        rulesPath: process.env.PACK_RULES_PATH ?? process.env.RULES_PATH ?? DEFAULT_CONTENT_PACK_RULES_PATH,
        outputPath: process.env.OUTPUT_PATH ?? DEFAULT_CONTENT_PACK_OUTPUT_PATH,
        cleanOutput: process.env.CLEAN_OUTPUT === '1' || process.env.CLEAN_OUTPUT === 'true',
        compressSounds: process.env.COMPRESS_SOUNDS === '1' || process.env.COMPRESS_SOUNDS === 'true',
        compressVtf: process.env.COMPRESS_VTF === '1' || process.env.COMPRESS_VTF === 'true',
        ffmpegPath: process.env.FFMPEG_PATH ?? '',
        vtfCmdPath: process.env.VTFCMD_PATH ?? process.env.VTF_CMD_PATH ?? '',
    }
}

function parseSplitLimitBytes(): number {
    const raw = process.env.SPLIT_LIMIT_GB
    if (!raw?.trim() || raw === '0') return raw === '0' ? 0 : DEFAULT_SPLIT_LIMIT_BYTES
    const gb = Number(raw)
    return Number.isFinite(gb) && gb > 0 ? Math.round(gb * 1024 * 1024 * 1024) : DEFAULT_SPLIT_LIMIT_BYTES
}

function buildContentSplitConfig(): ContentSplitConfig {
    return {
        splitInputPath: process.env.SPLIT_INPUT_PATH ?? process.env.OUTPUT_PATH ?? DEFAULT_CONTENT_SPLIT_INPUT_PATH,
        outputPath: process.env.SPLIT_OUTPUT_PATH ?? process.env.SPLIT_INPUT_PATH ?? process.env.OUTPUT_PATH ?? DEFAULT_CONTENT_SPLIT_OUTPUT_PATH,
        splitLimitBytes: parseSplitLimitBytes(),
        cleanSourceGroups: process.env.CLEAN_SOURCE_GROUPS !== '0',
    }
}

const mode = normalizeRunMode(process.env.RUN_MODE ?? process.env.MODE)
if (!mode) {
    console.error(`Неизвестный RUN_MODE: ${process.env.RUN_MODE ?? process.env.MODE ?? ''}`)
    process.exit(1)
}

const progressBar = new cliProgress.SingleBar({
    format: 'Прогресс |{bar}| {percentage}% | {value}/{total} файлов | ETA: {eta}с',
    barCompleteChar: '#',
    barIncompleteChar: '-',
    hideCursor: true,
    clearOnComplete: false,
    stopOnComplete: false,
})

const state = { started: false }

if (mode === 'content-pack') {
    await runContentPack(buildContentPackConfig(), (event) => {
        emitCliEvent(progressBar, state, event)
    })
} else if (mode === 'content-split') {
    await runContentSplit(buildContentSplitConfig(), (event) => {
        emitCliEvent(progressBar, state, event)
    })
} else {
    await runFindContent(buildVmfPackConfig(), (event) => {
        emitCliEvent(progressBar, state, event)
    })
}
