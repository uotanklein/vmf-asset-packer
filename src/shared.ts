import path from 'path'
import fsp from 'fs/promises'

export const DEFAULT_WORKSPACE_DIR = path.resolve('workspace')
export const DEFAULT_VMF_MAPS_DIR = path.join(DEFAULT_WORKSPACE_DIR, '01_vmf_maps')
export const DEFAULT_VMF_CONTENT_ROOT_DIR = path.join(DEFAULT_WORKSPACE_DIR, '02_vmf_content_root')
export const DEFAULT_VMF_PACK_OUTPUT_DIR = path.join(DEFAULT_WORKSPACE_DIR, '03_vmf_pack_output')
export const DEFAULT_CONTENT_PACK_SOURCE_DIR = path.join(DEFAULT_WORKSPACE_DIR, '04_addons_source')
export const DEFAULT_CONTENT_PACK_OUTPUT_DIR = path.join(DEFAULT_WORKSPACE_DIR, '05_addons_merged')
export const DEFAULT_CONTENT_SPLIT_OUTPUT_DIR = path.join(DEFAULT_WORKSPACE_DIR, '06_content_split')

export type RunEvent =
    | { type: 'info'; message: string }
    | { type: 'debug'; tag: string; message: string }
    | { type: 'scanning'; message: string }
    | { type: 'scanned'; total: number }
    | { type: 'progress'; processed: number; total: number; file: string }
    | { type: 'warn'; message: string }
    | { type: 'error'; stage: 'exec' | 'copy' | 'fatal'; file?: string; message: string }
    | { type: 'done'; processed: number; execErrors: number; copyErrors: number }

export type ProtectedPath = {
    path: string
    label: string
}

export async function pathExists(filePath: string): Promise<boolean> {
    try {
        await fsp.access(filePath)
        return true
    } catch {
        return false
    }
}

export async function resolveRealPath(targetPath: string): Promise<string> {
    const resolved = path.resolve(targetPath)

    try {
        return await fsp.realpath(resolved)
    } catch (error) {
        const err = error as NodeJS.ErrnoException
        if (err.code !== 'ENOENT') throw error
    }

    let current = resolved
    while (true) {
        const parent = path.dirname(current)
        if (parent === current) return resolved

        try {
            const realParent = await fsp.realpath(parent)
            return path.join(realParent, path.relative(parent, resolved))
        } catch (error) {
            const err = error as NodeJS.ErrnoException
            if (err.code !== 'ENOENT') throw error
            current = parent
        }
    }
}

export function isSameOrInside(parentPath: string, childPath: string): boolean {
    const relativePath = path.relative(
        path.resolve(parentPath).toLowerCase(),
        path.resolve(childPath).toLowerCase(),
    )

    return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
}

export function getUnsafeOutputReason(outputPath: string, protectedPaths: ProtectedPath[]): string | null {
    const resolvedOutputPath = path.resolve(outputPath)
    const parsedOutputPath = path.parse(resolvedOutputPath)

    if (resolvedOutputPath === parsedOutputPath.root) {
        return `Нельзя очищать корень диска: ${resolvedOutputPath}`
    }

    for (const protectedPath of protectedPaths) {
        const resolvedProtectedPath = path.resolve(protectedPath.path)
        if (isSameOrInside(resolvedOutputPath, resolvedProtectedPath)) {
            return `Нельзя очищать output, потому что внутри находится ${protectedPath.label}: ${resolvedOutputPath}`
        }
    }

    return null
}

export async function ensureCleanOutputDirectory(
    outputPath: string,
    protectedPaths: ProtectedPath[],
): Promise<void> {
    const resolvedOutputPath = path.resolve(outputPath)
    const unsafeReason = getUnsafeOutputReason(resolvedOutputPath, protectedPaths)

    if (unsafeReason) {
        throw new Error(unsafeReason)
    }

    try {
        const stat = await fsp.stat(resolvedOutputPath)
        if (!stat.isDirectory()) {
            throw new Error(`outputPath не указывает на папку: ${resolvedOutputPath}`)
        }
    } catch (error) {
        const err = error as NodeJS.ErrnoException
        if (err.code !== 'ENOENT') throw error
    }

    await fsp.rm(resolvedOutputPath, { recursive: true, force: true })
    await fsp.mkdir(resolvedOutputPath, { recursive: true })
}

export async function ensureOutputDirectory(outputPath: string): Promise<boolean> {
    const resolvedOutputPath = path.resolve(outputPath)

    try {
        const stat = await fsp.stat(resolvedOutputPath)
        if (!stat.isDirectory()) {
            throw new Error(`outputPath не указывает на папку: ${resolvedOutputPath}`)
        }
        return false
    } catch (error) {
        const err = error as NodeJS.ErrnoException
        if (err.code !== 'ENOENT') throw error
    }

    await fsp.mkdir(resolvedOutputPath, { recursive: true })
    return true
}

export function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let value = bytes
    let unitIndex = 0

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024
        unitIndex += 1
    }

    if (unitIndex === 0) {
        return `${bytes} ${units[unitIndex]}`
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`
}
