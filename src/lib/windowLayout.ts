import type { AppId } from '../data/apps'

/* Per-app window bounds, remembered across close/reopen. */
export interface WinLayout {
  x: number
  y: number
  width: number
  height: number
}

const KEY = 'ws-window-layout-v1'

function readAll(): Record<string, WinLayout> {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Record<string, WinLayout>
  } catch {
    /* ignore */
  }
  return {}
}

export function loadLayout(appId: AppId): WinLayout | null {
  return readAll()[appId] ?? null
}

export function saveLayout(appId: AppId, layout: WinLayout) {
  try {
    const all = readAll()
    all[appId] = layout
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}
