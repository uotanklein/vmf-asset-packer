import cliProgress from 'cli-progress'
import {
    runFindContent,
    DEFAULT_CONTENT_ROOTS,
    DEFAULT_GMOD_PATH,
    DEFAULT_VMF_PATH,
    DEFAULT_OUTPUT_PATH,
    DEFAULT_EXTS,
    DEFAULT_CONTENT_KEYS,
} from './core.js'

const envContentRoots = (process.env.CONTENT_ROOTS ?? '')
    .split(';')
    .map(x => x.trim())
    .filter(Boolean)

const cfg = {
    contentRoots: envContentRoots.length > 0
        ? envContentRoots
        : [process.env.GMOD_PATH ?? DEFAULT_GMOD_PATH, ...DEFAULT_CONTENT_ROOTS.slice(1)],
    vmfPath: process.env.VMF_PATH ?? DEFAULT_VMF_PATH,
    outputPath: process.env.OUTPUT_PATH ?? DEFAULT_OUTPUT_PATH,
    cleanOutput: process.env.CLEAN_OUTPUT === '1' || process.env.CLEAN_OUTPUT === 'true',
    exts: DEFAULT_EXTS,
    contentKeys: DEFAULT_CONTENT_KEYS,
}

const progressBar = new cliProgress.SingleBar({
    format: 'Progress |{bar}| {percentage}% | {value}/{total} files | ETA: {eta}s',
    barCompleteChar: '#',
    barIncompleteChar: '-',
    hideCursor: true,
    clearOnComplete: false,
    stopOnComplete: false,
})

let started = false

await runFindContent(cfg, (e) => {
    switch (e.type) {
        case 'info':
            console.log(e.message)
            break
        case 'debug':
            console.log(`${e.tag} ${e.message}`)
            break
        case 'scanning':
            console.log('Scanning VMF...')
            break
        case 'scanned':
            progressBar.start(e.total, 0)
            started = true
            break
        case 'progress':
            progressBar.update(e.processed)
            break
        case 'warn':
            console.warn(`\n[warn] ${e.message}`)
            break
        case 'error':
            console.error(`\n[${e.stage}] ${e.file ? e.file + ' — ' : ''}${e.message}`)
            break
        case 'done':
            if (started) progressBar.stop()
            console.log(`\nDone. Errors: exec=${e.execErrors}, copy=${e.copyErrors}`)
            break
    }
})
