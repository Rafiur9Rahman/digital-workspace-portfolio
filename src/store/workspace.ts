import { create } from 'zustand'
import { useWindows } from './windows'

export type WorkspacePower = 'booting' | 'running' | 'shutdown'

interface WorkspaceStore {
  power: WorkspacePower
  /** when this browser session started — for `uptime` / `neofetch` */
  startedAt: number
  /** replay the cinematic boot, landing on a clean desktop */
  reboot: () => void
  /** fake OS power-off — ShutdownScreen owns the screen until powerOn/reboot */
  shutdown: () => void
  /** called by BootScreen once the cinematic finishes */
  powerOn: () => void
}

/* The single source of truth for whether the boot screen / shutdown screen is
   up. App.tsx renders from `power`; the terminal's reboot/shutdown commands
   call the actions here. No desktop state is duplicated — windows stay in
   useWindows, which `reboot` clears via its own `closeAll`. */
export const useWorkspace = create<WorkspaceStore>((set) => ({
  power: 'booting',
  startedAt: Date.now(),
  reboot: () => {
    useWindows.getState().closeAll()
    set({ power: 'booting' })
  },
  shutdown: () => set({ power: 'shutdown' }),
  powerOn: () => set({ power: 'running' }),
}))
