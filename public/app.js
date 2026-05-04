const $ = (sel) => document.querySelector(sel)

const STORAGE_KEY = 'source-asset-toolkit:config'
const MAX_LOG_LINES = 5000
const PROGRESS_RENDER_INTERVAL_MS = 120
const PROGRESS_LOG_INTERVAL_MS = 1000

const form = $('#run-form')
const runBtn = $('#run-btn')
const clearBtn = $('#clear-btn')
const statusEl = $('#status')
const modeSelect = $('#mode-select')
const modePanels = [...document.querySelectorAll('[data-mode-panel]')]

const addVmfBtn = $('#add-vmf-btn')
const pickOutputBtn = $('#pick-output-btn')
const addRootBtn = $('#add-root-btn')
const addContentDirBtn = $('#add-content-dir-btn')
const pickFfmpegBtn = $('#pick-ffmpeg-btn')
const pickVtfCmdBtn = $('#pick-vtfcmd-btn')
const pickSplitInputBtn = $('#pick-split-input-btn')
const addExcludeBtn = $('#add-exclude-btn')
const addGroupBtn = $('#add-group-btn')
const addRuleBtn = $('#add-rule-btn')

const vmfPathsEl = $('#vmf-paths')
const contentRootsEl = $('#content-roots')
const contentPackDirsEl = $('#content-pack-dirs')
const excludePathsEl = $('#exclude-paths')
const groupListEl = $('#group-list')
const ruleListEl = $('#rule-list')
const unmatchedEditorEl = $('#unmatched-editor')

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
let dragArm = null
let dragState = null
let dragAutoScrollY = null
let dragAutoScrollContainer = null
let dragAutoScrollFrame = 0
let pendingProgressEvent = null
let progressRenderTimer = 0
let lastProgressRenderAt = 0
let lastProgressLogAt = 0
let modeDefaultOutputPaths = {
    'vmf-pack': '',
    'content-pack': '',
    'content-split': '',
}
let currentConfig = {
    mode: 'vmf-pack',
    vmfPath: '',
    vmfPaths: [],
    outputPath: '',
    cleanOutput: false,
    contentRoots: [],
    contentDirs: [],
    exts: [],
    contentKeys: [],
    rulesConfig: createEmptyRulesConfig(),
    compressSounds: false,
    compressVtf: false,
    excludePaths: [],
    ffmpegPath: '',
    vtfCmdPath: '',
    splitInputPath: '',
    splitLimitGb: 2,
    cleanSourceGroups: true,
}

function createEmptyRulesConfig() {
    return {
        groups: [],
        rules: [],
        unmatched: { action: 'skip' },
    }
}

function isGeneratedPlaceholderGroup(group, index) {
    const groupIndex = index + 1
    const id = `group_${groupIndex}`
    return group.id === id && group.folder === `${String(groupIndex).padStart(2, '0')}_${id}` && !group.displayName
}

function mergeRulesConfigWithDefaults(storedValue, defaultValue) {
    const defaults = normalizeRulesConfig(defaultValue)
    const stored = normalizeRulesConfig(storedValue)
    const storedSource = isPlainObject(storedValue) ? storedValue : null

    const shouldUseDefaultGroups = defaults.groups.length > 0 && (
        stored.groups.length === 0
        || stored.groups.every((group, index) => isGeneratedPlaceholderGroup(group, index))
    )
    const shouldUseDefaultRules = defaults.rules.length > 0 && stored.rules.length === 0 && shouldUseDefaultGroups

    return normalizeRulesConfig({
        groups: shouldUseDefaultGroups ? defaults.groups : stored.groups,
        rules: shouldUseDefaultRules ? defaults.rules : stored.rules,
        unmatched: storedSource && Object.prototype.hasOwnProperty.call(storedSource, 'unmatched')
            ? stored.unmatched
            : defaults.unmatched,
    })
}

function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
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
    clearPendingProgressState()
    fill.style.width = '0%'
    progressText.textContent = '-'
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

function clearPendingProgressState() {
    pendingProgressEvent = null
    lastProgressRenderAt = 0
    lastProgressLogAt = 0

    if (progressRenderTimer) {
        clearTimeout(progressRenderTimer)
        progressRenderTimer = 0
    }
}

function renderProgressEvent(event, shouldLog) {
    updateProgress(event.processed, event.total, shorten(event.file))

    if (shouldLog) {
        appendLog('progress', '[ok]', `${event.processed}/${event.total} · ${shorten(event.file, 120)}`)
        lastProgressLogAt = Date.now()
    }

    lastProgressRenderAt = Date.now()
}

function flushPendingProgress(forceLog = false) {
    if (progressRenderTimer) {
        clearTimeout(progressRenderTimer)
        progressRenderTimer = 0
    }

    const event = pendingProgressEvent
    if (!event) return

    pendingProgressEvent = null

    const now = Date.now()
    const shouldLog = forceLog
        || event.processed === event.total
        || lastProgressLogAt === 0
        || now - lastProgressLogAt >= PROGRESS_LOG_INTERVAL_MS

    renderProgressEvent(event, shouldLog)
}

function scheduleProgressEvent(event) {
    pendingProgressEvent = event

    const now = Date.now()
    const sinceLastRender = now - lastProgressRenderAt
    if (lastProgressRenderAt === 0 || sinceLastRender >= PROGRESS_RENDER_INTERVAL_MS) {
        flushPendingProgress()
        return
    }

    if (!progressRenderTimer) {
        progressRenderTimer = setTimeout(() => {
            flushPendingProgress()
        }, PROGRESS_RENDER_INTERVAL_MS - sinceLastRender)
    }
}

function shorten(value, max = 100) {
    if (!value || value.length <= max) return value ?? ''
    return '...' + value.slice(value.length - max + 3)
}

function parseList(value) {
    return String(value || '').split(',').map(x => x.trim()).filter(Boolean)
}

function parseIntegerLoose(value, fallback = 0) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.trunc(value)
    }

    const parsed = Number.parseInt(String(value ?? '').trim(), 10)
    return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeRoots(roots) {
    return [...new Set((roots || []).map(x => String(x).trim()).filter(Boolean))]
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function closeStream() {
    flushPendingProgress(true)
    if (eventSource) {
        eventSource.close()
        eventSource = null
    }
}

function createDefaultGroup(index) {
    const groupIndex = Math.max(1, index)
    const id = `group_${groupIndex}`
    return {
        id,
        folder: `${String(groupIndex).padStart(2, '0')}_${id}`,
        displayName: '',
    }
}

function createDefaultRule(groupId = '') {
    return {
        match: {
            addonName: '',
            addonNamePattern: '',
        },
        action: 'pack',
        ...(groupId ? { groupId } : {}),
        priority: 0,
    }
}

function normalizeRulesConfig(value) {
    const source = isPlainObject(value) ? value : {}
    const rawGroups = Array.isArray(source.groups) ? source.groups : []
    const rawRules = Array.isArray(source.rules) ? source.rules : []
    const rawUnmatched = isPlainObject(source.unmatched) ? source.unmatched : { action: 'skip' }

    const groups = rawGroups.map((group) => {
        const raw = isPlainObject(group) ? group : {}
        const displayName = typeof raw.displayName === 'string' ? raw.displayName.trim() : ''

        return {
            id: typeof raw.id === 'string' ? raw.id.trim() : '',
            folder: typeof raw.folder === 'string' ? raw.folder.trim() : '',
            ...(displayName ? { displayName } : {}),
        }
    })

    const rules = rawRules.map((rule) => {
        const raw = isPlainObject(rule) ? rule : {}
        const match = isPlainObject(raw.match) ? raw.match : {}
        const addonName = typeof match.addonName === 'string' ? match.addonName.trim() : ''
        const addonNamePattern = typeof match.addonNamePattern === 'string' ? match.addonNamePattern.trim() : ''
        const groupId = typeof raw.groupId === 'string' ? raw.groupId.trim() : ''

        return {
            match: {
                ...(addonName ? { addonName } : {}),
                ...(addonNamePattern ? { addonNamePattern } : {}),
            },
            action: raw.action === 'skip' ? 'skip' : 'pack',
            ...(groupId ? { groupId } : {}),
            priority: parseIntegerLoose(raw.priority, 0),
        }
    })

    const unmatched = rawUnmatched.action === 'pack'
        ? {
            action: 'pack',
            groupId: typeof rawUnmatched.groupId === 'string' ? rawUnmatched.groupId.trim() : '',
            priority: parseIntegerLoose(rawUnmatched.priority, 0),
        }
        : { action: 'skip' }

    return { groups, rules, unmatched }
}

function getGroupLabel(group) {
    const id = group.id || 'без-id'
    const display = group.displayName ? `${group.displayName} · ${id}` : id
    const folder = group.folder || 'без-папки'
    return `${display} -> ${folder}`
}

function buildGroupOptions(groups, selectedValue, placeholder) {
    const options = [`<option value="">${escapeHtml(placeholder)}</option>`]

    for (const group of groups) {
        const isSelected = group.id === selectedValue ? ' selected' : ''
        options.push(`<option value="${escapeHtml(group.id)}"${isSelected}>${escapeHtml(getGroupLabel(group))}</option>`)
    }

    return options.join('')
}

function getDragHandleLabel(kind) {
    return kind === 'group'
        ? 'Перетащи, чтобы изменить порядок групп'
        : 'Перетащи, чтобы изменить порядок правил'
}

function renderDragHandle(kind) {
    const label = getDragHandleLabel(kind)
    return `
        <button type="button" class="drag-handle" data-drag-handle title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">
            <span aria-hidden="true">⋮⋮</span>
        </button>
    `
}

function renderGroups() {
    const groups = currentConfig.rulesConfig.groups

    if (!groups.length) {
        groupListEl.innerHTML = '<div class="editor-empty">Пока не добавлено ни одной группы вывода.</div>'
        return
    }

    groupListEl.innerHTML = groups.map((group, index) => `
        <div class="editor-card" data-kind="group" data-index="${index}" draggable="true">
            <div class="editor-card-head">
                <div class="editor-card-title">Группа ${index + 1}</div>
                <div class="editor-card-tools">
                    ${renderDragHandle('group')}
                    <div class="mini-actions">
                    <button type="button" class="ghost small-btn danger-btn" data-action="remove">Удалить</button>
                    </div>
                </div>
            </div>
            <div class="editor-grid editor-grid-3">
                <label class="field compact">
                    <span>ID группы</span>
                    <input type="text" data-field="id" value="${escapeHtml(group.id)}" spellcheck="false" placeholder="core">
                </label>
                <label class="field compact">
                    <span>Папка в output</span>
                    <input type="text" data-field="folder" value="${escapeHtml(group.folder)}" spellcheck="false" placeholder="01_core">
                </label>
                <label class="field compact">
                    <span>Отображаемое имя</span>
                    <input type="text" data-field="displayName" value="${escapeHtml(group.displayName || '')}" spellcheck="false" placeholder="Основное">
                </label>
            </div>
        </div>
    `).join('')
}

function renderRules() {
    const rules = currentConfig.rulesConfig.rules
    const groups = currentConfig.rulesConfig.groups

    if (!rules.length) {
        ruleListEl.innerHTML = '<div class="editor-empty">Пока не добавлено ни одного правила сопоставления.</div>'
        return
    }

    ruleListEl.innerHTML = rules.map((rule, index) => {
        const addonName = rule.match?.addonName || ''
        const addonNamePattern = rule.match?.addonNamePattern || ''
        const action = rule.action === 'skip' ? 'skip' : 'pack'
        const groupId = rule.groupId || ''
        const priority = Number.isFinite(rule.priority) ? rule.priority : 0

        return `
            <div class="editor-card" data-kind="rule" data-index="${index}" draggable="true">
                <div class="editor-card-head">
                    <div class="editor-card-title">Правило ${index + 1}</div>
                    <div class="editor-card-tools">
                        ${renderDragHandle('rule')}
                        <div class="mini-actions">
                        <button type="button" class="ghost small-btn danger-btn" data-action="remove">Удалить</button>
                        </div>
                    </div>
                </div>
                <div class="editor-grid editor-grid-rule">
                    <label class="field compact">
                        <span>Точное имя аддона</span>
                        <input type="text" data-field="addonName" value="${escapeHtml(addonName)}" spellcheck="false" placeholder="my_addon_123">
                    </label>
                    <label class="field compact">
                        <span>Regex-паттерн</span>
                        <input type="text" data-field="addonNamePattern" value="${escapeHtml(addonNamePattern)}" spellcheck="false" placeholder="^optional_">
                    </label>
                    <label class="field compact">
                        <span>Действие</span>
                        <select data-field="action">
                            <option value="pack"${action === 'pack' ? ' selected' : ''}>Упаковать</option>
                            <option value="skip"${action === 'skip' ? ' selected' : ''}>Пропустить</option>
                        </select>
                    </label>
                    <label class="field compact">
                        <span>Группа</span>
                        <select data-field="groupId" ${action === 'skip' ? 'disabled' : ''}>
                            ${buildGroupOptions(groups, groupId, action === 'skip' ? 'Не используется' : 'Выбери группу')}
                        </select>
                    </label>
                    <label class="field compact">
                        <span>Приоритет</span>
                        <input type="number" data-field="priority" value="${escapeHtml(priority)}" placeholder="0">
                    </label>
                </div>
            </div>
        `
    }).join('')
}

function renderUnmatchedControls() {
    const groups = currentConfig.rulesConfig.groups
    const unmatched = currentConfig.rulesConfig.unmatched || { action: 'skip' }
    const action = unmatched.action === 'pack' ? 'pack' : 'skip'
    const groupId = action === 'pack' ? (unmatched.groupId || '') : ''
    const priority = action === 'pack' && Number.isFinite(unmatched.priority) ? unmatched.priority : 0

    unmatchedEditorEl.innerHTML = `
        <div class="editor-card">
            <div class="editor-grid editor-grid-3">
                <label class="field compact">
                    <span>Действие</span>
                    <select name="unmatchedAction">
                        <option value="skip"${action === 'skip' ? ' selected' : ''}>Пропускать</option>
                        <option value="pack"${action === 'pack' ? ' selected' : ''}>Упаковывать</option>
                    </select>
                </label>
                <label class="field compact">
                    <span>Группа</span>
                    <select name="unmatchedGroupId" ${action === 'skip' ? 'disabled' : ''}>
                        ${buildGroupOptions(groups, groupId, action === 'skip' ? 'Не используется' : 'Выбери группу')}
                    </select>
                </label>
                <label class="field compact">
                    <span>Приоритет</span>
                    <input name="unmatchedPriority" type="number" value="${escapeHtml(priority)}" placeholder="0" ${action === 'skip' ? 'disabled' : ''}>
                </label>
            </div>
        </div>
    `
}

function renderRulesConfig() {
    renderGroups()
    renderRules()
    renderUnmatchedControls()
}

function reorderItem(list, fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) {
        return
    }

    const [item] = list.splice(fromIndex, 1)
    list.splice(toIndex, 0, item)
}

function clearDragMarkers() {
    for (const card of document.querySelectorAll('.editor-card.dragging, .editor-card.drop-before, .editor-card.drop-after')) {
        card.classList.remove('dragging', 'drop-before', 'drop-after')
    }
}

function stopDragAutoScroll() {
    dragAutoScrollY = null
    dragAutoScrollContainer = null
    if (dragAutoScrollFrame) {
        cancelAnimationFrame(dragAutoScrollFrame)
        dragAutoScrollFrame = 0
    }
}

function getAutoScrollDelta(pointer, start, end, threshold, maxStep) {
    if (pointer < start + threshold) {
        const intensity = 1 - ((pointer - start) / threshold)
        return -Math.max(4, Math.round(maxStep * intensity))
    }

    if (pointer > end - threshold) {
        const intensity = 1 - ((end - pointer) / threshold)
        return Math.max(4, Math.round(maxStep * intensity))
    }

    return 0
}

function runDragAutoScroll() {
    if (!dragState || dragAutoScrollY == null) {
        dragAutoScrollFrame = 0
        return
    }

    const threshold = 72
    const maxStep = 22
    let scrolledContainer = false

    if (dragAutoScrollContainer) {
        const bounds = dragAutoScrollContainer.getBoundingClientRect()
        const containerDelta = getAutoScrollDelta(
            dragAutoScrollY,
            bounds.top,
            bounds.bottom,
            Math.min(threshold, Math.max(36, bounds.height * 0.25)),
            maxStep,
        )

        if (containerDelta !== 0) {
            const previousScrollTop = dragAutoScrollContainer.scrollTop
            dragAutoScrollContainer.scrollTop += containerDelta
            scrolledContainer = dragAutoScrollContainer.scrollTop !== previousScrollTop
        }
    }

    if (!scrolledContainer) {
        const windowDelta = getAutoScrollDelta(
            dragAutoScrollY,
            0,
            window.innerHeight,
            threshold,
            maxStep,
        )

        if (windowDelta !== 0) {
            window.scrollBy(0, windowDelta)
        }
    }

    dragAutoScrollFrame = requestAnimationFrame(runDragAutoScroll)
}

function updateDragAutoScroll(clientY, scrollContainer = null) {
    dragAutoScrollY = clientY
    dragAutoScrollContainer = scrollContainer
    if (!dragAutoScrollFrame) {
        dragAutoScrollFrame = requestAnimationFrame(runDragAutoScroll)
    }
}

function resetDragState() {
    dragArm = null
    dragState = null
    stopDragAutoScroll()
    clearDragMarkers()
}

function getDropTarget(card, fromIndex, clientY) {
    const targetIndex = Number(card.dataset.index)
    if (!Number.isFinite(targetIndex)) return null

    const bounds = card.getBoundingClientRect()
    const insertAfter = clientY >= bounds.top + bounds.height / 2
    const insertionIndex = insertAfter ? targetIndex + 1 : targetIndex
    const nextIndex = insertionIndex > fromIndex ? insertionIndex - 1 : insertionIndex

    if (nextIndex === fromIndex) return null

    return { targetIndex, insertAfter, nextIndex }
}

function handleListDragStart(ev, kind) {
    const card = ev.target.closest(`.editor-card[data-kind="${kind}"]`)
    if (!card) return

    if (!dragArm || dragArm.kind !== kind || dragArm.card !== card) {
        ev.preventDefault()
        return
    }

    const fromIndex = Number(card.dataset.index)
    if (!Number.isFinite(fromIndex)) {
        ev.preventDefault()
        return
    }

    dragState = {
        kind,
        fromIndex,
        targetIndex: null,
        insertAfter: false,
        nextIndex: null,
    }

    ev.dataTransfer.effectAllowed = 'move'
    ev.dataTransfer.setData('text/plain', `${kind}:${fromIndex}`)
    requestAnimationFrame(() => {
        card.classList.add('dragging')
    })
}

function handleListDragOver(ev, container, kind) {
    if (!dragState || dragState.kind !== kind) return

    const card = ev.target.closest(`.editor-card[data-kind="${kind}"]`)
    const scrollContainer = container.closest('.editor-scroll')
    ev.preventDefault()
    ev.dataTransfer.dropEffect = 'move'
    updateDragAutoScroll(ev.clientY, scrollContainer)

    if (!card || !container.contains(card)) return

    const dropTarget = getDropTarget(card, dragState.fromIndex, ev.clientY)

    clearDragMarkers()
    const draggingCard = container.querySelector(`.editor-card[data-kind="${kind}"][data-index="${dragState.fromIndex}"]`)
    draggingCard?.classList.add('dragging')

    if (!dropTarget) {
        dragState.targetIndex = null
        dragState.nextIndex = null
        return
    }

    dragState.targetIndex = dropTarget.targetIndex
    dragState.insertAfter = dropTarget.insertAfter
    dragState.nextIndex = dropTarget.nextIndex
    card.classList.add(dropTarget.insertAfter ? 'drop-after' : 'drop-before')
}

function handleListDrop(ev, listName) {
    if (!dragState || !Number.isFinite(dragState.nextIndex)) return

    ev.preventDefault()
    const { fromIndex, nextIndex } = dragState
    updateRulesConfig((rulesConfig) => {
        reorderItem(rulesConfig[listName], fromIndex, nextIndex)
    })
    resetDragState()
}

function attachReorderableList(container, kind, listName) {
    container.addEventListener('pointerdown', (ev) => {
        const handle = ev.target.closest('[data-drag-handle]')
        if (!handle) return

        const card = handle.closest(`.editor-card[data-kind="${kind}"]`)
        if (!card || !container.contains(card)) return

        dragArm = { kind, card }
    })

    container.addEventListener('pointerup', () => {
        if (dragState) return
        dragArm = null
    })

    container.addEventListener('pointercancel', () => {
        if (dragState) return
        dragArm = null
    })

    container.addEventListener('dragstart', (ev) => {
        handleListDragStart(ev, kind)
    })

    container.addEventListener('dragover', (ev) => {
        handleListDragOver(ev, container, kind)
    })

    container.addEventListener('drop', (ev) => {
        handleListDrop(ev, listName)
    })

    container.addEventListener('dragend', () => {
        resetDragState()
    })

    container.addEventListener('drag', (ev) => {
        if (!dragState || dragState.kind !== kind) return
        if (!Number.isFinite(ev.clientY) || ev.clientY <= 0) return

        const scrollContainer = container.closest('.editor-scroll')
        updateDragAutoScroll(ev.clientY, scrollContainer)
    })

    container.addEventListener('dragleave', (ev) => {
        if (!dragState || dragState.kind !== kind) return
        if (container.contains(ev.relatedTarget)) return

        clearDragMarkers()
        const draggingCard = container.querySelector(`.editor-card[data-kind="${kind}"][data-index="${dragState.fromIndex}"]`)
        draggingCard?.classList.add('dragging')
    })
}

function getRootValues(container) {
    return normalizeRoots(
        [...container.querySelectorAll('.root-path')].map(input => input.value),
    )
}

function getVmfPaths() {
    return getRootValues(vmfPathsEl)
}

function getContentRoots() {
    return getRootValues(contentRootsEl)
}

function getContentPackDirs() {
    return normalizeRoots(
        [...contentPackDirsEl.querySelectorAll('.root-path')].map(input => input.value),
    )
}

function readGroupsFromUi() {
    return [...groupListEl.querySelectorAll('.editor-card[data-kind="group"]')].map((card) => {
        const id = card.querySelector('[data-field="id"]')?.value.trim() || ''
        const folder = card.querySelector('[data-field="folder"]')?.value.trim() || ''
        const displayName = card.querySelector('[data-field="displayName"]')?.value.trim() || ''

        return {
            id,
            folder,
            ...(displayName ? { displayName } : {}),
        }
    })
}

function readRulesFromUi() {
    return [...ruleListEl.querySelectorAll('.editor-card[data-kind="rule"]')].map((card) => {
        const addonName = card.querySelector('[data-field="addonName"]')?.value.trim() || ''
        const addonNamePattern = card.querySelector('[data-field="addonNamePattern"]')?.value.trim() || ''
        const action = card.querySelector('[data-field="action"]')?.value === 'skip' ? 'skip' : 'pack'
        const groupId = card.querySelector('[data-field="groupId"]')?.value.trim() || ''
        const priority = parseIntegerLoose(card.querySelector('[data-field="priority"]')?.value, 0)

        return {
            match: {
                ...(addonName ? { addonName } : {}),
                ...(addonNamePattern ? { addonNamePattern } : {}),
            },
            action,
            ...(groupId ? { groupId } : {}),
            priority,
        }
    })
}

function readUnmatchedFromUi() {
    const actionValue = unmatchedEditorEl.querySelector('[name="unmatchedAction"]')?.value
    if (actionValue !== 'pack') {
        return { action: 'skip' }
    }

    const groupId = unmatchedEditorEl.querySelector('[name="unmatchedGroupId"]')?.value.trim() || ''
    const priority = parseIntegerLoose(unmatchedEditorEl.querySelector('[name="unmatchedPriority"]')?.value, 0)

    return {
        action: 'pack',
        groupId,
        priority,
    }
}

function readRulesConfigFromUi() {
    return normalizeRulesConfig({
        groups: readGroupsFromUi(),
        rules: readRulesFromUi(),
        unmatched: readUnmatchedFromUi(),
    })
}

function readFormConfig() {
    const splitLimitGb = parseFloat(form.splitLimitGb.value)
    const vmfPaths = getVmfPaths()
    return {
        mode: modeSelect.value,
        vmfPath: vmfPaths[0] || '',
        vmfPaths,
        outputPath: form.outputPath.value.trim(),
        cleanOutput: form.cleanOutput.checked,
        contentRoots: getContentRoots(),
        contentDirs: getContentPackDirs(),
        exts: parseList(form.exts.value),
        contentKeys: parseList(form.contentKeys.value),
        rulesConfig: readRulesConfigFromUi(),
        compressSounds: form.compressSounds.checked,
        compressVtf: form.compressVtf.checked,
        excludePaths: getExcludePaths(),
        ffmpegPath: form.ffmpegPath.value.trim(),
        vtfCmdPath: form.vtfCmdPath.value.trim(),
        splitInputPath: form.splitInputPath.value.trim(),
        splitLimitGb: Number.isFinite(splitLimitGb) && splitLimitGb > 0 ? splitLimitGb : 2,
        cleanSourceGroups: form.cleanSourceGroups.checked,
    }
}

function saveConfig() {
    const payload = readFormConfig()
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
    replaceBtn.textContent = 'Изменить'

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

function renderRootList(container, paths, emptyText) {
    const normalized = normalizeRoots(paths)
    container.innerHTML = ''

    if (normalized.length === 0) {
        const empty = document.createElement('div')
        empty.className = 'root-empty'
        empty.textContent = emptyText
        container.appendChild(empty)
        return normalized
    }

    normalized.forEach((rootPath, index) => {
        container.appendChild(createRootRow(rootPath, index))
    })

    return normalized
}

function renderVmfPaths(paths) {
    const normalized = renderRootList(vmfPathsEl, paths, 'Пока не выбрано ни одного VMF файла.')
    currentConfig.vmfPaths = normalized
    currentConfig.vmfPath = normalized[0] || ''
}

function renderContentRoots(roots) {
    const normalized = renderRootList(contentRootsEl, roots, 'Пока не выбрано ни одной папки контента.')
    currentConfig.contentRoots = normalized
}

function renderContentPackDirs(dirs) {
    const normalized = renderRootList(contentPackDirsEl, dirs, 'Пока не выбрано ни одной папки контента для объединения.')
    currentConfig.contentDirs = normalized
}

function getExcludePaths() {
    return normalizeRoots(
        [...excludePathsEl.querySelectorAll('.root-path')].map(input => input.value),
    )
}

function renderExcludePaths(paths) {
    const normalized = renderRootList(excludePathsEl, paths, 'Нет папок в исключениях.')
    currentConfig.excludePaths = normalized
}

function getDefaultOutputPathForMode(mode) {
    return modeDefaultOutputPaths[mode] || ''
}

function getDefaultContentPackDirs(data) {
    if (!Array.isArray(data?.contentPack?.contentDirs)) {
        return []
    }

    return normalizeRoots(data.contentPack.contentDirs)
}

function getDefaultVmfPaths(data) {
    if (Array.isArray(data?.vmfPack?.vmfPaths)) {
        return normalizeRoots(data.vmfPack.vmfPaths)
    }

    if (typeof data?.vmfPack?.vmfPath === 'string' && data.vmfPack.vmfPath.trim()) {
        return normalizeRoots([data.vmfPack.vmfPath])
    }

    return []
}

function shouldAdoptModeDefaultPath(currentPath, previousMode) {
    const trimmedCurrentPath = String(currentPath || '').trim()
    if (!trimmedCurrentPath) return true

    const previousDefaultPath = previousMode ? getDefaultOutputPathForMode(previousMode) : ''
    if (previousDefaultPath && trimmedCurrentPath === previousDefaultPath) {
        return true
    }

    return Object.values(modeDefaultOutputPaths).includes(trimmedCurrentPath)
}

function buildLegacyPathMap(data) {
    const sourceAddonsPath = data.contentPack?.contentDirs?.[0] || data.contentPack?.contentDir || ''
    const workspaceRoot = sourceAddonsPath.replace(/[\\/]04_addons_source$/i, '')
    if (!workspaceRoot || workspaceRoot === sourceAddonsPath) {
        return null
    }

    const projectRoot = workspaceRoot.replace(/[\\/]workspace$/i, '')
    if (!projectRoot || projectRoot === workspaceRoot) {
        return null
    }

    return {
        oldVmfMapsDir: `${projectRoot}\\maps`,
        newVmfMapsDir: `${workspaceRoot}\\01_vmf_maps`,
        oldVmfContentRootDir: `${projectRoot}\\content`,
        newVmfContentRootDir: data.vmfPack?.contentRoots?.[0] || '',
        oldAddonsSourceDir: `${projectRoot}\\output\\content`,
        newAddonsSourceDir: data.contentPack?.contentDirs?.[0] || data.contentPack?.contentDir || '',
        oldMergedAddonsDir: `${projectRoot}\\output\\result`,
        newMergedAddonsDir: data.contentPack?.outputPath || '',
        oldSplitContentDir: `${projectRoot}\\output\\result2`,
        newSplitContentDir: data.contentSplit?.outputPath || '',
    }
}

function replacePathPrefix(value, oldPrefix, newPrefix) {
    if (!value || !oldPrefix || !newPrefix) return value

    const normalizedValue = String(value).replace(/\//g, '\\')
    const normalizedOldPrefix = String(oldPrefix).replace(/\//g, '\\')
    const normalizedNewPrefix = String(newPrefix).replace(/\//g, '\\')

    if (normalizedValue.toLowerCase() === normalizedOldPrefix.toLowerCase()) {
        return normalizedNewPrefix
    }

    if (normalizedValue.toLowerCase().startsWith((normalizedOldPrefix + '\\').toLowerCase())) {
        return normalizedNewPrefix + normalizedValue.slice(normalizedOldPrefix.length)
    }

    return value
}

function migrateStoredPaths(stored, data) {
    if (!stored || typeof stored !== 'object') return stored

    const legacyPathMap = buildLegacyPathMap(data)
    if (!legacyPathMap) return stored

    const migrated = { ...stored }

    if (Array.isArray(stored.contentRoots)) {
        migrated.contentRoots = stored.contentRoots.map((root) =>
            replacePathPrefix(root, legacyPathMap.oldVmfContentRootDir, legacyPathMap.newVmfContentRootDir),
        )
    }

    if (typeof stored.vmfPath === 'string') {
        migrated.vmfPath = replacePathPrefix(stored.vmfPath, legacyPathMap.oldVmfMapsDir, legacyPathMap.newVmfMapsDir)
    }

    if (Array.isArray(stored.vmfPaths)) {
        migrated.vmfPaths = stored.vmfPaths.map((vmfPath) =>
            replacePathPrefix(vmfPath, legacyPathMap.oldVmfMapsDir, legacyPathMap.newVmfMapsDir),
        )
    }

    if (typeof stored.contentDir === 'string') {
        migrated.contentDir = replacePathPrefix(stored.contentDir, legacyPathMap.oldAddonsSourceDir, legacyPathMap.newAddonsSourceDir)
    }

    if (Array.isArray(stored.contentDirs)) {
        migrated.contentDirs = stored.contentDirs.map((dir) =>
            replacePathPrefix(dir, legacyPathMap.oldAddonsSourceDir, legacyPathMap.newAddonsSourceDir),
        )
    }

    if (typeof stored.splitInputPath === 'string') {
        migrated.splitInputPath = replacePathPrefix(stored.splitInputPath, legacyPathMap.oldMergedAddonsDir, legacyPathMap.newMergedAddonsDir)
    }

    if (typeof stored.outputPath === 'string') {
        let nextOutputPath = stored.outputPath
        nextOutputPath = replacePathPrefix(nextOutputPath, legacyPathMap.oldVmfContentRootDir, legacyPathMap.newVmfContentRootDir)
        nextOutputPath = replacePathPrefix(nextOutputPath, legacyPathMap.oldAddonsSourceDir, legacyPathMap.newAddonsSourceDir)
        nextOutputPath = replacePathPrefix(nextOutputPath, legacyPathMap.oldMergedAddonsDir, legacyPathMap.newMergedAddonsDir)
        nextOutputPath = replacePathPrefix(nextOutputPath, legacyPathMap.oldSplitContentDir, legacyPathMap.newSplitContentDir)
        migrated.outputPath = nextOutputPath
    }

    return migrated
}

function setMode(mode) {
    const previousMode = currentConfig.mode
    const normalizedMode = mode === 'content-pack'
        ? 'content-pack'
        : mode === 'content-split'
            ? 'content-split'
            : 'vmf-pack'

    if (shouldAdoptModeDefaultPath(form.outputPath.value, previousMode)) {
        const defaultOutputPath = getDefaultOutputPathForMode(normalizedMode)
        if (defaultOutputPath) {
            form.outputPath.value = defaultOutputPath
        }
    }

    modeSelect.value = normalizedMode

    for (const panel of modePanels) {
        const isActive = panel.dataset.modePanel === normalizedMode
        panel.hidden = !isActive

        for (const element of panel.querySelectorAll('input, button, select, textarea')) {
            element.disabled = !isActive
        }
    }

    currentConfig.mode = normalizedMode
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

async function addVmfPath(initialPath = '') {
    try {
        const selectedPath = await callPicker('/api/pick-file', {
            title: 'Выбери VMF файл',
            currentPath: initialPath,
            kind: 'vmf',
        })

        if (selectedPath) {
            const nextVmfPaths = getVmfPaths()
            nextVmfPaths.push(selectedPath)
            renderVmfPaths(nextVmfPaths)
            saveConfig()
            appendLog('info', '[pick]', 'Добавлен VMF файл: ' + shorten(selectedPath, 120))
        }
    } catch (err) {
        appendLog('error', '[pick]', err.message)
    }
}

async function chooseOutputPath() {
    try {
        const selectedPath = await callPicker('/api/pick-folder', {
            title: 'Выбери выходную папку',
            currentPath: form.outputPath.value.trim(),
        })

        if (selectedPath) {
            form.outputPath.value = selectedPath
            saveConfig()
            appendLog('info', '[pick]', 'Выходная папка: ' + shorten(selectedPath, 120))
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

async function addContentPackDir(initialPath = '') {
    try {
        const selectedPath = await callPicker('/api/pick-folder', {
            title: 'Выбери папку контента',
            currentPath: initialPath,
        })

        if (selectedPath) {
            const nextDirs = getContentPackDirs()
            nextDirs.push(selectedPath)
            renderContentPackDirs(nextDirs)
            saveConfig()
            appendLog('info', '[pick]', 'Папка контента: ' + shorten(selectedPath, 120))
        }
    } catch (err) {
        appendLog('error', '[pick]', err.message)
    }
}

async function addExcludePath(initialPath = '') {
    try {
        const selectedPath = await callPicker('/api/pick-folder', {
            title: 'Выбери папку для исключения из пост-обработки',
            currentPath: initialPath,
        })

        if (selectedPath) {
            const nextPaths = getExcludePaths()
            nextPaths.push(selectedPath)
            renderExcludePaths(nextPaths)
            saveConfig()
            appendLog('info', '[pick]', 'Исключение пост-обработки: ' + shorten(selectedPath, 120))
        }
    } catch (err) {
        appendLog('error', '[pick]', err.message)
    }
}

async function chooseFfmpegPath() {
    try {
        const selectedPath = await callPicker('/api/pick-file', {
            title: 'Выбери исполняемый файл ffmpeg',
            currentPath: form.ffmpegPath.value.trim(),
            kind: 'any',
        })

        if (selectedPath) {
            form.ffmpegPath.value = selectedPath
            saveConfig()
            appendLog('info', '[pick]', 'Путь к ffmpeg: ' + shorten(selectedPath, 120))
        }
    } catch (err) {
        appendLog('error', '[pick]', err.message)
    }
}

async function chooseVtfCmdPath() {
    try {
        const selectedPath = await callPicker('/api/pick-file', {
            title: 'Выбери исполняемый файл VTFCmd',
            currentPath: form.vtfCmdPath.value.trim(),
            kind: 'any',
        })

        if (selectedPath) {
            form.vtfCmdPath.value = selectedPath
            saveConfig()
            appendLog('info', '[pick]', 'Путь к VTFCmd: ' + shorten(selectedPath, 120))
        }
    } catch (err) {
        appendLog('error', '[pick]', err.message)
    }
}

function syncRulesConfigFromUi() {
    currentConfig.rulesConfig = readRulesConfigFromUi()
    return currentConfig.rulesConfig
}

function updateRulesConfig(mutator) {
    const rulesConfig = syncRulesConfigFromUi()
    mutator(rulesConfig)
    currentConfig.rulesConfig = normalizeRulesConfig(rulesConfig)
    renderRulesConfig()
    saveConfig()
}

function validateContentPackConfig(cfg) {
    const rulesConfig = normalizeRulesConfig(cfg.rulesConfig)

    if (rulesConfig.groups.length === 0) {
        return 'Добавь хотя бы одну группу вывода.'
    }

    const groupIds = new Set()
    const groupFolders = new Set()

    for (let index = 0; index < rulesConfig.groups.length; index += 1) {
        const group = rulesConfig.groups[index]
        const id = group.id.trim()
        const folder = group.folder.trim()

        if (!id) return `Группа #${index + 1}: заполни ID группы.`
        if (!folder) return `Группа #${index + 1}: заполни папку в output.`

        const idKey = id.toLowerCase()
        const folderKey = folder.toLowerCase()
        if (groupIds.has(idKey)) return `Группа #${index + 1}: ID "${id}" уже используется.`
        if (groupFolders.has(folderKey)) return `Группа #${index + 1}: папка "${folder}" уже используется.`

        groupIds.add(idKey)
        groupFolders.add(folderKey)
    }

    for (let index = 0; index < rulesConfig.rules.length; index += 1) {
        const rule = rulesConfig.rules[index]
        const addonName = rule.match?.addonName?.trim() || ''
        const addonNamePattern = rule.match?.addonNamePattern?.trim() || ''

        if (!addonName && !addonNamePattern) {
            return `Правило #${index + 1}: задай точное имя аддона или regex-паттерн.`
        }

        if ((rule.action ?? 'pack') === 'pack') {
            const groupId = rule.groupId?.trim() || ''
            if (!groupId) {
                return `Правило #${index + 1}: выбери группу для действия "Упаковать".`
            }
            if (!groupIds.has(groupId.toLowerCase())) {
                return `Правило #${index + 1}: группа "${groupId}" не существует.`
            }
        }
    }

    if (rulesConfig.unmatched?.action === 'pack') {
        const groupId = rulesConfig.unmatched.groupId?.trim() || ''
        if (!groupId) {
            return 'Для fallback-режима "Упаковывать" нужно выбрать группу.'
        }
        if (!groupIds.has(groupId.toLowerCase())) {
            return `Fallback ссылается на неизвестную группу "${groupId}".`
        }
    }

    return null
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
            appendLog('info', '[scan]', e.message)
            setStatus('в работе', 'running')
            break

        case 'scanned':
            appendLog('info', '[scan]', `Всего элементов: ${e.total}`)
            statTotal.textContent = String(e.total)
            updateProgress(0, e.total, '')
            break

        case 'progress':
            scheduleProgressEvent(e)
            break

        case 'warn':
            appendLog('warn', '[warn]', e.message)
            break

        case 'error':
            if (e.stage === 'exec') {
                execErrors += 1
                statExecErr.textContent = String(execErrors)
                statExecErr.classList.remove('zero')
            } else if (e.stage === 'copy') {
                copyErrors += 1
                statCopyErr.textContent = String(copyErrors)
                statCopyErr.classList.remove('zero')
            }

            appendLog(
                'error',
                `[${e.stage}]`,
                (e.file ? shorten(e.file, 80) + ' | ' : '') + e.message,
            )
            break

        case 'done': {
            flushPendingProgress(true)
            const hasErrors = e.execErrors + e.copyErrors > 0
            appendLog('done', '[done]', `Готово. exec=${e.execErrors}, copy=${e.copyErrors}`)
            setStatus(hasErrors ? 'завершено с ошибками' : 'готово', hasErrors ? 'error' : 'done')
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
        const stored = migrateStoredPaths(loadStoredConfig(), data)
        const initialMode = stored?.mode || data.mode || 'vmf-pack'

        modeDefaultOutputPaths = {
            'vmf-pack': data.vmfPack?.outputPath || '',
            'content-pack': data.contentPack?.outputPath || '',
            'content-split': data.contentSplit?.outputPath || '',
        }

        const splitLimitGb = typeof stored?.splitLimitGb === 'number' && stored.splitLimitGb > 0
            ? stored.splitLimitGb
            : (data.contentSplit?.splitLimitGb ?? 2)
        const cleanSourceGroups = typeof stored?.cleanSourceGroups === 'boolean'
            ? stored.cleanSourceGroups
            : (data.contentSplit?.cleanSourceGroups ?? true)
        const defaultVmfPaths = getDefaultVmfPaths(data)
        const defaultContentPackDirs = getDefaultContentPackDirs(data)
        const hasStoredVmfPaths = Array.isArray(stored?.vmfPaths)
        const storedVmfPaths = hasStoredVmfPaths
            ? normalizeRoots(stored.vmfPaths)
            : normalizeRoots(stored?.vmfPath ? [stored.vmfPath] : [])
        const hasStoredContentDirs = Array.isArray(stored?.contentDirs)
        const storedContentDirs = hasStoredContentDirs
            ? normalizeRoots(stored.contentDirs)
            : normalizeRoots(stored?.contentDir ? [stored.contentDir] : [])

        const initialConfig = {
            mode: initialMode,
            vmfPath: storedVmfPaths[0] || defaultVmfPaths[0] || '',
            vmfPaths: hasStoredVmfPaths
                ? storedVmfPaths
                : (storedVmfPaths.length > 0 ? normalizeRoots([...storedVmfPaths, ...defaultVmfPaths]) : defaultVmfPaths),
            outputPath: stored?.outputPath || getDefaultOutputPathForMode(initialMode),
            cleanOutput: typeof stored?.cleanOutput === 'boolean'
                ? stored.cleanOutput
                : Boolean(data.vmfPack?.cleanOutput ?? data.contentPack?.cleanOutput),
            contentRoots: normalizeRoots(stored?.contentRoots || data.vmfPack?.contentRoots || []),
            contentDirs: hasStoredContentDirs
                ? storedContentDirs
                : (storedContentDirs.length > 0 ? normalizeRoots([...storedContentDirs, ...defaultContentPackDirs]) : defaultContentPackDirs),
            exts: stored?.exts?.length ? stored.exts : (data.vmfPack?.exts || []),
            contentKeys: stored?.contentKeys?.length ? stored.contentKeys : (data.vmfPack?.contentKeys || []),
            rulesConfig: mergeRulesConfigWithDefaults(
                stored?.rulesConfig,
                data.contentPack?.rulesConfig || createEmptyRulesConfig(),
            ),
            compressSounds: typeof stored?.compressSounds === 'boolean'
                ? stored.compressSounds
                : Boolean(data.contentPack?.compressSounds),
            compressVtf: typeof stored?.compressVtf === 'boolean'
                ? stored.compressVtf
                : Boolean(data.contentPack?.compressVtf),
            excludePaths: Array.isArray(stored?.excludePaths)
                ? normalizeRoots(stored.excludePaths)
                : (Array.isArray(stored?.soundExcludePaths) ? normalizeRoots(stored.soundExcludePaths) : []),
            ffmpegPath: stored?.ffmpegPath || data.contentPack?.ffmpegPath || '',
            vtfCmdPath: stored?.vtfCmdPath || data.contentPack?.vtfCmdPath || '',
            splitInputPath: stored?.splitInputPath || data.contentSplit?.splitInputPath || '',
            splitLimitGb,
            cleanSourceGroups,
        }

        currentConfig = initialConfig
        modeSelect.value = initialConfig.mode
        form.outputPath.value = initialConfig.outputPath
        form.cleanOutput.checked = initialConfig.cleanOutput
        form.exts.value = initialConfig.exts.join(', ')
        form.contentKeys.value = initialConfig.contentKeys.join(', ')
        form.compressSounds.checked = initialConfig.compressSounds
        form.compressVtf.checked = initialConfig.compressVtf
        form.ffmpegPath.value = initialConfig.ffmpegPath
        form.vtfCmdPath.value = initialConfig.vtfCmdPath
        form.splitInputPath.value = initialConfig.splitInputPath
        form.splitLimitGb.value = String(initialConfig.splitLimitGb)
        form.cleanSourceGroups.checked = initialConfig.cleanSourceGroups

        renderVmfPaths(initialConfig.vmfPaths)
        renderContentRoots(initialConfig.contentRoots)
        renderContentPackDirs(initialConfig.contentDirs)
        renderExcludePaths(initialConfig.excludePaths)
        renderRulesConfig()
        setMode(initialConfig.mode)
        saveConfig()
    } catch (err) {
        appendLog('error', '[fetch]', 'Не удалось загрузить настройки по умолчанию: ' + err.message)
    }
}

async function chooseSplitInputPath() {
    try {
        const selectedPath = await callPicker('/api/pick-folder', {
            title: 'Выбери папку для деления',
            currentPath: form.splitInputPath.value.trim(),
        })

        if (selectedPath) {
            form.splitInputPath.value = selectedPath
            saveConfig()
            appendLog('info', '[pick]', 'Папка для деления: ' + shorten(selectedPath, 120))
        }
    } catch (err) {
        appendLog('error', '[pick]', err.message)
    }
}

addVmfBtn.addEventListener('click', () => addVmfPath())
pickOutputBtn.addEventListener('click', chooseOutputPath)
addRootBtn.addEventListener('click', () => addContentRoot())
addContentDirBtn.addEventListener('click', () => addContentPackDir())
addExcludeBtn.addEventListener('click', () => addExcludePath())
pickFfmpegBtn.addEventListener('click', chooseFfmpegPath)
pickVtfCmdBtn.addEventListener('click', chooseVtfCmdPath)
pickSplitInputBtn.addEventListener('click', chooseSplitInputPath)

addGroupBtn.addEventListener('click', () => {
    updateRulesConfig((rulesConfig) => {
        rulesConfig.groups.push(createDefaultGroup(rulesConfig.groups.length + 1))
    })
})

addRuleBtn.addEventListener('click', () => {
    updateRulesConfig((rulesConfig) => {
        const firstGroupId = rulesConfig.groups[0]?.id || ''
        rulesConfig.rules.push(createDefaultRule(firstGroupId))
    })
})

vmfPathsEl.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button[data-action]')
    if (!btn) return

    const row = btn.closest('.root-row')
    if (!row) return

    const index = Number(row.dataset.index)
    const vmfPaths = getVmfPaths()

    if (btn.dataset.action === 'remove') {
        vmfPaths.splice(index, 1)
        renderVmfPaths(vmfPaths)
        saveConfig()
        return
    }

    if (btn.dataset.action === 'replace') {
        const currentPath = vmfPaths[index] || ''
        try {
            const selectedPath = await callPicker('/api/pick-file', {
                title: 'Замени VMF файл',
                currentPath,
                kind: 'vmf',
            })

            if (!selectedPath) return

            vmfPaths[index] = selectedPath
            renderVmfPaths(vmfPaths)
            saveConfig()
        } catch (err) {
            appendLog('error', '[pick]', err.message)
        }
    }
})

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
                title: 'Замени папку контента',
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

contentPackDirsEl.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button[data-action]')
    if (!btn) return

    const row = btn.closest('.root-row')
    if (!row) return

    const index = Number(row.dataset.index)
    const dirs = getContentPackDirs()

    if (btn.dataset.action === 'remove') {
        dirs.splice(index, 1)
        renderContentPackDirs(dirs)
        saveConfig()
        return
    }

    if (btn.dataset.action === 'replace') {
        const currentPath = dirs[index] || ''
        try {
            const selectedPath = await callPicker('/api/pick-folder', {
                title: 'Замени папку контента',
                currentPath,
            })

            if (!selectedPath) return

            dirs[index] = selectedPath
            renderContentPackDirs(dirs)
            saveConfig()
        } catch (err) {
            appendLog('error', '[pick]', err.message)
        }
    }
})

excludePathsEl.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button[data-action]')
    if (!btn) return

    const row = btn.closest('.root-row')
    if (!row) return

    const index = Number(row.dataset.index)
    const paths = getExcludePaths()

    if (btn.dataset.action === 'remove') {
        paths.splice(index, 1)
        renderExcludePaths(paths)
        saveConfig()
        return
    }

    if (btn.dataset.action === 'replace') {
        const currentPath = paths[index] || ''
        try {
            const selectedPath = await callPicker('/api/pick-folder', {
                title: 'Замени папку исключения',
                currentPath,
            })

            if (!selectedPath) return

            paths[index] = selectedPath
            renderExcludePaths(paths)
            saveConfig()
        } catch (err) {
            appendLog('error', '[pick]', err.message)
        }
    }
})

groupListEl.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-action]')
    if (!btn) return

    const card = btn.closest('.editor-card[data-kind="group"]')
    if (!card) return

    const index = Number(card.dataset.index)
    updateRulesConfig((rulesConfig) => {
        if (btn.dataset.action === 'remove') {
            rulesConfig.groups.splice(index, 1)
        }
    })
})

ruleListEl.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-action]')
    if (!btn) return

    const card = btn.closest('.editor-card[data-kind="rule"]')
    if (!card) return

    const index = Number(card.dataset.index)
    updateRulesConfig((rulesConfig) => {
        if (btn.dataset.action === 'remove') {
            rulesConfig.rules.splice(index, 1)
        }
    })
})

attachReorderableList(groupListEl, 'group', 'groups')
attachReorderableList(ruleListEl, 'rule', 'rules')

groupListEl.addEventListener('change', () => {
    currentConfig.rulesConfig = readRulesConfigFromUi()
    renderRules()
    renderUnmatchedControls()
    saveConfig()
})

ruleListEl.addEventListener('change', () => {
    currentConfig.rulesConfig = readRulesConfigFromUi()
    renderRules()
    saveConfig()
})

unmatchedEditorEl.addEventListener('change', () => {
    currentConfig.rulesConfig = readRulesConfigFromUi()
    renderUnmatchedControls()
    saveConfig()
})

modeSelect.addEventListener('change', () => {
    setMode(modeSelect.value)
    saveConfig()
})

form.exts.addEventListener('change', saveConfig)
form.contentKeys.addEventListener('change', saveConfig)
form.cleanOutput.addEventListener('change', saveConfig)
form.compressSounds.addEventListener('change', saveConfig)
form.compressVtf.addEventListener('change', saveConfig)
form.splitLimitGb.addEventListener('change', saveConfig)
form.cleanSourceGroups.addEventListener('change', saveConfig)

form.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    if (eventSource) return

    const cfg = readFormConfig()

    if (!cfg.outputPath) {
        appendLog('error', '[form]', 'Выбери выходную папку перед запуском.')
        return
    }

    if (cfg.mode === 'content-pack') {
        if (!cfg.contentDirs || cfg.contentDirs.length === 0) {
            appendLog('error', '[form]', 'Выбери папку контента перед запуском.')
            return
        }

        const validationError = validateContentPackConfig(cfg)
        if (validationError) {
            appendLog('error', '[form]', validationError)
            return
        }
    } else if (cfg.mode === 'content-split') {
        if (!cfg.splitInputPath) {
            appendLog('error', '[form]', 'Выбери папку для деления перед запуском.')
            return
        }

        if (!cfg.outputPath) {
            appendLog('error', '[form]', 'Выбери выходную папку перед запуском.')
            return
        }
    } else {
        if (!cfg.vmfPaths || cfg.vmfPaths.length === 0) {
            appendLog('error', '[form]', 'Выбери хотя бы один VMF файл перед запуском.')
            return
        }

        if (cfg.contentRoots.length === 0) {
            appendLog('error', '[form]', 'Добавь хотя бы одну папку контента перед запуском.')
            return
        }
    }

    resetProgress()
    saveConfig()
    runBtn.disabled = true
    runBtn.textContent = 'Запущено...'
    setStatus('запуск...', 'running')
    const runMsg = cfg.mode === 'content-pack'
        ? 'Запускаю режим объединения контента...'
        : cfg.mode === 'content-split'
            ? `Запускаю деление контента (лимит ${cfg.splitLimitGb} ГБ)...`
            : `Запускаю упаковку ассетов по ${cfg.vmfPaths.length} VMF и ${cfg.contentRoots.length} папке(ам) контента...`
    appendLog('info', '[run]', runMsg)

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
            appendLog('error', '[sse]', 'Ошибка разбора: ' + err.message)
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
