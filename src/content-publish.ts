import path from 'path'
import os from 'os'
import fsp from 'fs/promises'
import crypto from 'crypto'
import { execFile } from 'child_process'
import { promisify } from 'util'
import {
    DEFAULT_CONTENT_SPLIT_OUTPUT_DIR,
    pathExists,
    type RunEvent,
} from './shared.js'

const execFileAsync = promisify(execFile)

export const DEFAULT_PUBLISH_INPUT_PATH = DEFAULT_CONTENT_SPLIT_OUTPUT_DIR
export const DEFAULT_PUBLISH_CHANGELOG = ''
export const DEFAULT_PUBLISH_ADDON_TYPE = 'servercontent'
export const PUBLISH_STATE_FILENAME = '.publish-state.json'
export const DEFAULT_PUBLISH_ICON = path.resolve('bin', 'publish_icon.jpg')

export type PublishItem = {
    folder: string
    id: string
    title?: string
}

// Дефолтный маппинг «часть сплита → workshop id», выведенный сопоставлением
// содержимого частей 06 с опубликованными QP-GMA (overlap 75–100%).
// 04_map_content_part4 — id пуст: айтема «Map Content #4» ещё нет, создай его в воркшопе.
export const DEFAULT_PUBLISH_ITEMS: PublishItem[] = [
    { folder: '01_locked_core_arc9_part1', id: '3712206853', title: 'QP: Metro 2033 - Weapon #1' },
    // id 3713088756 здесь был мёртвый (Steam отдаёт result=9 - айтема не существует),
    // а реальный «Weapon #2» - 3739096810. Из-за расхождения строка выпала из
    // publish.config.json, и часть не обновлялась: в опубликованной версии от
    // 07.07 нет ни одного shaders/fxc/*.vcs, хотя в сплите их 8. Без
    // arc9_vm_dof_ps30.vcs материал effects/arc9/vm_dof не компилируется, клиент
    // получает error-материал - магента при прицеливании и nil в
    // mat_dof:GetFloat("$c0_x") (краш cl_rendertarget.lua).
    { folder: '01_locked_core_arc9_part2', id: '3739096810', title: 'QP: Metro 2033 - Weapon #2' },
    { folder: '02_core_dependencies_part1', id: '3712210769', title: 'QP: Metro 2033 - Core' },
    { folder: '03_bsp_maps_part1', id: '3712211196', title: 'QP: Metro 2033 - UI' },
    { folder: '04_map_content_part1', id: '3712211783', title: 'QP: Metro 2033 - Map Content #1' },
    { folder: '04_map_content_part2', id: '3713089565', title: 'QP: Metro 2033 - Map Content #2' },
    { folder: '04_map_content_part3', id: '3728032834', title: 'QP: Metro 2033 - Map Content #3' },
    { folder: '04_map_content_part4', id: '', title: 'QP: Metro 2033 - Map Content #4' },
    { folder: '05_metro_main_content_part1', id: '3712218317', title: 'QP: Metro 2033 - Content #1' },
    { folder: '05_metro_main_content_part2', id: '3712219706', title: 'QP: Metro 2033 - Content #2' },
    { folder: '05_metro_main_content_part3', id: '3713092095', title: 'QP: Metro 2033 - Content #3' },
    { folder: '05_metro_main_content_part4', id: '3728304766', title: 'QP: Metro 2033 - Content #4' },
    { folder: '06_npc_and_mutants_part1', id: '3712220852', title: 'QP: Metro 2033 - NPCs' },
    { folder: '07_props_items_interactions_part1', id: '3712221743', title: 'QP: Metro 2033 - Props' },
    { folder: '08_ai_navigation_part1', id: '3712223688', title: 'QP: Metro 2033 - AI' },
    { folder: '09_vmanip_client_part1', id: '3712224064', title: 'QP: Metro 2033 - VManip' },
    { folder: '10_tools_builder_dev_part1', id: '3712224371', title: 'QP: Metro 2033 - Tools' },
    { folder: '11_admin_fixes_utility_part1', id: '3712224748', title: 'QP: Metro 2033 - Utility' },
    { folder: '12_optional_client_visuals_part1', id: '3712225020', title: 'QP: Metro 2033 - Visuals' },
    { folder: '13_unclassified_part1', id: '3712225280', title: 'QP: Metro 2033 - Extra' },
]

export type ContentPublishConfig = {
    splitOutputPath: string   // workspace/06_content_split
    gmodPath: string          // корень GarrysMod (содержит bin/gmad.exe, bin/gmpublish.exe)
    items: PublishItem[]      // folder -> workshop id
    changelog: string         // текст для -changes
    onlyChanged: boolean      // пропускать части без изменений
    dryRun: boolean           // собрать GMA, но не заливать
    addonType: string         // type в addon.json
    createMissing?: boolean   // для строк без id — создавать новый воркшоп-айтем (gmpublish create)
    iconPath?: string         // иконка для create (512×512 jpg); пусто — bundled bin/publish_icon.jpg
    configPath?: string       // путь к publish.config.json — куда записать id созданных айтемов
}

type PublishState = Record<string, string> // folder -> sha256 контента

// ── хеш содержимого части (без чтения тел: путь|размер|mtime) ────────────────
async function hashFolder(folderPath: string): Promise<string> {
    const lines: string[] = []
    const stack: string[] = [folderPath]

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
            // addon.json генерится на лету при сборке — не учитываем в хеше контента
            if (path.relative(folderPath, fullPath).toLowerCase() === 'addon.json') continue

            const stat = await fsp.stat(fullPath)
            const rel = path.relative(folderPath, fullPath).replace(/\\/g, '/')
            lines.push(`${rel}|${stat.size}|${Math.round(stat.mtimeMs)}`)
        }
    }

    lines.sort()
    return crypto.createHash('sha256').update(lines.join('\n')).digest('hex')
}

async function loadState(stateFilePath: string): Promise<PublishState> {
    try {
        const raw = await fsp.readFile(stateFilePath, 'utf8')
        const parsed = JSON.parse(raw) as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as PublishState
        }
    } catch {
        // нет файла / битый — начинаем с чистого состояния
    }
    return {}
}

async function saveState(stateFilePath: string, state: PublishState): Promise<void> {
    try {
        await fsp.writeFile(stateFilePath, JSON.stringify(state, null, 2), 'utf8')
    } catch {
        // не критично — просто на следующий раз пересоберём
    }
}

// ── разбор вывода gmad: какие файлы выкинуты из GMA (whitelist) ──────────────
function collectExcludedFiles(output: string): string[] {
    const excluded: string[] = []
    const lines = output.split(/\r?\n/)

    for (let i = 0; i < lines.length; i += 1) {
        const line = (lines[i] ?? '').trim()
        if (line.startsWith('Writing ')) continue // это запись файла В архив, не исключение
        // только реальные сообщения gmad об отклонении файла (глагол), а не подстрока в имени файла
        if (!/(isn'?t allowed|not allowed|isn'?t whitelisted|not whitelisted|\[ignored\]|ignoring file|invalid file|not added)/i.test(line)) {
            continue
        }

        // С -warninvalid (а мы всегда зовём gmad именно так) причина печатается
        // ОТДЕЛЬНОЙ строкой, а путь к файлу - на предыдущей:
        //     models/items/arc9/ammo_box.sw.vtx
        //         [Not allowed by whitelist]
        // Без склейки в excluded попадала голая причина без пути, поэтому проверка
        // "выкинуло ассет из models/materials/sound" ниже не срабатывала НИКОГДА:
        // 53 выброшенные модели уходили в лог как безобидное «прочих файлов: 53».
        // Ровно от этого предупреждение и должно было страховать.
        const prev = (lines[i - 1] ?? '').trim()
        const hasPath = /[\\/]/.test(line)
        excluded.push(!hasPath && prev ? `${prev} ${line}` : line)
    }

    return excluded
}

async function buildGma(
    gmadExe: string,
    folderAbs: string,
    outGma: string,
): Promise<{ stdout: string; stderr: string }> {
    // -warninvalid: не падать на «левых» файлах, а пропускать их с предупреждением
    const { stdout, stderr } = await execFileAsync(
        gmadExe,
        ['create', '-folder', folderAbs, '-out', outGma, '-warninvalid'],
        { maxBuffer: 64 * 1024 * 1024 },
    )
    return { stdout: stdout ?? '', stderr: stderr ?? '' }
}

async function publishGma(
    gmpublishExe: string,
    gma: string,
    workshopId: string,
    changelog: string,
): Promise<{ stdout: string; stderr: string }> {
    const args = ['update', '-addon', gma, '-id', workshopId]
    if (changelog.trim()) args.push('-changes', changelog.trim())

    const { stdout, stderr } = await execFileAsync(gmpublishExe, args, {
        maxBuffer: 16 * 1024 * 1024,
    })
    return { stdout: stdout ?? '', stderr: stderr ?? '' }
}

// создаёт НОВЫЙ воркшоп-айтем из GMA (title/type берутся из addon.json внутри GMA)
async function createGmaItem(
    gmpublishExe: string,
    gma: string,
    iconPath: string,
): Promise<{ stdout: string; stderr: string }> {
    const { stdout, stderr } = await execFileAsync(
        gmpublishExe,
        ['create', '-addon', gma, '-icon', iconPath],
        { maxBuffer: 16 * 1024 * 1024 },
    )
    return { stdout: stdout ?? '', stderr: stderr ?? '' }
}

// извлекает workshop id из вывода gmpublish create (последнее 8–12-значное число)
function parseCreatedId(output: string): string | null {
    const matches = output.match(/\b\d{8,12}\b/g)
    return matches && matches.length ? (matches[matches.length - 1] ?? null) : null
}

// записывает id созданного айтема обратно в publish.config.json (по имени папки)
async function writeBackItemId(configPath: string, folder: string, id: string): Promise<void> {
    try {
        const raw = await fsp.readFile(configPath, 'utf8')
        const cfg = JSON.parse(raw) as { items?: Array<{ folder?: string; id?: string }> }
        if (Array.isArray(cfg.items)) {
            const row = cfg.items.find((it) => it.folder === folder)
            if (row) row.id = id
            await fsp.writeFile(configPath, JSON.stringify(cfg, null, 2), 'utf8')
        }
    } catch {
        // не критично — id всё равно выведен в лог, можно вписать вручную
    }
}

function execError(error: unknown): string {
    const err = error as { message?: string; code?: unknown; stdout?: string; stderr?: string }
    const parts: string[] = []
    if (err.code !== undefined) parts.push(`exit=${err.code}`)
    const tail = (err.stderr || err.stdout || '').trim().split(/\r?\n/).slice(-4).join(' | ')
    if (tail) parts.push(tail)
    if (parts.length === 0 && err.message) parts.push(err.message)
    return parts.join(' | ') || 'неизвестная ошибка'
}

export async function runContentPublish(
    cfg: ContentPublishConfig,
    emit: (e: RunEvent) => void,
): Promise<void> {
    const startedAt = Date.now()

    try {
        const splitOutputPath = cfg.splitOutputPath.trim()
        const gmodPath = cfg.gmodPath.trim()
        const wantCreate = !!cfg.createMissing
        // с включённым «создавать недостающие» берём и строки без id (под создание), иначе только с id
        const items = (cfg.items ?? []).filter(it => it && it.folder?.trim() && (wantCreate || it.id?.trim()))

        if (!splitOutputPath) {
            emit({ type: 'error', stage: 'fatal', message: 'Не выбрана папка со сплитом (06_content_split)' })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }
        if (!gmodPath) {
            emit({ type: 'error', stage: 'fatal', message: 'Не указан путь к GarrysMod (для gmad/gmpublish)' })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }
        if (items.length === 0) {
            emit({ type: 'error', stage: 'fatal', message: 'Нет частей для публикации' })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }

        const resolvedSplit = path.resolve(splitOutputPath)
        const gmadExe = path.join(path.resolve(gmodPath), 'bin', 'gmad.exe')
        const gmpublishExe = path.join(path.resolve(gmodPath), 'bin', 'gmpublish.exe')

        if (!await pathExists(resolvedSplit)) {
            emit({ type: 'error', stage: 'fatal', message: `Папка сплита не существует: ${resolvedSplit}` })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }
        if (!await pathExists(gmadExe)) {
            emit({ type: 'error', stage: 'fatal', message: `Не найден gmad.exe: ${gmadExe}` })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }
        if (!cfg.dryRun && !await pathExists(gmpublishExe)) {
            emit({ type: 'error', stage: 'fatal', message: `Не найден gmpublish.exe: ${gmpublishExe}` })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }

        const iconPath = cfg.iconPath?.trim() ? path.resolve(cfg.iconPath.trim()) : DEFAULT_PUBLISH_ICON
        if (wantCreate && !cfg.dryRun && !await pathExists(iconPath)) {
            emit({ type: 'error', stage: 'fatal', message: `Не найдена иконка для создания айтемов (512×512 jpg): ${iconPath}` })
            emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
            return
        }

        emit({ type: 'info', message: 'Режим: publish' })
        emit({ type: 'info', message: `Сплит: ${resolvedSplit}` })
        emit({ type: 'info', message: `GarrysMod: ${path.resolve(gmodPath)}` })
        emit({ type: 'info', message: `Частей: ${items.length}; dryRun=${cfg.dryRun}; onlyChanged=${cfg.onlyChanged}; создавать недостающие=${wantCreate}` })
        if (!cfg.dryRun) {
            emit({
                type: 'warn',
                message: 'Заливка реальная: нужен запущенный Steam с логином в аккаунт-владелец воркшоп-айтемов.',
            })
        }

        const stateFilePath = path.join(resolvedSplit, PUBLISH_STATE_FILENAME)
        const state = await loadState(stateFilePath)

        let processed = 0
        let execErrors = 0
        let published = 0
        let created = 0
        let skipped = 0
        let dllInitFail = false
        const total = items.length

        for (const item of items) {
            const folderAbs = path.join(resolvedSplit, item.folder)
            const label = item.id ? `${item.folder} → ${item.id}` : `${item.folder} (новый айтем)`

            try {
                if (!await pathExists(folderAbs)) {
                    execErrors += 1
                    emit({ type: 'error', stage: 'exec', file: folderAbs, message: `Папка части не найдена: ${item.folder}` })
                    continue
                }

                const hash = await hashFolder(folderAbs)

                if (cfg.onlyChanged && !cfg.dryRun && item.id && state[item.folder] === hash) {
                    skipped += 1
                    emit({ type: 'info', message: `${label}: пропущено (без изменений)` })
                    continue
                }

                if (!item.id && !wantCreate) {
                    skipped += 1
                    emit({ type: 'info', message: `${item.folder}: пропущено — нет id (создание выключено)` })
                    continue
                }

                // addon.json нужен gmad'у; папки части генерит split, перезаписывать безопасно
                const addonJsonPath = path.join(folderAbs, 'addon.json')
                await fsp.writeFile(addonJsonPath, JSON.stringify({
                    title: item.title?.trim() || item.folder,
                    type: cfg.addonType || DEFAULT_PUBLISH_ADDON_TYPE,
                    tags: [],
                    ignore: [PUBLISH_STATE_FILENAME],
                }, null, 2), 'utf8')

                // dry-run: GMA остаётся в видимой папке для проверки; реальная заливка — во временную
                let outGma: string
                if (cfg.dryRun) {
                    const previewDir = path.join(path.dirname(resolvedSplit), '_gma_preview')
                    await fsp.mkdir(previewDir, { recursive: true })
                    outGma = path.join(previewDir, `${item.folder}.gma`)
                } else {
                    outGma = path.join(os.tmpdir(), `vmf-publish-${item.id}-${process.pid}.gma`)
                }

                emit({ type: 'debug', tag: '[gmad]', message: `create -folder ${item.folder} -out ${path.basename(outGma)}` })
                const gmadOut = await buildGma(gmadExe, folderAbs, outGma)

                const excluded = collectExcludedFiles(gmadOut.stdout + '\n' + gmadOut.stderr)
                const droppedAssets = excluded.filter(l => /models\/|materials\/|sound\//i.test(l))
                if (droppedAssets.length > 0) {
                    emit({
                        type: 'warn',
                        message: `${label}: gmad ВЫКИНУЛ ${droppedAssets.length} ассет(ов) из GMA (models/materials/sound) — проверь, не теряется ли контент!`,
                    })
                    for (const line of droppedAssets.slice(0, 10)) {
                        emit({ type: 'debug', tag: '[gmad:excluded]', message: line })
                    }
                } else if (excluded.length > 0) {
                    emit({ type: 'debug', tag: '[gmad]', message: `Выкинуто прочих файлов: ${excluded.length}` })
                }

                let gmaSize = 0
                try { gmaSize = (await fsp.stat(outGma)).size } catch { /* ниже обработаем */ }
                if (gmaSize <= 0) {
                    execErrors += 1
                    emit({ type: 'error', stage: 'exec', file: folderAbs, message: `${label}: GMA не собрался (пустой/отсутствует)` })
                    continue
                }
                emit({ type: 'info', message: `${label}: GMA собран (${(gmaSize / 1024 / 1024).toFixed(1)} МБ)` })

                if (cfg.dryRun) {
                    const act = item.id ? 'заливка' : 'создание айтема'
                    emit({ type: 'info', message: `${label}: dry-run — ${act} пропущено, GMA сохранён: ${outGma}` })
                    continue
                }

                if (item.id) {
                    emit({ type: 'debug', tag: '[gmpublish]', message: `update -id ${item.id}` })
                    const pubOut = await publishGma(gmpublishExe, outGma, item.id, cfg.changelog)
                    const pubTail = (pubOut.stdout || '').trim().split(/\r?\n/).slice(-2).join(' | ')
                    emit({ type: 'info', message: `${label}: опубликовано${pubTail ? ` — ${pubTail}` : ''}` })
                    state[item.folder] = hash
                    published += 1
                } else {
                    // создаём НОВЫЙ воркшоп-айтем (title/type — из addon.json внутри GMA)
                    emit({ type: 'debug', tag: '[gmpublish]', message: `create -icon ${path.basename(iconPath)} -addon ${item.folder}` })
                    const createOut = await createGmaItem(gmpublishExe, outGma, iconPath)
                    const newId = parseCreatedId(createOut.stdout + '\n' + createOut.stderr)
                    if (newId) {
                        item.id = newId
                        state[item.folder] = hash
                        created += 1
                        emit({ type: 'info', message: `${item.folder}: СОЗДАН айтем id=${newId} — https://steamcommunity.com/sharedfiles/filedetails/?id=${newId}` })
                        if (cfg.configPath) {
                            await writeBackItemId(cfg.configPath, item.folder, newId)
                            emit({ type: 'debug', tag: '[publish]', message: 'id записан в publish.config.json' })
                        }
                    } else {
                        execErrors += 1
                        const tail = (createOut.stdout || createOut.stderr || '').trim().split(/\r?\n/).slice(-3).join(' | ')
                        emit({ type: 'error', stage: 'exec', file: folderAbs, message: `${item.folder}: создание не удалось, id не получен${tail ? ` — ${tail}` : ''}` })
                    }
                }
                await fsp.rm(outGma, { force: true }).catch(() => {})
            } catch (error) {
                execErrors += 1
                const msg = execError(error)
                if (msg.includes('3221225794') || msg.includes('0xC0000142')) dllInitFail = true
                emit({ type: 'error', stage: 'exec', file: folderAbs, message: `${label}: ${msg}` })
            } finally {
                processed += 1
                emit({ type: 'progress', processed, total, file: item.folder })
            }
        }

        await saveState(stateFilePath, state)

        if (dllInitFail) {
            emit({
                type: 'warn',
                message: 'gmad не смог инициализироваться (0xC0000142): запусти dev-сервер в ОБЫЧНОМ окне терминала ' +
                    '(`npm run dev:web` в cmd/PowerShell) — консольной утилите gmad нужна консоль; в фоне без консоли она падает.',
            })
        }

        const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1)
        emit({
            type: 'info',
            message: `Итог: опубликовано=${published}, создано=${created}, пропущено=${skipped}, ошибок=${execErrors}, время=${elapsedSeconds}с`,
        })
        emit({ type: 'done', processed, execErrors, copyErrors: 0 })
    } catch (error) {
        const err = error as Error
        emit({ type: 'error', stage: 'fatal', message: err.message ?? String(error) })
        emit({ type: 'done', processed: 0, execErrors: 0, copyErrors: 0 })
    }
}
