export const RUN_MODES = ['vmf-pack', 'content-pack', 'content-split'] as const

export type RunMode = (typeof RUN_MODES)[number]

export const DEFAULT_RUN_MODE: RunMode = 'vmf-pack'

export function normalizeRunMode(value: string | null | undefined): RunMode | null {
    if (!value) return DEFAULT_RUN_MODE

    const normalized = value.trim().toLowerCase()
    if (normalized === 'vmf-pack' || normalized === 'vmf') return 'vmf-pack'
    if (normalized === 'content-pack' || normalized === 'content') return 'content-pack'
    if (normalized === 'content-split' || normalized === 'split') return 'content-split'

    return null
}
