import type { AppId } from '../data/appMeta'
import type { AchievementId } from './achievements'
import type { FileSystem } from './filesystem'
import type { TerminalTheme } from './prefs'

export type { TerminalTheme }

export type LineKind = 'input' | 'output' | 'error' | 'system' | 'muted' | 'accent'

export interface OutputLine {
  kind: LineKind
  text: string
}

export type TerminalEffect = 'matrix' | 'party' | 'snake'

export interface TerminalWindow {
  appId: AppId
  title: string
  minimized: boolean
}

/* What a command hands back. A bare string / string[] is shorthand for
   'output' lines; the object form covers everything else. */
export type CommandResult =
  | void
  | string
  | string[]
  | {
      lines?: OutputLine[]
      clear?: boolean
      cwd?: string
      effect?: TerminalEffect
      theme?: TerminalTheme
    }

export interface CommandContext {
  /** tokens after the command name, quotes stripped */
  args: string[]
  /** the full command line as entered, trimmed */
  raw: string
  /** commands submitted this session, oldest first, including the current one */
  history: string[]
  /** current directory in the fake filesystem, e.g. "/" or "/projects" */
  cwd: string
  /** the read-only portfolio filesystem */
  fs: FileSystem
  /** every registered command — for `help` and discovery, without importing the registry */
  listCommands: () => CommandDef[]
  /** append a line to the terminal now (for streamed / async output) */
  print: (line: OutputLine | string) => void
  /** aborts on unmount / Ctrl+C / `clear` */
  signal: AbortSignal
  /** the visitor prefers reduced motion — skip animated buildup, show the result */
  reducedMotion: boolean
  /** ms since the workspace session started */
  uptimeMs: number
  /** the active terminal theme */
  terminalTheme: TerminalTheme

  // --- controlled OS actions: commands never touch React or the DOM directly ---
  openApp: (id: AppId) => void
  openUrl: (url: string) => void
  reboot: () => void
  shutdown: () => void
  setCwd: (path: string) => void
  unlock: (id: AchievementId) => void
  /** open windows, front-most last */
  listWindows: () => TerminalWindow[]
  closeApp: (id: AppId) => void
  focusApp: (id: AppId) => void
  minimizeApp: (id: AppId) => void
  minimizeAll: () => void
  /** wipe the ↑/↓ command history for this session */
  clearHistory: () => void
  /** clear everything the site remembers about this visitor */
  forgetMe: () => void
}

export interface CommandDef {
  name: string
  aliases?: string[]
  summary: string
  usage?: string
  /** kept out of `help` — easter eggs */
  hidden?: boolean
  run: (ctx: CommandContext) => CommandResult | Promise<CommandResult>
}
