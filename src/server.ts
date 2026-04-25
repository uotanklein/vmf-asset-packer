import express from 'express'
import type { Request, Response } from 'express'
import path from 'path'
import { execFile } from 'child_process'
import { randomUUID } from 'crypto'
import {
    runFindContent,
    DEFAULT_CONTENT_ROOTS,
    DEFAULT_EXTS,
    DEFAULT_CONTENT_KEYS,
    DEFAULT_OUTPUT_PATH,
    DEFAULT_VMF_PATH,
    type RunConfig,
    type RunEvent,
} from './core.js'

const PORT = Number(process.env.PORT ?? 5780)
const HOST = '127.0.0.1'
const RUN_RETENTION_MS = Number(process.env.RUN_RETENTION_MS ?? 15 * 60 * 1000)

type RunState = {
    events: RunEvent[]
    subscribers: Set<Response>
    finished: boolean
    cleanupTimer?: NodeJS.Timeout
}

const runs = new Map<string, RunState>()
let activeRunId: string | null = null

const app = express()
app.use(express.json({ limit: '1mb' }))
app.use(express.static(path.resolve('public')))

function errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    return String(error)
}

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
                    reject(new Error(cleanStderr || `powershell.exe завершился с кодом ${code}`))
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

async function openFileDialog(title: string, currentPath?: string): Promise<string | null> {
    const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = ${psString(title)}
$dialog.Filter = 'VMF files (*.vmf)|*.vmf|All files (*.*)|*.*'
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

function broadcast(runId: string, event: RunEvent) {
    const state = runs.get(runId)
    if (!state) return

    state.events.push(event)
    const payload = `data: ${JSON.stringify(event)}\n\n`

    for (const subscriber of state.subscribers) {
        subscriber.write(payload)
    }

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
        vmfPath: DEFAULT_VMF_PATH,
        outputPath: DEFAULT_OUTPUT_PATH,
        contentRoots: DEFAULT_CONTENT_ROOTS,
        cleanOutput: false,
        exts: DEFAULT_EXTS,
        contentKeys: DEFAULT_CONTENT_KEYS,
    })
})

app.post('/api/pick-file', async (req: Request, res: Response) => {
    try {
        const body = req.body as { title?: unknown; currentPath?: unknown }
        const selectedPath = await openFileDialog(
            typeof body.title === 'string' ? body.title : 'Выбери VMF файл',
            typeof body.currentPath === 'string' ? body.currentPath : undefined,
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
        res.status(409).json({ error: 'Уже идёт другой прогон', activeRunId })
        return
    }

    const body = req.body as Partial<RunConfig> & { contentRoots?: unknown }
    const contentRoots = parseList(body.contentRoots, DEFAULT_CONTENT_ROOTS)
    const vmfPath = typeof body.vmfPath === 'string' ? body.vmfPath.trim() : ''
    const outputPath = typeof body.outputPath === 'string' ? body.outputPath.trim() : ''

    if (!vmfPath) {
        res.status(400).json({ error: 'Не выбран VMF файл' })
        return
    }

    if (!outputPath) {
        res.status(400).json({ error: 'Не выбрана output папка' })
        return
    }

    if (contentRoots.length === 0) {
        res.status(400).json({ error: 'Не выбрана ни одна папка контента' })
        return
    }

    const cfg: RunConfig = {
        contentRoots,
        vmfPath,
        outputPath,
        cleanOutput: body.cleanOutput === true,
        exts: parseList(body.exts, DEFAULT_EXTS),
        contentKeys: parseList(body.contentKeys, DEFAULT_CONTENT_KEYS),
    }

    const runId = randomUUID()
    const state: RunState = {
        events: [],
        subscribers: new Set(),
        finished: false,
    }

    runs.set(runId, state)
    activeRunId = runId

    runFindContent(cfg, (event) => {
        broadcast(runId, event)
    }).catch((error) => {
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
    console.log(`VMF Asset Packer UI: http://${HOST}:${PORT}`)
})
