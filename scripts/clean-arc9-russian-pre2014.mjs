import fs from 'fs/promises'
import fss from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = path.resolve(path.dirname(scriptPath), '..')

const roots = [
    path.join(repoRoot, 'workspace', '06_content_split', '01_locked_core_arc9_part1'),
    path.join(repoRoot, 'workspace', '06_content_split', '01_locked_core_arc9_part2'),
]

const args = new Set(process.argv.slice(2))
const help = args.has('--help') || args.has('-h')
const apply = args.has('--apply')
const verbose = args.has('--verbose')
const keepPost2014 = args.has('--keep-2014')
const reportPath = valueArg('--report') ?? path.join(repoRoot, 'workspace', 'arc9_russian_pre2014_cleanup_report.json')
const outputPathArg = valueArg('--output') ?? valueArg('--out') ?? process.env.ARC9_CLEAN_OUTPUT_PATH
const cleanOutput = args.has('--clean-output')

const coreWeaponClasses = new Set([
    'arc9_eft_base',
])

const manualKeepWeaponClasses = new Set([
    // Add class names here if you want to force-keep a local custom Russian pre-2014 weapon.
])

const manualDropWeaponClasses = new Set([
    'arc9_eft_rangefinder',
])

const weaponFirstYearOverrides = new Map([
    // EFT lists the adopted/finalized 6P70 year, but the AK-12 project and
    // first prototype started before 2014.
    ['arc9_eft_ak12', 2011],
    // PL-15 is the 2016 redesignation of the PL-14/Lebedev pistol program.
    ['arc9_eft_pl15', 2014],
    // EFT lists 2017, but the RPK-16 program/prototype dates to 2016.
    ['arc9_eft_rpk16', 2016],
])

const russianCountryPattern = /(?:country_(?:ussr|rus|ru)\b|russia|soviet|ussr)/i
const russianMakerPattern = /(?:kalash|izhev|molot|tula|kbp|tsniitochmash|degtyar|orsis|lobaev|tsn|tskib|zmz|npo|vytatsky|numerous|tarkovtoy)/i
const alwaysKeepUtilityWeaponPattern = /(?:grenade|melee|rsp30|zarya|vog|rdg2b|rgd5|rgn|rgo|m18|m67|m7290|v40|f1(?:_rd)?$)/i
const nonGunClassPattern = /(?:rangefinder)/i

const cleanableAssetPatterns = [
    /^models\/items\/arc9\//i,
    /^models\/weapons\/arc9\/darsu_eft\//i,
    /^models\/weapons\/arc9\/silly_eft\//i,
    /^models\/weapons\/arc9_eft_shared\//i,
    /^materials\/entities\/eft/i,
    /^materials\/models\/weapons\/arc9\/camo\//i,
    /^materials\/models\/weapons\/arc9\/darsu_eft\//i,
    /^materials\/models\/weapons\/arc9\/silly_eft\//i,
    /^materials\/models\/weapons\/arc9_eft_shared\//i,
    /^particles\//i,
    /^sound\/arc9_eft_shared\//i,
    /^sound\/weapons\/darsu_eft\//i,
]

const modelSiblingExts = new Set([
    '.mdl',
    '.phy',
    '.vvd',
    '.vtx',
    '.dx80.vtx',
    '.dx90.vtx',
    '.sw.vtx',
])

const mdlTexInfoOffset = 4 * 17 + 12 * 6 + 64
const mdlTextureStructSize = 64
const sourceTracerVmtTextureKeys = new Set([
    '$basetexture',
    '$basetexture2',
    '$detail',
    '$bumpmap',
    '$bumpmap2',
    '$normalmap',
    '$envmapmask',
    '$envmapmask2',
    '$selfillummask',
    '$selfillumtexture',
    '$phongexponenttexture',
    '$lightwarptexture',
    '$blendmodulatetexture',
    '$flashlighttexture',
    '$envmap',
    '$iris',
])

function valueArg(name) {
    const prefix = `${name}=`
    const argv = process.argv.slice(2)
    const found = argv.find(arg => arg.startsWith(prefix))
    if (found) return found.slice(prefix.length)

    const index = argv.indexOf(name)
    if (index !== -1 && argv[index + 1] && !argv[index + 1].startsWith('--')) {
        return argv[index + 1]
    }

    return undefined
}

function printHelp() {
    console.log(`ARC9 Russian pre-2014 content cleaner

Usage:
  npm run clean:arc9-russian-pre2014 -- [options]
  node scripts/clean-arc9-russian-pre2014.mjs [options]

Options:
  --output=<path>       Output folder for recreated split result. Required with --apply.
  --apply               Create the cleaned result in --output. Sources are not modified.
  --clean-output        Recreate --output if it already exists and is not empty.
  --report=<path>       Write JSON report. Defaults to workspace/arc9_russian_pre2014_cleanup_report.json.
  --verbose             Print kept weapons and summary counts.
  --keep-2014           Include weapons whose first listed year is exactly 2014.
  --help                Show this help.

Environment:
  ARC9_CLEAN_OUTPUT_PATH can be used instead of --output.

Examples:
  npm run clean:arc9-russian-pre2014 -- --verbose
  npm run clean:arc9-russian-pre2014 -- --apply --output=E:\\prog\\vmf-asset-packer\\workspace\\06_content_split_russian_pre2014
`)
}

function toGamePath(p) {
    return p.replace(/\\/g, '/').replace(/^\/+/, '')
}

function cleanRef(raw) {
    return toGamePath(String(raw ?? '').trim()
        .replace(/^[\s)#*!^@+?-]+/, '')
        .replace(/^materials\//i, '')
        .replace(/^sound\//i, ''))
}

function lowerGame(p) {
    return toGamePath(p).toLowerCase()
}

function uniqSorted(values) {
    return [...new Set(values)].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

function addMapSet(map, key, value) {
    if (!map.has(key)) map.set(key, new Set())
    map.get(key).add(value)
}

async function walk(dir) {
    const result = []
    if (!fss.existsSync(dir)) return result
    const stack = [dir]

    while (stack.length) {
        const current = stack.pop()
        const entries = await fs.readdir(current, { withFileTypes: true })

        for (const entry of entries) {
            const full = path.join(current, entry.name)
            if (entry.isDirectory()) {
                stack.push(full)
            } else if (entry.isFile()) {
                result.push(full)
            }
        }
    }

    return result
}

function rootRelative(abs) {
    for (const root of roots) {
        const rel = path.relative(root, abs)
        if (!rel.startsWith('..') && !path.isAbsolute(rel)) return toGamePath(rel)
    }
    return null
}

function isLua(abs) {
    return abs.toLowerCase().endsWith('.lua')
}

function isAttachmentLua(gamePath) {
    return /^lua\/arc9\/common\/attachments(?:_bulk)?\//i.test(gamePath)
}

function isCleanableAsset(gamePath) {
    return cleanableAssetPatterns.some(pattern => pattern.test(gamePath))
}

function parseFirstYear(text) {
    const year = text.match(/eft_trivia_year5"\]\s*=\s*"([^"]+)"/i)?.[1] ?? ''
    const first = year.match(/\d{4}/)?.[0]
    return first ? Number(first) : null
}

function parseWeaponInfo(abs, text) {
    const className = path.basename(abs, '.lua')
    const country = text.match(/eft_trivia_country4"\]\s*=\s*"([^"]+)"/i)?.[1] ?? ''
    const maker = text.match(/eft_trivia_manuf1"\]\s*=\s*"([^"]+)"/i)?.[1] ?? ''
    const base = text.match(/SWEP\.Base\s*=\s*"([^"]+)"/i)?.[1] ?? ''
    const firstYear = weaponFirstYearOverrides.get(className) ?? parseFirstYear(text)
    const russian = russianCountryPattern.test(country) || russianMakerPattern.test(maker)

    return { abs, className, base, country, maker, firstYear, russian }
}

function shouldKeepByMetadata(info) {
    if (coreWeaponClasses.has(info.className)) return true
    if (manualKeepWeaponClasses.has(info.className)) return true
    if (manualDropWeaponClasses.has(info.className)) return false
    if (alwaysKeepUtilityWeaponPattern.test(info.className)) return true
    if (nonGunClassPattern.test(info.className)) return false
    if (!info.russian || info.firstYear === null) return false
    return keepPost2014 ? info.firstYear <= 2014 : info.firstYear < 2014
}

function hasExplicitTrivia(info) {
    return Boolean(info.country || info.maker || info.firstYear !== null)
}

function collectStringLiterals(text) {
    const values = []
    for (const match of text.matchAll(/"([^"\r\n]*)"|'([^'\r\n]*)'/g)) {
        values.push(match[1] ?? match[2] ?? '')
    }
    return values
}

function stripLuaComments(text) {
    return text
        .replace(/--\[\[[\s\S]*?\]\]/g, '')
        .replace(/--[^\r\n]*/g, '')
}

function collectAttachmentTokens(text) {
    text = stripLuaComments(text)
    const ids = new Set()
    const categories = new Set()

    for (const match of text.matchAll(/\bInstalled\s*=\s*"([^"]+)"/g)) {
        if (/^(?:eft_|universal_)/i.test(match[1])) ids.add(match[1])
    }

    for (const match of text.matchAll(/\bCategory\s*=\s*(\{[^}]+\}|"[^"]+")/gms)) {
        for (const str of collectStringLiterals(match[1])) {
            if (/^(?:eft_|universal_)/i.test(str)) categories.add(str)
        }
    }

    return { ids, categories }
}

function splitAttachmentBlocks(text) {
    const loadRe = /ARC9\.LoadAttachment\s*\(\s*ATT\s*,\s*"([^"]+)"\s*\)/g
    const matches = [...text.matchAll(loadRe)]
    if (!matches.length) return null

    const blocks = []
    let cursor = 0

    for (const match of matches) {
        const end = text.indexOf('\n', match.index + match[0].length)
        const blockEnd = end === -1 ? text.length : end + 1
        const block = text.slice(cursor, blockEnd)
        blocks.push({ id: match[1], text: block })
        cursor = blockEnd
    }

    const tail = text.slice(cursor)
    return { blocks, tail }
}

function blockCategories(blockText) {
    return collectAttachmentTokens(blockText).categories
}

function rewriteAttachmentText(selectedBlocks, tail) {
    const body = selectedBlocks.map(block => block.text.trimEnd()).join('\n\n')
    return `local ATT = {}\n\n${body}\n${tail.trim() ? `\n${tail.trimEnd()}\n` : ''}`
}

function addPath(queue, rel, reason) {
    if (!rel) return
    queue.push({ rel: toGamePath(rel), reason })
}

function materialRel(raw, defaultExt = '.vmt') {
    const cleaned = cleanRef(raw)
    if (!cleaned || /^[a-z]+:\/\//i.test(cleaned)) return null
    if (/\.(wav|ogg|mp3|mdl|pcf)$/i.test(cleaned)) return null
    const withExt = path.posix.extname(cleaned) ? cleaned : `${cleaned}${defaultExt}`
    return `materials/${withExt}`
}

function soundRel(raw) {
    const cleaned = cleanRef(raw)
    if (!/\.(wav|ogg|mp3)$/i.test(cleaned)) return null
    return `sound/${cleaned}`
}

function modelRel(raw) {
    const cleaned = cleanRef(raw)
    if (!/\.mdl$/i.test(cleaned)) return null
    return cleaned
}

function particleRel(raw) {
    const cleaned = cleanRef(raw)
    if (!/\.pcf$/i.test(cleaned)) return null
    return cleaned.startsWith('particles/') ? cleaned : `particles/${cleaned}`
}

function collectPathRefsFromText(text, queue, reason) {
    const vars = new Map()
    for (const match of text.matchAll(/\b(?:local\s+)?([A-Za-z_]\w*)\s*=\s*["']([^"']*\/)["']/g)) {
        vars.set(match[1], match[2])
    }

    for (const match of text.matchAll(/\b([A-Za-z_]\w*)\s*\.\.\s*["']([^"']+\.(?:wav|ogg|mp3|mdl|pcf|png|vtf|vmt))["']/gi)) {
        const prefix = vars.get(match[1])
        if (prefix) enqueueLiteralRefs(`${prefix}${match[2]}`, queue, `${reason}:concat`)
    }

    for (const literal of collectStringLiterals(text)) {
        enqueueLiteralRefs(literal, queue, reason)
    }

    for (const match of text.matchAll(/Material\s*\(\s*["']([^"']+)["']/gi)) {
        const rel = materialRel(match[1], path.posix.extname(match[1]) ? '' : '.vmt')
        if (rel) addPath(queue, rel, `${reason}:material`)
        if (!path.posix.extname(match[1])) {
            const vtf = materialRel(match[1], '.vtf')
            if (vtf) addPath(queue, vtf, `${reason}:material`)
        }
    }

    if (/\.vmt$/i.test(reason)) {
        collectVmtRefsFromText(text, queue, reason)

        // Fallback for malformed VMTs that cannot be represented as clean
        // key/value pairs but still contain obvious texture references.
        for (const match of text.matchAll(/\$[A-Za-z0-9_]+\s+"?([^"\s{}]+)"?/g)) {
            const rel = materialRel(match[1], '.vtf')
            if (rel) addPath(queue, rel, `${reason}:vmt-fallback`)
        }
    }
}

function enqueueLiteralRefs(literal, queue, reason) {
    const clean = cleanRef(literal)
    if (!clean || clean === 'models/' || clean === 'sound/') return

    const model = modelRel(clean)
    if (model) addPath(queue, model, reason)

    const sound = soundRel(clean)
    if (sound) addPath(queue, sound, reason)

    const particle = particleRel(clean)
    if (particle) addPath(queue, particle, reason)

    if (/\.(png|vtf|vmt)$/i.test(clean)) {
        addPath(queue, `materials/${clean}`, reason)
    }
}

function asciiStrings(buffer) {
    const text = buffer.toString('latin1')
    return [...text.matchAll(/[\x20-\x7e]{3,}/g)].map(match => match[0])
}

function readCString(buffer, offset) {
    if (!Number.isInteger(offset) || offset < 0 || offset >= buffer.length) return null
    let end = offset
    while (end < buffer.length && buffer[end] !== 0) end += 1
    return buffer.slice(offset, end).toString('latin1')
}

function cleanMdlString(value) {
    return toGamePath(value.trim()).replace(/^\/+/, '').replace(/\/?$/, value.endsWith('/') ? '/' : '')
}

function parseMdlTextureInfo(buffer) {
    if (buffer.length < mdlTexInfoOffset + 16) return null

    const texCount = buffer.readInt32LE(mdlTexInfoOffset)
    const texOffset = buffer.readInt32LE(mdlTexInfoOffset + 4)
    const texDirCount = buffer.readInt32LE(mdlTexInfoOffset + 8)
    const texDirOffset = buffer.readInt32LE(mdlTexInfoOffset + 12)

    if (texCount < 0 || texCount > 4096 || texDirCount < 0 || texDirCount > 4096) return null
    if (texOffset < 0 || texDirOffset < 0 || texOffset >= buffer.length || texDirOffset >= buffer.length) return null

    const textures = []
    for (let i = 0; i < texCount; i += 1) {
        const structOffset = texOffset + mdlTextureStructSize * i
        if (structOffset + 4 > buffer.length) continue
        const nameOffset = buffer.readInt32LE(structOffset)
        const name = readCString(buffer, structOffset + nameOffset)
        if (name && !/[^\x20-\x7e]/.test(name)) textures.push(cleanMdlString(name))
    }

    const dirs = []
    for (let i = 0; i < texDirCount; i += 1) {
        const offset32Pos = texDirOffset + 4 * i
        if (offset32Pos + 4 <= buffer.length) {
            const dirOffset = buffer.readInt32LE(offset32Pos)
            const dir = readCString(buffer, dirOffset)
            if (dir && !/[^\x20-\x7e]/.test(dir)) dirs.push(cleanMdlString(dir))
        }

        // The bundled Rust tracer reads these entries as u16. Keep this path too
        // because some existing packed content was traced with that behavior.
        const offset16Pos = texDirOffset + 2 * i
        if (offset16Pos + 2 <= buffer.length) {
            const dirOffset = buffer.readUInt16LE(offset16Pos)
            const dir = readCString(buffer, dirOffset)
            if (dir && !/[^\x20-\x7e]/.test(dir)) dirs.push(cleanMdlString(dir))
        }
    }

    return {
        textures: uniqSorted(textures.filter(Boolean)),
        dirs: uniqSorted(dirs.filter(Boolean)),
    }
}

async function collectMdlMaterialRefs(abs, queue, reason, gamePathExists) {
    const buffer = await fs.readFile(abs)
    const parsed = parseMdlTextureInfo(buffer)

    if (parsed) {
        for (const dir of parsed.dirs) {
            for (const texture of parsed.textures) {
                const rel = `materials/${dir}${texture}.vmt`
                if (gamePathExists(rel)) addPath(queue, rel, `${reason}:mdl-slot`)
            }
        }
    }

    const strings = asciiStrings(buffer)
    const dirs = strings
        .map(s => toGamePath(s))
        .filter(s => /^models\/.+\/$/i.test(s))

    const names = strings
        .map(s => s.trim())
        .filter(s => /^[A-Za-z0-9_. -]{3,128}$/.test(s))
        .filter(s => !/\.(smd|mdl|vvd|vtx|wav|ogg|mp3)$/i.test(s))

    for (const dir of dirs) {
        for (const name of names) {
            const rel = `materials/${dir}${name}.vmt`
            if (gamePathExists(rel)) addPath(queue, rel, `${reason}:mdl`)
        }
    }
}

async function collectMdlModelRefs(abs, queue, reason) {
    const buffer = await fs.readFile(abs)

    for (const value of asciiStrings(buffer)) {
        const match = value.match(/(?:models\/)?[\w./-]+\.mdl/i)
        if (!match) continue

        let rel = toGamePath(match[0])
        if (!rel.startsWith('models/')) rel = `models/${rel}`
        addPath(queue, rel, `${reason}:mdl-include`)
    }
}

function stripVmtComments(text) {
    return text
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\r\n]*/g, '')
}

function parseVmtStringFields(text) {
    const cleaned = stripVmtComments(text.replace(/\\/g, '/'))
    const fields = new Map()

    const quotedKeyRe = /"(\$[A-Za-z0-9_]+|include)"\s*(?:"([^"\r\n]*)"|([^\s{}"]+))/gmi
    for (const match of cleaned.matchAll(quotedKeyRe)) {
        fields.set(match[1].toLowerCase(), String(match[2] ?? match[3] ?? '').toLowerCase())
    }

    const bareKeyRe = /(^|[\s{}])(\$[A-Za-z0-9_]+|include)\s+("([^"]*)"|([^\s{}"]+))/gmi
    for (const match of cleaned.matchAll(bareKeyRe)) {
        fields.set(match[2].toLowerCase(), String(match[4] ?? match[5] ?? '').toLowerCase())
    }

    return fields
}

function collectVmtRefsFromText(text, queue, reason) {
    const fields = parseVmtStringFields(text)

    for (const [key, value] of fields) {
        if (!value) continue

        if (sourceTracerVmtTextureKeys.has(key)) {
            const rel = materialRel(value, '.vtf')
            if (rel) addPath(queue, rel, `${reason}:vmt-field:${key}`)
        }

        if (key === 'include') {
            const includePath = value.replace(/^\/+/, '')
            const rel = materialRel(includePath, '.vmt')
            if (rel) addPath(queue, rel, `${reason}:vmt-include`)
        }
    }
}

function emptyDirSort(a, b) {
    return b.length - a.length
}

async function removeEmptyDirs(dir) {
    if (!fss.existsSync(dir)) return
    const dirs = []
    const stack = [dir]
    while (stack.length) {
        const current = stack.pop()
        for (const entry of await fs.readdir(current, { withFileTypes: true })) {
            const full = path.join(current, entry.name)
            if (entry.isDirectory()) {
                dirs.push(full)
                stack.push(full)
            }
        }
    }

    for (const current of dirs.sort(emptyDirSort)) {
        try {
            await fs.rmdir(current)
        } catch {
            // Directory is not empty.
        }
    }
}

function isSameOrInside(child, parent) {
    const rel = path.relative(path.resolve(parent), path.resolve(child))
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

async function prepareOutputDirectory(outputPath) {
    const resolved = path.resolve(outputPath)

    for (const root of roots) {
        if (isSameOrInside(resolved, root) || isSameOrInside(root, resolved)) {
            throw new Error(`Output path must be separate from source split roots: ${resolved}`)
        }
    }

    if (fss.existsSync(resolved)) {
        const entries = await fs.readdir(resolved)
        if (entries.length > 0) {
            if (!cleanOutput) {
                throw new Error(`Output path is not empty: ${resolved}. Pass --clean-output to recreate it.`)
            }
            await fs.rm(resolved, { recursive: true, force: true })
        }
    }

    await fs.mkdir(resolved, { recursive: true })
    return resolved
}

function outputPathForSource(abs, outputRoot) {
    const rel = rootRelative(abs)
    if (rel) return path.join(outputRoot, ...rel.split('/'))

    throw new Error(`Cannot map source file to output: ${abs}`)
}

async function sameFileContents(left, right) {
    const [leftBuffer, rightBuffer] = await Promise.all([fs.readFile(left), fs.readFile(right)])
    return leftBuffer.equals(rightBuffer)
}

function countKeyValuesBraceBalance(text) {
    let depth = 0
    let quoted = false
    let escaped = false

    for (const char of text) {
        if (escaped) {
            escaped = false
            continue
        }

        if (quoted && char === '\\') {
            escaped = true
            continue
        }

        if (char === '"') {
            quoted = !quoted
            continue
        }

        if (quoted) continue

        if (char === '{') depth += 1
        if (char === '}') depth -= 1
    }

    return depth
}

function trimExtraTrailingKeyValuesBraces(text) {
    let balance = countKeyValuesBraceBalance(text)
    let fixed = text

    while (balance < 0) {
        const idx = fixed.lastIndexOf('}')
        if (idx === -1) break
        fixed = fixed.slice(0, idx) + fixed.slice(idx + 1)
        balance += 1
    }

    return fixed
}

async function recreateCleanOutput(outputRoot, allByAbs, filesToDelete, fileRewrites) {
    const copied = {
        files: 0,
        rewritten: 0,
        fixedVmt: 0,
        generatedHdrVtf: 0,
        skippedDuplicateMergedPaths: 0,
        skippedDeleted: 0,
    }

    const sortedFiles = [...allByAbs.keys()].sort((a, b) => a.localeCompare(b))
    const copiedDestinations = new Map()

    for (const abs of sortedFiles) {
        if (filesToDelete.has(abs)) {
            copied.skippedDeleted += 1
            continue
        }

        const destination = outputPathForSource(abs, outputRoot)
        const destinationKey = destination.toLowerCase()
        const previousSource = copiedDestinations.get(destinationKey)
        if (previousSource) {
            if (!fileRewrites.has(previousSource) && !fileRewrites.has(abs) && await sameFileContents(previousSource, abs)) {
                copied.skippedDuplicateMergedPaths += 1
                continue
            }

            throw new Error(`Merged output path collision: ${previousSource} and ${abs} both map to ${destination}`)
        }

        copiedDestinations.set(destinationKey, abs)
        await fs.mkdir(path.dirname(destination), { recursive: true })

        const rewrittenText = fileRewrites.get(abs)
        if (rewrittenText !== undefined) {
            await fs.writeFile(destination, rewrittenText, 'utf8')
            copied.rewritten += 1
        } else if (/\.vmt$/i.test(abs)) {
            const originalText = await fs.readFile(abs, 'utf8')
            const fixedText = trimExtraTrailingKeyValuesBraces(originalText)
            await fs.writeFile(destination, fixedText, 'utf8')
            if (fixedText !== originalText) copied.fixedVmt += 1
        } else {
            await fs.copyFile(abs, destination)
        }

        const gamePath = allByAbs.get(abs)
        if (gamePath && /^materials\/arc9\/shared\/envmaps\/.+\.vtf$/i.test(gamePath) && !/\.hdr\.vtf$/i.test(gamePath)) {
            const hdrDestination = destination.replace(/\.vtf$/i, '.hdr.vtf')
            if (!fss.existsSync(hdrDestination)) {
                await fs.copyFile(destination, hdrDestination)
                copied.generatedHdrVtf += 1
            }
        }

        copied.files += 1
    }

    await removeEmptyDirs(outputRoot)

    return copied
}

async function traceAssetGraph(seedQueue, seedAbs, allByAbs, findAbs, gamePathExists) {
    const queue = [...seedQueue]
    const tracedAbs = new Set(seedAbs)
    const seenGamePaths = new Set()

    while (queue.length) {
        const item = queue.shift()
        const rel = toGamePath(item.rel)
        const key = lowerGame(rel)
        if (seenGamePaths.has(key)) continue
        seenGamePaths.add(key)

        const absList = findAbs(rel)
        if (!absList.length) continue

        for (const abs of absList) tracedAbs.add(abs)

        if (/^models\/.+\.mdl$/i.test(rel)) {
            const stem = rel.replace(/\.mdl$/i, '').toLowerCase()
            for (const [abs, gamePath] of allByAbs) {
                const lower = lowerGame(gamePath)
                if (!lower.startsWith(`${stem}.`)) continue
                if (modelSiblingExts.has(path.posix.extname(lower)) || /\.dx\d+\.vtx$/i.test(lower)) {
                    tracedAbs.add(abs)
                }
            }

            for (const abs of absList.filter(p => p.toLowerCase().endsWith('.mdl'))) {
                await collectMdlMaterialRefs(abs, queue, rel, gamePathExists)
                await collectMdlModelRefs(abs, queue, rel)
            }
        }

        if (/\.vmt$/i.test(rel)) {
            for (const abs of absList) {
                const text = await fs.readFile(abs, 'utf8').catch(() => '')
                collectPathRefsFromText(text, queue, rel)
            }
        }
    }

    return { tracedAbs, seenGamePaths }
}

async function main() {
    const missing = roots.filter(root => !fss.existsSync(root))
    if (missing.length) {
        throw new Error(`Missing split roots:\n${missing.join('\n')}`)
    }

    if (apply && !outputPathArg) {
        throw new Error('Apply mode now writes to a separate folder. Pass --output=<path>.')
    }

    const outputPath = outputPathArg ? path.resolve(outputPathArg) : null

    const allFiles = (await Promise.all(roots.map(walk))).flat()
    const gameToAbs = new Map()
    const allByAbs = new Map()

    for (const abs of allFiles) {
        const gamePath = rootRelative(abs)
        if (!gamePath) continue
        const key = lowerGame(gamePath)
        if (!gameToAbs.has(key)) gameToAbs.set(key, [])
        gameToAbs.get(key).push(abs)
        allByAbs.set(abs, gamePath)
    }

    const gamePathExists = rel => gameToAbs.has(lowerGame(rel))
    const findAbs = rel => gameToAbs.get(lowerGame(rel)) ?? []
    const weaponDir = path.join(roots[0], 'lua', 'weapons')
    const weaponFiles = (await fs.readdir(weaponDir))
        .filter(name => name.endsWith('.lua'))
        .map(name => path.join(weaponDir, name))

    const weaponInfos = new Map()
    const luaTextByAbs = new Map()

    for (const abs of allFiles.filter(isLua)) {
        luaTextByAbs.set(abs, await fs.readFile(abs, 'utf8'))
    }

    for (const abs of weaponFiles) {
        const text = luaTextByAbs.get(abs) ?? await fs.readFile(abs, 'utf8')
        const info = parseWeaponInfo(abs, text)
        weaponInfos.set(info.className, info)
    }

    const keptWeaponClasses = new Set()
    for (const info of weaponInfos.values()) {
        if (shouldKeepByMetadata(info)) keptWeaponClasses.add(info.className)
    }

    let changed = true
    while (changed) {
        changed = false
        for (const info of weaponInfos.values()) {
            if (keptWeaponClasses.has(info.className)) continue
            if (manualDropWeaponClasses.has(info.className)) continue
            if (
                info.base
                && keptWeaponClasses.has(info.base)
                && !coreWeaponClasses.has(info.base)
                && !hasExplicitTrivia(info)
                && !nonGunClassPattern.test(info.className)
            ) {
                keptWeaponClasses.add(info.className)
                changed = true
            }
        }
    }

    const keptLuaTexts = new Map()
    const filesToDelete = new Set()
    const fileRewrites = new Map()
    const keptReasons = new Map()

    for (const [abs, text] of luaTextByAbs) {
        const gamePath = allByAbs.get(abs)
        const className = path.basename(abs, '.lua')

        if (/^lua\/weapons\/arc9_eft_/i.test(gamePath)) {
            if (keptWeaponClasses.has(className)) {
                keptLuaTexts.set(abs, text)
                keptReasons.set(abs, 'kept weapon')
            } else {
                filesToDelete.add(abs)
            }
            continue
        }

        if (isAttachmentLua(gamePath)) continue

        keptLuaTexts.set(abs, text)
        keptReasons.set(abs, 'core lua')
    }

    const neededAttachmentIds = new Set()
    const neededCategories = new Set()
    const attachmentIdUsageByWeapon = new Map()
    const attachmentCategoryUsageByWeapon = new Map()

    for (const [abs, text] of keptLuaTexts) {
        const gamePath = allByAbs.get(abs)
        if (!/^lua\/weapons\//i.test(gamePath)) continue
        const weaponClass = path.basename(abs, '.lua')
        const tokens = collectAttachmentTokens(text)
        for (const id of tokens.ids) {
            neededAttachmentIds.add(id)
            addMapSet(attachmentIdUsageByWeapon, id, weaponClass)
        }
        for (const category of tokens.categories) {
            neededCategories.add(category)
            addMapSet(attachmentCategoryUsageByWeapon, category, weaponClass)
        }
    }

    const attachmentFiles = [...luaTextByAbs.keys()]
        .filter(abs => isAttachmentLua(allByAbs.get(abs)))
        .sort((a, b) => a.localeCompare(b))

    const attachmentData = []
    for (const abs of attachmentFiles) {
        const text = luaTextByAbs.get(abs)
        const split = splitAttachmentBlocks(text)
        if (!split) {
            keptLuaTexts.set(abs, text)
            keptReasons.set(abs, 'attachment support lua')
            continue
        }

        attachmentData.push({
            abs,
            tail: split.tail,
            blocks: split.blocks.map(block => ({
                ...block,
                categories: blockCategories(block.text),
                tokens: collectAttachmentTokens(block.text),
            })),
            selectedIds: new Set(),
        })
    }

    changed = true
    while (changed) {
        changed = false
        for (const file of attachmentData) {
            for (const block of file.blocks) {
                if (file.selectedIds.has(block.id)) continue

                const categoryMatch = [...block.categories].some(category => neededCategories.has(category))
                const idMatch = neededAttachmentIds.has(block.id)
                if (!categoryMatch && !idMatch) continue

                file.selectedIds.add(block.id)
                neededAttachmentIds.add(block.id)
                changed = true

                for (const id of block.tokens.ids) {
                    if (!neededAttachmentIds.has(id)) {
                        neededAttachmentIds.add(id)
                        changed = true
                    }
                }
                for (const category of block.tokens.categories) {
                    if (!neededCategories.has(category)) {
                        neededCategories.add(category)
                        changed = true
                    }
                }
            }
        }
    }

    const selectedAttachmentIds = new Set()
    const droppedAttachmentIds = new Set()
    const categoryToAttachmentIds = new Map()

    for (const file of attachmentData) {
        for (const block of file.blocks) {
            if (file.selectedIds.has(block.id)) selectedAttachmentIds.add(block.id)
            else droppedAttachmentIds.add(block.id)

            for (const category of block.categories) {
                addMapSet(categoryToAttachmentIds, category, block.id)
            }
        }
    }

    const missingInstalledAttachments = []
    for (const [id, weapons] of attachmentIdUsageByWeapon) {
        if (!selectedAttachmentIds.has(id) && !droppedAttachmentIds.has(id)) {
            missingInstalledAttachments.push({
                id,
                weapons: uniqSorted([...weapons]),
                reason: 'referenced by kept weapon but no ARC9 attachment block was found',
            })
        } else if (droppedAttachmentIds.has(id)) {
            missingInstalledAttachments.push({
                id,
                weapons: uniqSorted([...weapons]),
                reason: 'referenced by kept weapon but selected for deletion',
            })
        }
    }

    const sharedAttachmentCategories = []
    const unsafeDroppedSharedAttachments = []
    for (const [category, weapons] of attachmentCategoryUsageByWeapon) {
        const allIds = categoryToAttachmentIds.get(category) ?? new Set()
        const selectedIds = [...allIds].filter(id => selectedAttachmentIds.has(id))
        const droppedIds = [...allIds].filter(id => droppedAttachmentIds.has(id))
        const item = {
            category,
            weapons: uniqSorted([...weapons]),
            selectedAttachmentCount: selectedIds.length,
            droppedAttachmentCount: droppedIds.length,
        }

        if (weapons.size > 1) sharedAttachmentCategories.push(item)

        if (droppedIds.length > 0) {
            unsafeDroppedSharedAttachments.push({
                ...item,
                droppedAttachmentIds: uniqSorted(droppedIds),
            })
        }
    }

    const attachmentSafetyErrors = [
        ...missingInstalledAttachments,
        ...unsafeDroppedSharedAttachments,
    ]

    for (const file of attachmentData) {
        const selected = file.blocks.filter(block => file.selectedIds.has(block.id))
        if (!selected.length) {
            filesToDelete.add(file.abs)
            continue
        }

        const nextText = rewriteAttachmentText(selected, file.tail)
        keptLuaTexts.set(file.abs, nextText)
        keptReasons.set(file.abs, `selected attachments: ${selected.length}/${file.blocks.length}`)
        if (nextText !== luaTextByAbs.get(file.abs)) fileRewrites.set(file.abs, nextText)
    }

    const referencedEntityClasses = new Set()
    for (const text of keptLuaTexts.values()) {
        for (const literal of collectStringLiterals(text)) {
            if (/^arc9_eft_/i.test(literal)) referencedEntityClasses.add(literal.toLowerCase())
        }
    }

    for (const [abs, text] of [...keptLuaTexts]) {
        const gamePath = allByAbs.get(abs)
        if (!/^lua\/entities\/arc9_eft_/i.test(gamePath)) continue
        const className = path.basename(abs, '.lua').toLowerCase()
        if (!referencedEntityClasses.has(className) && !/base/i.test(className)) {
            keptLuaTexts.delete(abs)
            filesToDelete.add(abs)
        }
    }

    const keepQueue = []
    const keepSeedAbs = new Set()

    for (const [abs, text] of keptLuaTexts) {
        keepSeedAbs.add(abs)
        collectPathRefsFromText(text, keepQueue, allByAbs.get(abs))
    }

    const { tracedAbs: keepAbs } = await traceAssetGraph(keepQueue, keepSeedAbs, allByAbs, findAbs, gamePathExists)

    const dropQueue = []
    const droppedDependencySources = []

    for (const [abs, text] of luaTextByAbs) {
        const gamePath = allByAbs.get(abs)
        const className = path.basename(abs, '.lua')
        if (/^lua\/weapons\/arc9_eft_/i.test(gamePath) && !keptWeaponClasses.has(className)) {
            droppedDependencySources.push(gamePath)
            collectPathRefsFromText(text, dropQueue, gamePath)
        }
    }

    for (const file of attachmentData) {
        const gamePath = allByAbs.get(file.abs)
        for (const block of file.blocks) {
            if (file.selectedIds.has(block.id)) continue
            droppedDependencySources.push(`${gamePath}#${block.id}`)
            collectPathRefsFromText(block.text, dropQueue, `${gamePath}#${block.id}`)
        }
    }

    for (const abs of filesToDelete) {
        const gamePath = allByAbs.get(abs)
        if (!/^lua\/entities\/arc9_eft_/i.test(gamePath ?? '')) continue
        const text = luaTextByAbs.get(abs)
        if (!text) continue
        droppedDependencySources.push(gamePath)
        collectPathRefsFromText(text, dropQueue, gamePath)
    }

    const { tracedAbs: dropAbs } = await traceAssetGraph(dropQueue, new Set(), allByAbs, findAbs, gamePathExists)

    for (const [abs, gamePath] of allByAbs) {
        if (!isCleanableAsset(gamePath)) continue
        if (!keepAbs.has(abs)) filesToDelete.add(abs)
    }

    for (const abs of fileRewrites.keys()) {
        filesToDelete.delete(abs)
    }
    for (const abs of keepAbs) {
        if (!/^lua\/weapons\/arc9_eft_/i.test(allByAbs.get(abs) ?? '')) filesToDelete.delete(abs)
    }

    const sharedCleanableAssetAbs = [...dropAbs]
        .filter(abs => keepAbs.has(abs))
        .filter(abs => isCleanableAsset(allByAbs.get(abs) ?? ''))
    const unsafeSharedAssetDeletes = sharedCleanableAssetAbs
        .filter(abs => filesToDelete.has(abs))
        .map(abs => path.resolve(abs))

    const deleteList = uniqSorted([...filesToDelete].map(abs => path.resolve(abs)))
    const rewriteList = uniqSorted([...fileRewrites.keys()].map(abs => path.resolve(abs)))
    const keptWeapons = uniqSorted([...keptWeaponClasses].filter(name => name.startsWith('arc9_eft_')))
    const droppedWeapons = uniqSorted([...weaponInfos.keys()].filter(name => name.startsWith('arc9_eft_') && !keptWeaponClasses.has(name)))
    const sharedCleanableAssets = uniqSorted(sharedCleanableAssetAbs.map(abs => path.resolve(abs)))
    const sharedCleanableAssetCountByExtension = sharedCleanableAssets.reduce((acc, file) => {
        const ext = path.extname(file).toLowerCase() || '<none>'
        acc[ext] = (acc[ext] ?? 0) + 1
        return acc
    }, {})

    const report = {
        mode: apply ? 'apply' : 'dry-run',
        generatedAt: new Date().toISOString(),
        roots,
        outputPath,
        cleanOutput,
        keptWeapons,
        droppedWeapons,
        selectedAttachmentCount: selectedAttachmentIds.size,
        droppedAttachmentCount: droppedAttachmentIds.size,
        selectedAttachmentIds: uniqSorted([...selectedAttachmentIds]),
        selectedAttachmentCategories: uniqSorted([...neededCategories]),
        attachmentSafety: {
            ok: attachmentSafetyErrors.length === 0,
            errors: attachmentSafetyErrors,
            sharedCategoryCount: sharedAttachmentCategories.length,
            sharedCategories: sharedAttachmentCategories.sort((a, b) => a.category.localeCompare(b.category, undefined, { sensitivity: 'base' })),
        },
        sharedAssetSafety: {
            ok: unsafeSharedAssetDeletes.length === 0,
            droppedDependencySourceCount: droppedDependencySources.length,
            sharedCleanableAssetCount: sharedCleanableAssets.length,
            sharedCleanableAssetCountByExtension,
            unsafeDeletes: uniqSorted(unsafeSharedAssetDeletes),
            sampleSharedCleanableAssets: sharedCleanableAssets.slice(0, 200),
        },
        rewrites: rewriteList,
        deletes: deleteList,
        deleteCountByExtension: deleteList.reduce((acc, file) => {
            const ext = path.extname(file).toLowerCase() || '<none>'
            acc[ext] = (acc[ext] ?? 0) + 1
            return acc
        }, {}),
    }

    await fs.mkdir(path.dirname(reportPath), { recursive: true })
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8')

    if (apply && attachmentSafetyErrors.length > 0) {
        throw new Error(`Attachment safety check failed: ${attachmentSafetyErrors.length} issue(s). Inspect ${reportPath}`)
    }

    if (apply && unsafeSharedAssetDeletes.length > 0) {
        throw new Error(`Shared asset safety check failed: ${unsafeSharedAssetDeletes.length} shared asset(s) would be deleted. Inspect ${reportPath}`)
    }

    let outputSummary = null
    if (apply) {
        const preparedOutputPath = await prepareOutputDirectory(outputPath)
        outputSummary = await recreateCleanOutput(preparedOutputPath, allByAbs, filesToDelete, fileRewrites)
        report.outputPath = preparedOutputPath
        report.outputSummary = outputSummary
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8')
    }

    console.log(`${apply ? 'Applied' : 'Dry run'} ARC9 Russian pre-2014 cleanup`)
    console.log(`Kept weapons: ${keptWeapons.length}`)
    console.log(`Dropped weapons: ${droppedWeapons.length}`)
    console.log(`Selected attachments: ${selectedAttachmentIds.size}`)
    console.log(`Attachment safety: ${attachmentSafetyErrors.length === 0 ? 'ok' : `${attachmentSafetyErrors.length} issue(s)`}`)
    console.log(`Shared asset safety: ${unsafeSharedAssetDeletes.length === 0 ? `ok (${sharedCleanableAssets.length} shared assets kept)` : `${unsafeSharedAssetDeletes.length} issue(s)`}`)
    console.log(`Attachment Lua rewrites: ${rewriteList.length}`)
    console.log(`Files to delete: ${deleteList.length}`)
    if (outputSummary) {
        console.log(`Output: ${report.outputPath}`)
        console.log(`Copied files: ${outputSummary.files} (${outputSummary.rewritten} rewritten Lua files)`)
        console.log(`Fixed VMT files: ${outputSummary.fixedVmt}`)
        console.log(`Generated HDR VTF fallbacks: ${outputSummary.generatedHdrVtf}`)
        console.log(`Skipped duplicate merged paths: ${outputSummary.skippedDuplicateMergedPaths}`)
    } else if (outputPath) {
        console.log(`Output: ${outputPath}`)
    }
    console.log(`Report: ${reportPath}`)

    if (verbose) {
        console.log('\nKept weapons:')
        for (const name of keptWeapons) console.log(`  ${name}`)
        console.log('\nDelete count by extension:')
        for (const [ext, count] of Object.entries(report.deleteCountByExtension)) console.log(`  ${ext}: ${count}`)
        console.log('\nShared cleanable assets by extension:')
        for (const [ext, count] of Object.entries(sharedCleanableAssetCountByExtension)) console.log(`  ${ext}: ${count}`)
    }
}

if (help) {
    printHelp()
} else {
    main().catch(error => {
        console.error(error.stack || error.message || error)
        process.exitCode = 1
    })
}
