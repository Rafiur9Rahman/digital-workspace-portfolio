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

interface WindowStore {
  windows: WinState[]
  topZ: number
  openApp: (appId: AppId) => void
  close: (id: string) => void
  focus: (id: string) => void
  minimize: (id: string) => void
  toggleMaximize: (id: string, deskW: number, deskH: number) => void
  move: (id: string, x: number, y: number) => void
}

let seq = 0

export const useWindows = create<WindowStore>((set, get) => ({
  windows: [],
  topZ: 1,

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

  close: (id) =>
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

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
}))
