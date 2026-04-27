import express from 'express'
import type { Request, Response } from 'express'
import path from 'path'
import { readFileSync } from 'fs'
import { execFile } from 'child_process'
import { randomUUID } from 'crypto'
import {
    runFindContent,
    DEFAULT_CONTENT_ROOTS,
    DEFAULT_EXTS,
    DEFAULT_CONTENT_KEYS,
    DEFAULT_VMF_OUTPUT_PATH,
    DEFAULT_VMF_PATH,
    DEFAULT_VMF_PATHS,
    type RunEvent,
    type VmfPackConfig,
} from './core.js'
import {
    runContentPack,
    DEFAULT_CONTENT_PACK_CONTENT_DIR,
    DEFAULT_CONTENT_PACK_CONTENT_DIRS,
    DEFAULT_CONTENT_PACK_OUTPUT_PATH,
    createDefaultContentPackRulesInput,
    type ContentPackConfig,
    type ContentPackRulesInput,
} from './content-pack.js'
import {
    runContentSplit,
    DEFAULT_CONTENT_SPLIT_INPUT_PATH,
    DEFAULT_CONTENT_SPLIT_OUTPUT_PATH,
    DEFAULT_SPLIT_LIMIT_BYTES,
    type ContentSplitConfig,
} from './content-split.js'
import { DEFAULT_RUN_MODE, normalizeRunMode, type RunMode } from './run-mode.js'

const PORT = Number(process.env.PORT ?? 5781)
const HOST = '127.0.0.1'
const RUN_RETENTION_MS = Number(process.env.RUN_RETENTION_MS ?? 15 * 60 * 1000)
const PROGRESS_BROADCAST_INTERVAL_MS = Math.max(50, Number(process.env.PROGRESS_BROADCAST_INTERVAL_MS ?? 120))
const DEFAULT_CONTENT_PACK_RULES_EXAMPLE_PATH = path.resolve('examples', 'qanon-content-pack.rules.json')

type RunState = {
    events: RunEvent[]
    subscribers: Set<Response>
    finished: boolean
    cleanupTimer?: NodeJS.Timeout
    latestProgressEvent?: RunEvent
    progressFlushTimer?: NodeJS.Timeout
    lastProgressBroadcastAt?: number
}

type PickerKind = 'vmf' | 'json' | 'any'

const runs = new Map<string, RunState>()
let activeRunId: string | null = null

const app = express()
app.use(express.json({ limit: '1mb' }))
app.use(express.static(path.resolve('public')))

function errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    return String(error)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function trimOptionalString(value: unknown): string | null {
    if (typeof value !== 'string') return null

    const trimmed = value.trim()
    return trimmed ? trimmed : null
}

function loadDefaultContentPackRulesConfig(): ContentPackRulesInput {
    const fallback = createDefaultContentPackRulesInput()

    try {
        const parsed = JSON.parse(readFileSync(DEFAULT_CONTENT_PACK_RULES_EXAMPLE_PATH, 'utf8')) as unknown
        if (!isPlainObject(parsed)) {
            return fallback
        }

        const groups = Array.isArray(parsed.groups) ? parsed.groups : []
        const normalizedGroups = groups.flatMap((group) => {
            if (!isPlainObject(group)) return []

            const id = trimOptionalString(group.id)
            const folder = trimOptionalString(group.folder)
            const displayName = trimOptionalString(group.displayName)
            if (!id || !folder) return []

            return [{
                id,
                folder,
                ...(displayName ? { displayName } : {}),
            }]
        })

        const rules = Array.isArray(parsed.rules) ? parsed.rules : []
        const normalizedRules = rules.flatMap((rule, index) => {
            if (!isPlainObject(rule)) return []

            const match = isPlainObject(rule.match) ? rule.match : null
            if (!match) return []

            const addonName = trimOptionalString(match.addonName)
            const addonNamePattern = trimOptionalString(match.addonNamePattern)
            if (!addonName && !addonNamePattern) return []

            const action: 'pack' | 'skip' = rule.action === 'skip' ? 'skip' : 'pack'
            const id = trimOptionalString(rule.id) ?? `rule-${index + 1}`
            const groupId = trimOptionalString(rule.groupId)
            const priority = typeof rule.priority === 'number' && Number.isFinite(rule.priority)
                ? Math.trunc(rule.priority)
                : undefined

            return [{
                id,
                match: {
                    ...(addonName ? { addonName } : {}),
                    ...(addonNamePattern ? { addonNamePattern } : {}),
                },
                action,
                ...(groupId ? { groupId } : {}),
                ...(priority !== undefined ? { priority } : {}),
            }]
        })

        const hasMapContentGroup = normalizedGroups.some((group) => group.id.toLowerCase() === 'mapcontent')
        const hasDefaultVmfOutputRule = normalizedRules.some((rule) =>
            rule.match.addonName?.toLowerCase() === '03_vmf_pack_output',
        )

        if (hasMapContentGroup && !hasDefaultVmfOutputRule) {
            normalizedRules.unshift({
                id: 'default-vmf-pack-output',
                match: {
                    addonName: '03_vmf_pack_output',
                },
                action: 'pack',
                groupId: 'MapContent',
                priority: 845,
            })
        }

        const unmatched = isPlainObject(parsed.unmatched) ? parsed.unmatched : null
        const unmatchedGroupId = unmatched ? trimOptionalString(unmatched.groupId) : null
        const unmatchedPriority = unmatched && typeof unmatched.priority === 'number' && Number.isFinite(unmatched.priority)
            ? Math.trunc(unmatched.priority)
            : undefined

        const unmatchedRule: ContentPackRulesInput['unmatched'] = unmatched?.action === 'pack' && unmatchedGroupId
            ? {
                action: 'pack',
                groupId: unmatchedGroupId,
                ...(unmatchedPriority !== undefined ? { priority: unmatchedPriority } : {}),
            }
            : fallback.unmatched ?? { action: 'skip' }

        return {
            groups: normalizedGroups.length > 0 ? normalizedGroups : fallback.groups,
            rules: normalizedRules,
            unmatched: unmatchedRule,
        }
    } catch (error) {
        console.warn(`Не удалось прочитать дефолтные группы content-pack из ${DEFAULT_CONTENT_PACK_RULES_EXAMPLE_PATH}: ${errorMessage(error)}`)
        return fallback
    }
}

const DEFAULT_CONTENT_PACK_RULES_CONFIG = loadDefaultContentPackRulesConfig()

function parseList(value: unknown, fallback: string[]): string[] {
    if (Array.isArray(value)) {
        const list = value.map(String).map(x => x.trim()).filter(Boolean)
        return list.length > 0 ? list : fallback
    }

    if (typeof value === 'string') {
        const list = value.split(',').map(x => x.trim()).filter(Boolean)
        return list.length > 0 ? list : fallback
    }

    return fallback
}

function psString(value: string): string {
    return `'${value.replace(/'/g, "''")}'`
}

async function runPowerShell(script: string): Promise<string> {
    const wrappedScript = `
$ProgressPreference = 'SilentlyContinue'
$InformationPreference = 'SilentlyContinue'
$WarningPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
${script}
`
    const encoded = Buffer.from(wrappedScript, 'utf16le').toString('base64')

    return await new Promise<string>((resolve, reject) => {
        execFile(
            'powershell.exe',
            ['-NoLogo', '-NoProfile', '-STA', '-EncodedCommand', encoded],
            { windowsHide: false, maxBuffer: 1024 * 1024, encoding: 'utf8' },
            (error, stdout, stderr) => {
                const cleanStderr = stripPowerShellNoise(stderr).trim()

                if (error) {
                    const code = typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown'
                    reject(new Error(cleanStderr || `powershell.exe exited with code ${code}`))
                    return
                }

                resolve(stdout.trim())
            },
        )
    })
}

function stripPowerShellNoise(text: string): string {
    return text
        .replace(/#< CLIXML[\s\S]*?<\/Objs>/g, '')
        .replace(/Preparing modules for first use\.\s*/g, '')
}

function buildResolvedPathScript(variableName: string, currentPath: string | undefined): string {
    if (!currentPath?.trim()) return ''

    return `
$initialPath = ${psString(currentPath)}
if (Test-Path $initialPath -PathType Leaf) {
    $resolvedPath = (Resolve-Path $initialPath).Path
    ${variableName} = [System.IO.Path]::GetDirectoryName($resolvedPath)
}
elseif (Test-Path $initialPath -PathType Container) {
    ${variableName} = (Resolve-Path $initialPath).Path
}
`
}

function getFileDialogFilter(kind: PickerKind): string {
    switch (kind) {
        case 'json':
            return 'JSON файлы (*.json)|*.json|Все файлы (*.*)|*.*'
        case 'any':
            return 'Все файлы (*.*)|*.*'
        case 'vmf':
        default:
            return 'VMF файлы (*.vmf)|*.vmf|Все файлы (*.*)|*.*'
    }
}

async function openFileDialog(title: string, currentPath: string | undefined, kind: PickerKind): Promise<string | null> {
    const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = ${psString(title)}
$dialog.Filter = ${psString(getFileDialogFilter(kind))}
$dialog.Multiselect = $false
$dialog.CheckFileExists = $true
${buildResolvedPathScript('$dialog.InitialDirectory', currentPath)}
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    Write-Output $dialog.FileName
}
`

    const selected = await runPowerShell(script)
    return selected || null
}

async function openFolderDialog(title: string, currentPath?: string): Promise<string | null> {
    const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = ${psString(title)}
$dialog.ShowNewFolderButton = $true
try { $dialog.UseDescriptionForTitle = $true } catch {}
${currentPath?.trim() ? `
$initialPath = ${psString(currentPath)}
if (Test-Path $initialPath -PathType Container) {
    $dialog.SelectedPath = (Resolve-Path $initialPath).Path
}
elseif (Test-Path $initialPath -PathType Leaf) {
    $dialog.SelectedPath = [System.IO.Path]::GetDirectoryName((Resolve-Path $initialPath).Path)
}
` : ''}
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    Write-Output $dialog.SelectedPath
}
`

    const selected = await runPowerShell(script)
    return selected || null
}

function scheduleCleanup(runId: string) {
    const state = runs.get(runId)
    if (!state) return

    state.cleanupTimer = setTimeout(() => {
        runs.delete(runId)
        if (activeRunId === runId) {
            activeRunId = null
        }
    }, RUN_RETENTION_MS)
    state.cleanupTimer.unref?.()
}

function writeEventToSubscribers(state: RunState, event: RunEvent) {
    const payload = `data: ${JSON.stringify(event)}\n\n`

    for (const subscriber of state.subscribers) {
        subscriber.write(payload)
    }
}

function flushProgressEvent(state: RunState) {
    if (state.progressFlushTimer) {
        clearTimeout(state.progressFlushTimer)
        delete state.progressFlushTimer
    }

    const event = state.latestProgressEvent
    if (!event || event.type !== 'progress') return

    delete state.latestProgressEvent
    state.lastProgressBroadcastAt = Date.now()
    writeEventToSubscribers(state, event)
}

function broadcast(runId: string, event: RunEvent) {
    const state = runs.get(runId)
    if (!state) return

    if (event.type === 'progress') {
        state.latestProgressEvent = event

        const now = Date.now()
        const lastBroadcastAt = state.lastProgressBroadcastAt ?? 0
        const dueIn = PROGRESS_BROADCAST_INTERVAL_MS - (now - lastBroadcastAt)

        if (lastBroadcastAt === 0 || dueIn <= 0) {
            flushProgressEvent(state)
        } else if (!state.progressFlushTimer) {
            state.progressFlushTimer = setTimeout(() => {
                flushProgressEvent(state)
            }, dueIn)
            state.progressFlushTimer.unref?.()
        }
        return
    }

    flushProgressEvent(state)
    state.events.push(event)
    writeEventToSubscribers(state, event)

    if (event.type === 'done') {
        state.finished = true

        if (activeRunId === runId) {
            activeRunId = null
        }

        for (const subscriber of state.subscribers) {
            subscriber.end()
        }
        state.subscribers.clear()
        scheduleCleanup(runId)
    }
}

app.get('/api/defaults', (_req, res) => {
    res.json({
        mode: DEFAULT_RUN_MODE,
        vmfPack: {
            vmfPath: DEFAULT_VMF_PATH,
            vmfPaths: DEFAULT_VMF_PATHS,
            outputPath: DEFAULT_VMF_OUTPUT_PATH,
            contentRoots: DEFAULT_CONTENT_ROOTS,
            cleanOutput: false,
            exts: DEFAULT_EXTS,
            contentKeys: DEFAULT_CONTENT_KEYS,
        },
        contentPack: {
            contentDir: DEFAULT_CONTENT_PACK_CONTENT_DIR,
            contentDirs: DEFAULT_CONTENT_PACK_CONTENT_DIRS,
            outputPath: DEFAULT_CONTENT_PACK_OUTPUT_PATH,
            cleanOutput: false,
            rulesConfig: DEFAULT_CONTENT_PACK_RULES_CONFIG,
            compressSounds: false,
            compressVtf: false,
            ffmpegPath: process.env.FFMPEG_PATH ?? '',
            vtfCmdPath: process.env.VTFCMD_PATH ?? process.env.VTF_CMD_PATH ?? '',
        },
        contentSplit: {
            splitInputPath: DEFAULT_CONTENT_SPLIT_INPUT_PATH,
            outputPath: DEFAULT_CONTENT_SPLIT_OUTPUT_PATH,
            splitLimitGb: DEFAULT_SPLIT_LIMIT_BYTES / (1024 * 1024 * 1024),
            cleanSourceGroups: true,
        },
    })
})

app.post('/api/pick-file', async (req: Request, res: Response) => {
    try {
        const body = req.body as { title?: unknown; currentPath?: unknown; kind?: unknown }
        const kind = body.kind === 'json' || body.kind === 'any' || body.kind === 'vmf'
            ? body.kind
            : 'any'

        const selectedPath = await openFileDialog(
            typeof body.title === 'string' ? body.title : 'Выбери файл',
            typeof body.currentPath === 'string' ? body.currentPath : undefined,
            kind,
        )

        res.json(selectedPath ? { path: selectedPath } : { canceled: true })
    } catch (error) {
        res.status(500).json({ error: errorMessage(error) })
    }
})

app.post('/api/pick-folder', async (req: Request, res: Response) => {
    try {
        const body = req.body as { title?: unknown; currentPath?: unknown }
        const selectedPath = await openFolderDialog(
            typeof body.title === 'string' ? body.title : 'Выбери папку',
            typeof body.currentPath === 'string' ? body.currentPath : undefined,
        )

        res.json(selectedPath ? { path: selectedPath } : { canceled: true })
    } catch (error) {
        res.status(500).json({ error: errorMessage(error) })
    }
})

app.post('/api/run', (req: Request, res: Response) => {
    if (activeRunId && runs.get(activeRunId) && !runs.get(activeRunId)!.finished) {
        res.status(409).json({ error: 'Уже выполняется другой запуск', activeRunId })
        return
    }

    const body = req.body as Record<string, unknown>
    const mode = normalizeRunMode(typeof body.mode === 'string' ? body.mode : undefined)

    if (!mode) {
        res.status(400).json({ error: 'Неизвестный режим запуска' })
        return
    }

    let runner: Promise<void>

    if (mode === 'content-pack') {
        const rulesConfig = isPlainObject(body.rulesConfig)
            ? body.rulesConfig as ContentPackRulesInput
            : undefined
        const rulesPath = typeof body.rulesPath === 'string' && body.rulesPath.trim()
            ? body.rulesPath.trim()
            : undefined
        const contentDirs = Array.isArray(body.contentDirs)
            ? body.contentDirs.map((dir) => typeof dir === 'string' ? dir.trim() : '').filter(Boolean)
            : null

        const cfg: ContentPackConfig = {
            contentDir: typeof body.contentDir === 'string' ? body.contentDir.trim() : '',
            ...(contentDirs ? { contentDirs } : {}),
            outputPath: typeof body.outputPath === 'string' ? body.outputPath.trim() : '',
            cleanOutput: body.cleanOutput === true,
            compressSounds: body.compressSounds === true,
            compressVtf: body.compressVtf === true,
            ffmpegPath: typeof body.ffmpegPath === 'string' ? body.ffmpegPath.trim() : '',
            vtfCmdPath: typeof body.vtfCmdPath === 'string' ? body.vtfCmdPath.trim() : '',
            ...(rulesPath ? { rulesPath } : {}),
            ...(rulesConfig ? { rulesConfig } : {}),
        }

        if ((!cfg.contentDirs || cfg.contentDirs.length === 0) && !cfg.contentDir) {
            res.status(400).json({ error: 'Не выбрана ни одна папка контента' })
            return
        }

        if (!cfg.rulesPath && !cfg.rulesConfig) {
            res.status(400).json({ error: 'Не заданы правила объединения контента' })
            return
        }

        if (!cfg.outputPath) {
            res.status(400).json({ error: 'Не выбрана выходная папка' })
            return
        }

        const runId = randomUUID()
        const state: RunState = {
            events: [],
            subscribers: new Set(),
            finished: false,
        }

        runs.set(runId, state)
        activeRunId = runId

        runner = runContentPack(cfg, (event) => {
            broadcast(runId, event)
        })

        runner.catch((error) => {
            broadcast(runId, { type: 'error', stage: 'fatal', message: errorMessage(error) })
            broadcast(runId, { type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
        })

        res.json({ runId })
        return
    }

    if (mode === 'content-split') {
        const rawLimitGb = typeof body.splitLimitGb === 'number' && body.splitLimitGb > 0
            ? body.splitLimitGb
            : DEFAULT_SPLIT_LIMIT_BYTES / (1024 * 1024 * 1024)
        const splitCfg: ContentSplitConfig = {
            splitInputPath: typeof body.splitInputPath === 'string' ? body.splitInputPath.trim() : '',
            outputPath: typeof body.outputPath === 'string' ? body.outputPath.trim() : '',
            splitLimitBytes: Math.round(rawLimitGb * 1024 * 1024 * 1024),
            cleanSourceGroups: body.cleanSourceGroups === true,
        }

        if (!splitCfg.splitInputPath) {
            res.status(400).json({ error: 'Не выбрана папка для деления' })
            return
        }

        if (!splitCfg.outputPath) {
            res.status(400).json({ error: 'Не выбрана выходная папка' })
            return
        }

        const runId = randomUUID()
        const state: RunState = {
            events: [],
            subscribers: new Set(),
            finished: false,
        }

        runs.set(runId, state)
        activeRunId = runId

        const runner2 = runContentSplit(splitCfg, (event) => {
            broadcast(runId, event)
        })

        runner2.catch((error) => {
            broadcast(runId, { type: 'error', stage: 'fatal', message: errorMessage(error) })
            broadcast(runId, { type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
        })

        res.json({ runId })
        return
    }

    const contentRoots = parseList(body.contentRoots, DEFAULT_CONTENT_ROOTS)
    const vmfPaths = Array.isArray(body.vmfPaths)
        ? body.vmfPaths.map((vmfPath) => typeof vmfPath === 'string' ? vmfPath.trim() : '').filter(Boolean)
        : DEFAULT_VMF_PATHS
    const cfg: VmfPackConfig = {
        contentRoots,
        vmfPath: typeof body.vmfPath === 'string' ? body.vmfPath.trim() : '',
        vmfPaths,
        outputPath: typeof body.outputPath === 'string' ? body.outputPath.trim() : '',
        cleanOutput: body.cleanOutput === true,
        exts: parseList(body.exts, DEFAULT_EXTS),
        contentKeys: parseList(body.contentKeys, DEFAULT_CONTENT_KEYS),
    }

    if ((!cfg.vmfPaths || cfg.vmfPaths.length === 0) && !cfg.vmfPath) {
        res.status(400).json({ error: 'Не выбран VMF файл' })
        return
    }

    if (!cfg.outputPath) {
        res.status(400).json({ error: 'Не выбрана выходная папка' })
        return
    }

    if (cfg.contentRoots.length === 0) {
        res.status(400).json({ error: 'Не выбрана ни одна папка контента' })
        return
    }

    const runId = randomUUID()
    const state: RunState = {
        events: [],
        subscribers: new Set(),
        finished: false,
    }

    runs.set(runId, state)
    activeRunId = runId

    runner = runFindContent(cfg, (event) => {
        broadcast(runId, event)
    })

    runner.catch((error) => {
        broadcast(runId, { type: 'error', stage: 'fatal', message: errorMessage(error) })
        broadcast(runId, { type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
    })

    res.json({ runId })
})

app.get('/api/events/:runId', (req: Request, res: Response) => {
    const runId = String(req.params.runId ?? '')
    const state = runs.get(runId)

    if (!state) {
        res.status(404).json({ error: 'runId не найден' })
        return
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders?.()

    for (const event of state.events) {
        res.write(`data: ${JSON.stringify(event)}\n\n`)
    }

    if (!state.finished && state.latestProgressEvent?.type === 'progress') {
        res.write(`data: ${JSON.stringify(state.latestProgressEvent)}\n\n`)
    }

    if (state.finished) {
        res.end()
        return
    }

    state.subscribers.add(res)

    req.on('close', () => {
        state.subscribers.delete(res)
    })
})

app.listen(PORT, HOST, () => {
    console.log(`Интерфейс Source Asset Toolkit: http://${HOST}:${PORT}`)
})
