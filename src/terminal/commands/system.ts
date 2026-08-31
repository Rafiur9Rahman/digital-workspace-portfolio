import type { CommandDef, OutputLine } from '../types'
import { ACHIEVEMENTS, getProgress } from '../achievements'

const clear: CommandDef = {
  name: 'clear',
  aliases: ['cls'],
  summary: 'clear the screen',
  run: () => ({ clear: true }),
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
    if (ctx.history.length === 0) return 'No commands yet.'
    return ctx.history.map((cmd, i) => `${String(i + 1).padStart(4)}  ${cmd}`)
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
  achievements,
  reboot,
  shutdown,
]
