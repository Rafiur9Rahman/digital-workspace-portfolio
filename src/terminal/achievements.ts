/* Terminal achievements — persisted in localStorage under a namespaced key.
   The unlock *triggers* live in individual commands (wired in Phase 4/5); this
   module is just storage + definitions. It degrades to in-memory state if
   localStorage is unavailable (private mode) or corrupt. */

export type AchievementId =
  | 'wake-up-neo'
  | 'curious-mind'
  | 'root-access'
  | 'dangerous-individual'
  | 'the-answer'
  | 'time-traveller'
  | 'konami-code'

export interface AchievementDef {
  id: AchievementId
  title: string
  /** shown once unlocked — deliberately vague about how to get it */
  hint: string
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'wake-up-neo', title: 'Wake Up, Neo', hint: 'Follow the white rabbit.' },
  { id: 'curious-mind', title: 'Curious Mind', hint: 'Poke at things that are not in the manual.' },
  { id: 'root-access', title: 'Root Access', hint: 'Ask nicely. With sudo.' },
  { id: 'dangerous-individual', title: 'Dangerous Individual', hint: 'Try to burn it all down.' },
  { id: 'the-answer', title: 'The Answer', hint: 'Life, the universe, and everything.' },
  { id: 'time-traveller', title: 'Time Traveller', hint: 'Turn it off and on again.' },
  { id: 'konami-code', title: 'The Old Ways', hint: 'Up, up, down, down…' },
]

const KEY = 'ws-terminal-v1'

interface Store {
  unlocked: Partial<Record<AchievementId, number>>
  /** hidden command names the visitor has discovered (feeds 'curious-mind') */
  hiddenSeen: string[]
}

let memory: Store = { unlocked: {}, hiddenSeen: [] }

function read(): Store {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    // storage genuinely unavailable (private mode) — fall back to this session's
    // in-memory copy so unlocks still work until reload.
    return { ...memory }
  }
  if (!raw) return { unlocked: {}, hiddenSeen: [] }
  try {
    const parsed = JSON.parse(raw) as Partial<Store>
    return {
      unlocked:
        parsed.unlocked && typeof parsed.unlocked === 'object' ? parsed.unlocked : {},
      hiddenSeen: Array.isArray(parsed.hiddenSeen) ? parsed.hiddenSeen : [],
    }
  } catch {
    // corrupt value — treat as a fresh store rather than trusting stale memory.
    return { unlocked: {}, hiddenSeen: [] }
  }
}

function write(store: Store): void {
  memory = store
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    /* private mode / disabled — memory only */
  }
}

export function isUnlocked(id: AchievementId): boolean {
  return Boolean(read().unlocked[id])
}

/** Returns true if this call *newly* unlocked the achievement. */
export function unlock(id: AchievementId): boolean {
  const store = read()
  if (store.unlocked[id]) return false
  store.unlocked[id] = Date.now()
  write(store)
  return true
}

/** Number of distinct hidden commands that unlocks 'curious-mind'. */
export const CURIOUS_MIND_THRESHOLD = 4

/** Record that a hidden command was discovered. Unlocks 'curious-mind' once
    enough distinct ones have been found. Returns the discovered count. */
export function noteHiddenDiscovery(name: string): number {
  const store = read()
  if (!store.hiddenSeen.includes(name)) {
    store.hiddenSeen.push(name)
    write(store)
  }
  if (store.hiddenSeen.length >= CURIOUS_MIND_THRESHOLD) {
    unlock('curious-mind')
  }
  return store.hiddenSeen.length
}

export function getProgress(): { unlocked: AchievementId[]; total: number } {
  const store = read()
  return {
    unlocked: ACHIEVEMENTS.map((a) => a.id).filter((id) => Boolean(store.unlocked[id])),
    total: ACHIEVEMENTS.length,
  }
}
