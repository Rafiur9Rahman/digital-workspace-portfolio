import { WORKSPACE_VERSION } from './version'

/* First-visit welcome dialog state. localStorage, corrupt/unavailable-safe,
   never sent anywhere. It shows once, then stays gone until either the
   workspace version changes or a long time passes. */

const KEY = 'ws-welcome-v1'
const REVISIT_MS = 45 * 24 * 60 * 60 * 1000 // ~45 days

interface WelcomeRecord {
  version: string
  seenAt: number
}

let memory: WelcomeRecord | null = null

function read(): WelcomeRecord | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return memory
  }
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Partial<WelcomeRecord>
    if (typeof p.version !== 'string' || typeof p.seenAt !== 'number') return null
    return { version: p.version, seenAt: p.seenAt }
  } catch {
    return null
  }
}

export function shouldShowWelcome(): boolean {
  const r = read()
  if (!r) return true
  if (r.version !== WORKSPACE_VERSION) return true
  return Date.now() - r.seenAt > REVISIT_MS
}

export function markWelcomeSeen(): void {
  const rec: WelcomeRecord = { version: WORKSPACE_VERSION, seenAt: Date.now() }
  memory = rec
  try {
    localStorage.setItem(KEY, JSON.stringify(rec))
  } catch {
    /* memory only */
  }
}

export function forgetWelcome(): void {
  memory = null
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
