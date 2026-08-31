import { APP_IDS, APP_TITLES, type AppId } from '../../data/appMeta'
import type { CommandDef } from '../types'

/* Friendly names → real app ids. The canonical ids also work directly. */
const APP_ALIASES: Record<string, AppId> = {
  cv: 'resume',
  pokemon: 'gba',
  game: 'gba',
  gameboy: 'gba',
  ai: 'assistant',
  work: 'projects',
  me: 'about',
}

export function resolveApp(name: string): AppId | null {
  const key = name.toLowerCase()
  if ((APP_IDS as string[]).includes(key)) return key as AppId
  return APP_ALIASES[key] ?? null
}

const open: CommandDef = {
  name: 'open',
  summary: 'open an app window',
  usage: 'open <app>',
  run: (ctx) => {
    const target = ctx.args[0]
    if (!target) {
      return {
        lines: [
          { kind: 'error', text: 'Usage: open <app>' },
          { kind: 'muted', text: `Apps: ${APP_IDS.join(', ')}` },
        ],
      }
    }
    const id = resolveApp(target)
    if (!id) {
      return {
        lines: [
          { kind: 'error', text: `No app called '${target}'.` },
          { kind: 'muted', text: `Try: ${APP_IDS.join(', ')}` },
        ],
      }
    }
    ctx.openApp(id)
    return { lines: [{ kind: 'system', text: `Opening ${APP_TITLES[id]}…` }] }
  },
}

export const navigationCommands: CommandDef[] = [open]
