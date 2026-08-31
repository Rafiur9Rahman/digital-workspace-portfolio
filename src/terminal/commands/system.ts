import type { CommandDef, OutputLine } from '../types'
import { ACHIEVEMENTS, getProgress } from '../achievements'
import { formatDuration } from '../util'

const clear: CommandDef = {
  name: 'clear',
  aliases: ['cls'],
  summary: 'clear the screen',
  run: (ctx) => {
    if (ctx.args[0] === '--all') {
      ctx.clearHistory()
      return { clear: true, lines: [{ kind: 'muted', text: 'Screen and history cleared.' }] }
    }
    return { clear: true }
  },
}

const date: CommandDef = {
  name: 'date',
  summary: 'print the current date and time',
  run: () => new Date().toString(),
}

const echo: CommandDef = {
  name: 'echo',
  summary: 'print text',
  usage: 'echo <text>',
  run: (ctx) => ctx.raw.replace(/^echo\s?/i, ''),
}

const history: CommandDef = {
  name: 'history',
  summary: 'show command history',
  run: (ctx) => {
    if (ctx.args[0] === '-c') {
      ctx.clearHistory()
      return { lines: [{ kind: 'system', text: 'History cleared.' }] }
    }
    if (ctx.history.length === 0) return 'No commands yet.'
    return ctx.history.map((cmd, i) => `${String(i + 1).padStart(4)}  ${cmd}`)
  },
}

const alias: CommandDef = {
  name: 'alias',
  summary: 'list command aliases',
  run: (ctx) => ({
    lines: ctx
      .listCommands()
      .filter((c) => c.aliases?.length && !c.hidden)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ kind: 'output', text: `${c.name.padEnd(14)} ${c.aliases!.join(', ')}` })),
  }),
}

const theme: CommandDef = {
  name: 'theme',
  summary: 'show the current theme',
  run: (ctx) =>
    ctx.args[0]
      ? { lines: [{ kind: 'muted', text: "Only the 'dark' theme is available right now." }] }
      : 'RafiurOS · dark',
}

const status: CommandDef = {
  name: 'status',
  summary: 'compact system status',
  run: (ctx) => {
    const open = ctx.listWindows().filter((w) => !w.minimized).length
    const progress = getProgress()
    return {
      lines: [
        { kind: 'output', text: `apps         ${open} open` },
        { kind: 'output', text: `uptime       ${formatDuration(ctx.uptimeMs)}` },
        { kind: 'output', text: `directory    ${ctx.cwd}` },
        { kind: 'output', text: `achievements ${progress.unlocked.length}/${progress.total}` },
      ],
    }
  },
}

const stats: CommandDef = {
  name: 'stats',
  summary: 'session stats',
  run: (ctx) => {
    const progress = getProgress()
    return {
      lines: [
        { kind: 'output', text: `commands run   ${ctx.history.length}` },
        { kind: 'output', text: `achievements   ${progress.unlocked.length}/${progress.total}` },
        { kind: 'output', text: `uptime         ${formatDuration(ctx.uptimeMs)}` },
      ],
    }
  },
}

const achievements: CommandDef = {
  name: 'achievements',
  aliases: ['ach'],
  summary: 'show unlocked achievements',
  run: () => {
    const { unlocked, total } = getProgress()
    const done = new Set(unlocked)
    const lines: OutputLine[] = [
      { kind: 'output', text: `Achievements  ${unlocked.length}/${total}` },
      { kind: 'muted', text: '' },
    ]
    for (const a of ACHIEVEMENTS) {
      lines.push(
        done.has(a.id)
          ? { kind: 'system', text: `  ✓  ${a.title}` }
          : { kind: 'muted', text: `  ·  ??? — ${a.hint}` },
      )
    }
    return { lines }
  },
}

/* reboot / shutdown drive the real BootScreen + ShutdownScreen via the
   workspace store — no duplicate boot animation. Hidden from `help` (they sit
   with the other playful commands), but they're ordinary names people try. */
const reboot: CommandDef = {
  name: 'reboot',
  aliases: ['restart'],
  summary: 'restart the workspace',
  hidden: true,
  run: (ctx) => {
    ctx.unlock('time-traveller')
    ctx.reboot()
    return { lines: [{ kind: 'system', text: 'Restarting workspace…' }] }
  },
}

const shutdown: CommandDef = {
  name: 'shutdown',
  aliases: ['poweroff'],
  summary: 'power off the workspace',
  hidden: true,
  run: (ctx) => {
    ctx.shutdown()
    return { lines: [{ kind: 'system', text: 'Powering off…' }] }
  },
}

export const systemCommands: CommandDef[] = [
  clear,
  date,
  echo,
  history,
  alias,
  theme,
  status,
  stats,
  achievements,
  reboot,
  shutdown,
]
