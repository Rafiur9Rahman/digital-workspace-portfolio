/* Small localStorage-backed terminal preferences that persist across visits:
   the chosen theme, an all-time command counter, and the Snake high score.
   Degrades to in-memory when storage is unavailable or corrupt (like
   achievements.ts). Namespaced key, separate from ws-terminal-v1. */

export type TerminalTheme = 'dark' | 'matrix' | 'amber' | 'mono'

export interface TerminalPrefs {
  theme: TerminalTheme
  commandsRun: number
  snakeBest: number
}

const KEY = 'ws-terminal-prefs-v1'
const THEMES: TerminalTheme[] = ['dark', 'matrix', 'amber', 'mono']

let memory: TerminalPrefs = { theme: 'dark', commandsRun: 0, snakeBest: 0 }

export function loadPrefs(): TerminalPrefs {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return { ...memory }
  }
  if (!raw) return { theme: 'dark', commandsRun: 0, snakeBest: 0 }
  try {
    const parsed = JSON.parse(raw) as Partial<TerminalPrefs>
    return {
      theme: THEMES.includes(parsed.theme as TerminalTheme)
        ? (parsed.theme as TerminalTheme)
        : 'dark',
      commandsRun: Number.isFinite(parsed.commandsRun) ? Number(parsed.commandsRun) : 0,
      snakeBest: Number.isFinite(parsed.snakeBest) ? Number(parsed.snakeBest) : 0,
    }
  } catch {
    return { theme: 'dark', commandsRun: 0, snakeBest: 0 }
  }
}

export function savePrefs(patch: Partial<TerminalPrefs>): TerminalPrefs {
  const next = { ...loadPrefs(), ...patch }
  memory = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* memory only */
  }
  return next
}

/** Increment the all-time command counter; returns the new total. */
export function bumpCommandCount(): number {
  return savePrefs({ commandsRun: loadPrefs().commandsRun + 1 }).commandsRun
}
