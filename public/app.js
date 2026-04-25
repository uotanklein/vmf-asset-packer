const $ = (sel) => document.querySelector(sel)

const STORAGE_KEY = 'vmf-content-finder:config'
const MAX_LOG_LINES = 5000

const form = $('#run-form')
const runBtn = $('#run-btn')
const clearBtn = $('#clear-btn')
const statusEl = $('#status')
const pickVmfBtn = $('#pick-vmf-btn')
const pickOutputBtn = $('#pick-output-btn')
const addRootBtn = $('#add-root-btn')
const contentRootsEl = $('#content-roots')

const fill = $('#progress-fill')
const progressText = $('#progress-text')
const progressPercent = $('#progress-percent')
const progressFile = $('#progress-file')

const statProcessed = $('#stat-processed')
const statTotal = $('#stat-total')
const statExecErr = $('#stat-exec-err')
const statCopyErr = $('#stat-copy-err')

const logEl = $('#log')

const filterProgress = $('#filter-progress')
const filterDebug = $('#filter-debug')
const filterWarn = $('#filter-warn')
const filterError = $('#filter-error')

let eventSource = null
let execErrors = 0
let copyErrors = 0
let currentConfig = {
    vmfPath: '',
    outputPath: '',
    cleanOutput: false,
    contentRoots: [],
    exts: [],
    contentKeys: [],
}

function setStatus(text, kind) {
    statusEl.textContent = text
    statusEl.className = 'status' + (kind ? ' ' + kind : '')
}

function pad2(n) {
    return n < 10 ? '0' + n : '' + n
}

function nowTs() {
    const d = new Date()
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function appendLog(kind, tag, msg) {
    const filterMap = {
        progress: filterProgress,
        debug: filterDebug,
        warn: filterWarn,
        error: filterError,
    }

    if (filterMap[kind] && !filterMap[kind].checked) return

    const nearBottom = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 60

    const wrap = document.createElement('div')
    wrap.className = 'log-line ' + kind

    const ts = document.createElement('span')
    ts.className = 'ts'
    ts.textContent = nowTs()

    const tagEl = document.createElement('span')
    tagEl.className = 'tag'
    tagEl.textContent = tag

    const msgEl = document.createElement('span')
    msgEl.className = 'msg'
    msgEl.textContent = msg

    wrap.appendChild(ts)
    wrap.appendChild(tagEl)
    wrap.appendChild(msgEl)
    logEl.appendChild(wrap)

    while (logEl.childElementCount > MAX_LOG_LINES) {
        logEl.firstElementChild?.remove()
    }

    if (nearBottom) {
        logEl.scrollTop = logEl.scrollHeight
    }
}

function resetProgress() {
    fill.style.width = '0%'
    progressText.textContent = '—'
    progressPercent.textContent = '0%'
    progressFile.textContent = ''
    statProcessed.textContent = '0'
    statTotal.textContent = '0'
    statExecErr.textContent = '0'
    statExecErr.classList.add('zero')
    statCopyErr.textContent = '0'
    statCopyErr.classList.add('zero')
    execErrors = 0
    copyErrors = 0
}

function updateProgress(processed, total, file) {
    const pct = total > 0 ? Math.round((processed / total) * 100) : 0
    fill.style.width = pct + '%'
    progressText.textContent = `${processed} / ${total}`
    progressPercent.textContent = pct + '%'
    progressFile.textContent = file ?? ''
    statProcessed.textContent = String(processed)
    statTotal.textContent = String(total)
}

function shorten(value, max = 100) {
    if (!value || value.length <= max) return value ?? ''
    return '...' + value.slice(value.length - max + 3)
}

function parseList(value) {
    return value.split(',').map(x => x.trim()).filter(Boolean)
}

function normalizeRoots(roots) {
    return [...new Set((roots || []).map(x => String(x).trim()).filter(Boolean))]
}

function closeStream() {
    if (eventSource) {
        eventSource.close()
        eventSource = null
    }
}

function saveConfig() {
    const payload = {
        vmfPath: form.vmfPath.value.trim(),
        outputPath: form.outputPath.value.trim(),
        cleanOutput: form.cleanOutput.checked,
        contentRoots: getContentRoots(),
        exts: parseList(form.exts.value),
        contentKeys: parseList(form.contentKeys.value),
    }

    currentConfig = payload
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

function loadStoredConfig() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    } catch {
        return null
    }
}

function createRootRow(rootPath, index) {
    const row = document.createElement('div')
    row.className = 'root-row'
    row.dataset.index = String(index)

    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'root-path'
    input.readOnly = true
    input.value = rootPath
    input.title = rootPath

    const replaceBtn = document.createElement('button')
    replaceBtn.type = 'button'
    replaceBtn.className = 'ghost small-btn'
    replaceBtn.dataset.action = 'replace'
    replaceBtn.textContent = 'Сменить'

    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'
    removeBtn.className = 'ghost small-btn danger-btn'
    removeBtn.dataset.action = 'remove'
    removeBtn.textContent = 'Убрать'

    row.appendChild(input)
    row.appendChild(replaceBtn)
    row.appendChild(removeBtn)
    return row
}

function renderContentRoots(roots) {
    const normalized = normalizeRoots(roots)
    contentRootsEl.innerHTML = ''

    if (normalized.length === 0) {
        const empty = document.createElement('div')
        empty.className = 'root-empty'
        empty.textContent = 'Пока не выбрано ни одной папки контента.'
        contentRootsEl.appendChild(empty)
    } else {
        normalized.forEach((rootPath, index) => {
            contentRootsEl.appendChild(createRootRow(rootPath, index))
        })
    }

    currentConfig.contentRoots = normalized
}

function getContentRoots() {
    return normalizeRoots(
        [...contentRootsEl.querySelectorAll('.root-path')].map(input => input.value),
    )
}

async function callPicker(url, payload) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        throw new Error(data.error || ('HTTP ' + res.status))
    }

    return data.path || null
}

async function chooseVmfPath() {
    try {
        const selectedPath = await callPicker('/api/pick-file', {
            title: 'Выбери VMF файл',
            currentPath: form.vmfPath.value.trim(),
        })

        if (selectedPath) {
            form.vmfPath.value = selectedPath
            saveConfig()
            appendLog('info', '[pick]', 'VMF выбран: ' + shorten(selectedPath, 120))
        }
    } catch (err) {
        appendLog('error', '[pick]', err.message)
    }
}

async function chooseOutputPath() {
    try {
        const selectedPath = await callPicker('/api/pick-folder', {
            title: 'Выбери output папку',
            currentPath: form.outputPath.value.trim(),
        })

        if (selectedPath) {
            form.outputPath.value = selectedPath
            saveConfig()
            appendLog('info', '[pick]', 'Output папка: ' + shorten(selectedPath, 120))
        }
    } catch (err) {
        appendLog('error', '[pick]', err.message)
    }
}

async function addContentRoot(initialPath = '') {
    try {
        const selectedPath = await callPicker('/api/pick-folder', {
            title: 'Выбери папку контента',
            currentPath: initialPath,
        })

        if (!selectedPath) return

        const nextRoots = getContentRoots()
        nextRoots.push(selectedPath)
        renderContentRoots(nextRoots)
        saveConfig()
        appendLog('info', '[pick]', 'Добавлена папка контента: ' + shorten(selectedPath, 120))
    } catch (err) {
        appendLog('error', '[pick]', err.message)
    }
}

function handleEvent(e) {
    switch (e.type) {
        case 'info':
            appendLog('info', '[info]', e.message)
            break

        case 'debug':
            appendLog('debug', e.tag, e.message)
            break

        case 'scanning':
            appendLog('info', '[scan]', 'Парсинг VMF...')
            setStatus('сканирую', 'running')
            break

        case 'scanned':
            appendLog('info', '[scan]', `Найдено файлов: ${e.total}`)
            statTotal.textContent = String(e.total)
            updateProgress(0, e.total, '')
            break

        case 'progress':
            updateProgress(e.processed, e.total, shorten(e.file))
            appendLog('progress', '[ok]', shorten(e.file, 120))
            break

        case 'warn':
            appendLog('warn', '[warn]', e.message)
            break

        case 'error':
            if (e.stage === 'exec') {
                execErrors++
                statExecErr.textContent = String(execErrors)
                statExecErr.classList.remove('zero')
            } else if (e.stage === 'copy') {
                copyErrors++
                statCopyErr.textContent = String(copyErrors)
                statCopyErr.classList.remove('zero')
            }

            appendLog(
                'error',
                `[${e.stage}]`,
                (e.file ? shorten(e.file, 80) + ' — ' : '') + e.message,
            )
            break

        case 'done': {
            const hasErrors = e.execErrors + e.copyErrors > 0
            appendLog('done', '[done]', `Готово. exec=${e.execErrors}, copy=${e.copyErrors}`)
            setStatus(hasErrors ? 'завершено с ошибками' : 'успех', hasErrors ? 'error' : 'done')
            runBtn.disabled = false
            runBtn.textContent = 'Запустить'
            closeStream()
            break
        }
    }
}

async function loadDefaults() {
    try {
        const res = await fetch('/api/defaults')
        const data = await res.json()
        const stored = loadStoredConfig()

        const initialConfig = {
            vmfPath: stored?.vmfPath || data.vmfPath || '',
            outputPath: stored?.outputPath || data.outputPath || '',
            cleanOutput: typeof stored?.cleanOutput === 'boolean' ? stored.cleanOutput : Boolean(data.cleanOutput),
            contentRoots: normalizeRoots(stored?.contentRoots || data.contentRoots || []),
            exts: stored?.exts?.length ? stored.exts : (data.exts || []),
            contentKeys: stored?.contentKeys?.length ? stored.contentKeys : (data.contentKeys || []),
        }

        form.vmfPath.value = initialConfig.vmfPath
        form.outputPath.value = initialConfig.outputPath
        form.cleanOutput.checked = initialConfig.cleanOutput
        form.exts.value = initialConfig.exts.join(', ')
        form.contentKeys.value = initialConfig.contentKeys.join(', ')
        renderContentRoots(initialConfig.contentRoots)
        saveConfig()
    } catch (err) {
        appendLog('error', '[fetch]', 'Не удалось загрузить дефолты: ' + err.message)
    }
}

pickVmfBtn.addEventListener('click', chooseVmfPath)
pickOutputBtn.addEventListener('click', chooseOutputPath)
addRootBtn.addEventListener('click', () => addContentRoot())

contentRootsEl.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button[data-action]')
    if (!btn) return

    const row = btn.closest('.root-row')
    if (!row) return

    const index = Number(row.dataset.index)
    const roots = getContentRoots()

    if (btn.dataset.action === 'remove') {
        roots.splice(index, 1)
        renderContentRoots(roots)
        saveConfig()
        return
    }

    if (btn.dataset.action === 'replace') {
        const currentPath = roots[index] || ''
        try {
            const selectedPath = await callPicker('/api/pick-folder', {
                title: 'Смени папку контента',
                currentPath,
            })

            if (!selectedPath) return

            roots[index] = selectedPath
            renderContentRoots(roots)
            saveConfig()
        } catch (err) {
            appendLog('error', '[pick]', err.message)
        }
    }
})

form.exts.addEventListener('change', saveConfig)
form.contentKeys.addEventListener('change', saveConfig)
form.cleanOutput.addEventListener('change', saveConfig)

form.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    if (eventSource) return

    const cfg = {
        vmfPath: form.vmfPath.value.trim(),
        outputPath: form.outputPath.value.trim(),
        cleanOutput: form.cleanOutput.checked,
        contentRoots: getContentRoots(),
        exts: parseList(form.exts.value),
        contentKeys: parseList(form.contentKeys.value),
    }

    if (!cfg.vmfPath) {
        appendLog('error', '[form]', 'Выбери VMF файл перед запуском.')
        return
    }

    if (!cfg.outputPath) {
        appendLog('error', '[form]', 'Выбери output папку перед запуском.')
        return
    }

    if (cfg.contentRoots.length === 0) {
        appendLog('error', '[form]', 'Добавь хотя бы одну папку контента.')
        return
    }

    resetProgress()
    saveConfig()
    runBtn.disabled = true
    runBtn.textContent = 'Запущено...'
    setStatus('запуск...', 'running')
    appendLog('info', '[run]', `Стартую прогон по ${cfg.contentRoots.length} папк(ам) контента...`)

    let runId
    try {
        const res = await fetch('/api/run', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(cfg),
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'HTTP ' + res.status }))
            appendLog('error', '[http]', err.error || ('HTTP ' + res.status))
            setStatus('ошибка', 'error')
            runBtn.disabled = false
            runBtn.textContent = 'Запустить'
            return
        }

        runId = (await res.json()).runId
    } catch (err) {
        appendLog('error', '[http]', err.message)
        setStatus('ошибка', 'error')
        runBtn.disabled = false
        runBtn.textContent = 'Запустить'
        return
    }

    eventSource = new EventSource('/api/events/' + encodeURIComponent(runId))
    eventSource.onmessage = (messageEvent) => {
        try {
            handleEvent(JSON.parse(messageEvent.data))
        } catch (err) {
            appendLog('error', '[sse]', 'parse: ' + err.message)
        }
    }
    eventSource.onerror = () => {
        if (eventSource && eventSource.readyState === EventSource.CLOSED) {
            closeStream()
            runBtn.disabled = false
            runBtn.textContent = 'Запустить'
        }
    }
})

clearBtn.addEventListener('click', () => {
    logEl.innerHTML = ''
    if (!eventSource) {
        resetProgress()
        setStatus('готов')
    }
})

loadDefaults()
