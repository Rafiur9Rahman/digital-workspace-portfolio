/* Per-device "have you been here before" record. localStorage, never sent
   anywhere, corrupt/unavailable-safe. `visits` counts once per browser session
   (a sessionStorage guard), so a reload isn't a new visit. */

export interface VisitorRecord {
  firstSeen: number
  lastSeen: number
  visits: number
  /** the full boot cinematic has played at least once */
  bootSeen: boolean
}

export interface VisitInfo {
  isFirstVisit: boolean
  visits: number
  /** previous lastSeen, before this load updated it (null on first visit) */
  previousVisit: number | null
}

const KEY = 'ws-visitor-v1'
const SESSION_KEY = 'ws-visit-counted'

let memory: VisitorRecord | null = null

function read(): VisitorRecord | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    // storage unavailable (private mode) — use this session's copy
    return memory
  }
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Partial<VisitorRecord>
    if (typeof p.firstSeen !== 'number') return null
    return {
      firstSeen: p.firstSeen,
      lastSeen: typeof p.lastSeen === 'number' ? p.lastSeen : p.firstSeen,
      visits: typeof p.visits === 'number' && p.visits > 0 ? p.visits : 1,
      bootSeen: p.bootSeen === true,
    }
  } catch {
    return null
  }
}

function write(record: VisitorRecord): void {
  memory = record
  try {
    localStorage.setItem(KEY, JSON.stringify(record))
  } catch {
    /* memory only */
  }
}

function countedThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function markSessionCounted(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    /* ignore */
  }
}

/** Call once per page load. Records the visit; returns what we knew *before*. */
export function recordVisit(): VisitInfo {
  const now = Date.now()
  const existing = read()

  if (!existing) {
    write({ firstSeen: now, lastSeen: now, visits: 1, bootSeen: false })
    markSessionCounted()
    return { isFirstVisit: true, visits: 1, previousVisit: null }
  }

  const alreadyCounted = countedThisSession()
  const visits = alreadyCounted ? existing.visits : existing.visits + 1
  write({ ...existing, lastSeen: now, visits })
  if (!alreadyCounted) markSessionCounted()

  return { isFirstVisit: false, visits, previousVisit: existing.lastSeen }
}

export function hasSeenBoot(): boolean {
  return read()?.bootSeen === true
}

export function markBootSeen(): void {
  const record = read()
  if (record) {
    if (!record.bootSeen) write({ ...record, bootSeen: true })
  } else {
    const now = Date.now()
    write({ firstSeen: now, lastSeen: now, visits: 1, bootSeen: true })
  }
}

/** Wipe the visitor record (used by `forget me`). */
export function forgetVisitor(): void {
  memory = null
  try {
    localStorage.removeItem(KEY)
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}
