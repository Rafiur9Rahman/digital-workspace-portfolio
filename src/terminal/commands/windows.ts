import type { CommandContext, CommandDef, OutputLine } from '../types'
import { APP_IDS, APP_TITLES } from '../../data/appMeta'
import { resolveApp } from './navigation'

const ps: CommandDef = {
  name: 'ps',
  aliases: ['top', 'htop'],
  summary: 'list running apps',
  run: (ctx) => {
    const wins = ctx.listWindows()
    if (wins.length === 0) return 'No apps running.'
    return {
      lines: [
        { kind: 'muted', text: `  ${'PID'.padEnd(5)}${'APP'.padEnd(22)}STATE` },
        ...wins.map<OutputLine>((w, i) => ({
          kind: 'output',
          text: `  ${String(i + 1).padEnd(5)}${w.title.padEnd(22)}${
            w.minimized ? 'minimized' : 'running'
          }`,
        })),
      ],
    }
  },
}

const apps: CommandDef = {
  name: 'apps',
  summary: 'list installed apps',
  run: (ctx) => {
    const running = new Set(ctx.listWindows().map((w) => w.appId))
    return {
      lines: APP_IDS.map<OutputLine>((appId) => ({
        kind: running.has(appId) ? 'system' : 'muted',
        text: `  ${running.has(appId) ? '●' : '○'}  ${APP_TITLES[appId]}`,
      })),
    }
  },
}

function targetWindow(ctx: CommandContext, raw: string | undefined) {
  if (!raw) return { error: 'usage' as const }
  const appId = resolveApp(raw)
  const open = appId && ctx.listWindows().some((w) => w.appId === appId)
  if (!appId || !open) return { error: 'notfound' as const, appId }
  return { appId }
}

const kill: CommandDef = {
  name: 'kill',
  summary: 'close an app',
  usage: 'kill <app>',
  run: (ctx) => {
    const t = targetWindow(ctx, ctx.args[0])
    if (t.error === 'usage') return { lines: [{ kind: 'error', text: 'Usage: kill <app>' }] }
    if (t.error) return { lines: [{ kind: 'error', text: `kill: ${ctx.args[0]}: no such process` }] }
    ctx.closeApp(t.appId)
    return { lines: [{ kind: 'system', text: `Terminated ${APP_TITLES[t.appId]}.` }] }
  },
}

const focus: CommandDef = {
  name: 'focus',
  summary: 'bring an app to the front',
  usage: 'focus <app>',
  run: (ctx) => {
    const t = targetWindow(ctx, ctx.args[0])
    if (t.error === 'usage') return { lines: [{ kind: 'error', text: 'Usage: focus <app>' }] }
    if (t.error) return { lines: [{ kind: 'error', text: `focus: ${ctx.args[0]}: not open` }] }
    ctx.focusApp(t.appId)
    return { lines: [{ kind: 'system', text: `Focused ${APP_TITLES[t.appId]}.` }] }
  },
}

const minimize: CommandDef = {
  name: 'minimize',
  aliases: ['minimise'],
  summary: 'minimise an app',
  usage: 'minimize <app>',
  run: (ctx) => {
    const t = targetWindow(ctx, ctx.args[0])
    if (t.error === 'usage') return { lines: [{ kind: 'error', text: 'Usage: minimize <app>' }] }
    if (t.error) return { lines: [{ kind: 'error', text: `minimize: ${ctx.args[0]}: not open` }] }
    ctx.minimizeApp(t.appId)
    return { lines: [{ kind: 'system', text: `Minimised ${APP_TITLES[t.appId]}.` }] }
  },
}

const desktop: CommandDef = {
  name: 'desktop',
  summary: 'minimise everything',
  run: (ctx) => {
    ctx.minimizeAll()
    return { lines: [{ kind: 'system', text: 'Show desktop.' }] }
  },
}

export const windowCommands: CommandDef[] = [ps, apps, kill, focus, minimize, desktop]
