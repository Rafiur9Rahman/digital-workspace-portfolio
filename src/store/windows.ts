import { create } from 'zustand'
import { APPS, type AppId } from '../data/apps'

export interface WinState {
  id: string
  appId: AppId
  title: string
  x: number
  y: number
  width: number
  height: number
  z: number
  minimized: boolean
  maximized: boolean
  /** bounds saved before maximizing, restored on un-maximize */
  restore?: { x: number; y: number; width: number; height: number }
}

/** A request from one app to open another and point it at a specific record. */
export interface FocusRequest {
  appId: AppId
  ref: string
  nonce: number
}

interface WindowStore {
  windows: WinState[]
  topZ: number
  /** Set by openAppWith, consumed (and cleared) by the target app. */
  focusRequest: FocusRequest | null
  openApp: (appId: AppId) => void
  openAppWith: (appId: AppId, ref: string) => void
  clearFocusRequest: () => void
  close: (id: string) => void
  closeAll: () => void
  focus: (id: string) => void
  minimize: (id: string) => void
  restore: (id: string) => void
  toggleMaximize: (id: string, deskW: number, deskH: number) => void
  move: (id: string, x: number, y: number) => void
  resize: (id: string, width: number, height: number) => void
}

let seq = 0
let focusSeq = 0

export const useWindows = create<WindowStore>((set, get) => ({
  windows: [],
  topZ: 1,
  focusRequest: null,

  openApp: (appId) => {
    const app = APPS[appId]
    // If already open, just focus (and un-minimize) it.
    const existing = get().windows.find((w) => w.appId === appId)
    if (existing) {
      get().focus(existing.id)
      set((s) => ({
        windows: s.windows.map((w) =>
          w.id === existing.id ? { ...w, minimized: false } : w,
        ),
      }))
      return
    }

    const count = get().windows.length
    const z = get().topZ + 1
    set((s) => ({
      topZ: z,
      windows: [
        ...s.windows,
        {
          id: `win-${++seq}`,
          appId,
          title: app.title,
          x: 80 + count * 28,
          y: 64 + count * 28,
          width: app.defaultSize.width,
          height: app.defaultSize.height,
          z,
          minimized: false,
          maximized: false,
        },
      ],
    }))
  },

  // Open (or focus) an app and hand it a record to select on arrival.
  openAppWith: (appId, ref) => {
    get().openApp(appId)
    set({ focusRequest: { appId, ref, nonce: ++focusSeq } })
  },

  clearFocusRequest: () => set({ focusRequest: null }),

  close: (id) =>
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

  closeAll: () => set({ windows: [] }),

  focus: (id) =>
    set((s) => {
      const z = s.topZ + 1
      return {
        topZ: z,
        windows: s.windows.map((w) => (w.id === id ? { ...w, z } : w)),
      }
    }),

  minimize: (id) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, minimized: true } : w,
      ),
    })),

  // Un-minimize and raise to the front (used by the dock).
  restore: (id) =>
    set((s) => {
      const z = s.topZ + 1
      return {
        topZ: z,
        windows: s.windows.map((w) =>
          w.id === id ? { ...w, minimized: false, z } : w,
        ),
      }
    }),

  toggleMaximize: (id, deskW, deskH) =>
    set((s) => ({
      windows: s.windows.map((w) => {
        if (w.id !== id) return w
        if (w.maximized && w.restore) {
          return { ...w, ...w.restore, maximized: false, restore: undefined }
        }
        return {
          ...w,
          maximized: true,
          restore: { x: w.x, y: w.y, width: w.width, height: w.height },
          x: 0,
          y: 0,
          width: deskW,
          height: deskH,
        }
      }),
    })),

  move: (id, x, y) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    })),

  resize: (id, width, height) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, width, height } : w)),
    })),
}))
