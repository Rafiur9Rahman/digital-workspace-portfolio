import type { AppId } from '../data/appMeta'
import type { AchievementId } from './achievements'
import type { FileSystem } from './filesystem'

export type LineKind = 'input' | 'output' | 'error' | 'system' | 'muted' | 'accent'

export interface OutputLine {
  kind: LineKind
  text: string
}

export type TerminalEffect = 'matrix' | 'party'

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

  // --- controlled OS actions: commands never touch React or the DOM directly ---
  openApp: (id: AppId) => void
  openUrl: (url: string) => void
  reboot: () => void
  shutdown: () => void
  setCwd: (path: string) => void
  unlock: (id: AchievementId) => void
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
