import { APP_TITLES } from '../../data/appMeta'
import type { CommandDef, OutputLine } from '../types'
import { sleep } from '../util'
import { FORTUNES, HACK_SEQUENCE } from './data'

const bar = (fraction: number, width = 20) => {
  const filled = Math.round(fraction * width)
  return `[${'█'.repeat(filled)}${'░'.repeat(width - filled)}] ${Math.round(fraction * 100)}%`
}

const matrix: CommandDef = {
  name: 'matrix',
  summary: 'follow the white rabbit',
  hidden: true,
  run: (ctx) => {
    ctx.unlock('wake-up-neo')
    return {
      lines: [{ kind: 'muted', text: 'Wake up, Neo… (ESC or click to exit)' }],
      effect: 'matrix',
    }
  },
}

const coffee: CommandDef = {
  name: 'coffee',
  aliases: ['brew'],
  summary: 'brew developer fuel',
  hidden: true,
  run: async (ctx) => {
    ctx.print('Brewing developer fuel...')
    if (ctx.reducedMotion) {
      ctx.print({ kind: 'muted', text: bar(1) })
    } else {
      for (let i = 1; i <= 5; i++) {
        await sleep(180, ctx.signal)
        if (ctx.signal.aborted) return
        ctx.print({ kind: 'muted', text: bar(i / 5) })
      }
    }
    return {
      lines: [
        { kind: 'system', text: '☕ Coffee ready.' },
        { kind: 'muted', text: 'Productivity +15%' },
      ],
    }
  },
}

const answer: CommandDef = {
  name: '42',
  summary: 'the answer',
  hidden: true,
  run: (ctx) => {
    ctx.unlock('the-answer')
    return {
      lines: [
        { kind: 'output', text: 'The Answer to the Ultimate Question of Life, the Universe, and Everything.' },
        { kind: 'muted', text: 'You are going to need a bigger towel.' },
      ],
    }
  },
}

const fortune: CommandDef = {
  name: 'fortune',
  summary: 'a developer fortune',
  hidden: true,
  run: () => ({
    lines: [{ kind: 'output', text: FORTUNES[Math.floor(Math.random() * FORTUNES.length)] }],
  }),
}

const sudo: CommandDef = {
  name: 'sudo',
  summary: 'execute a command as the superuser',
  hidden: true,
  run: async (ctx) => {
    if (ctx.args.join(' ').toLowerCase() === 'hire rafiur') {
      ctx.print('Verifying credentials...')
      if (!ctx.reducedMotion) await sleep(650, ctx.signal)
      if (ctx.signal.aborted) return
      ctx.unlock('root-access')
      ctx.openApp('contact')
      return {
        lines: [
          { kind: 'system', text: 'Access granted.' },
          { kind: 'output', text: `Opening ${APP_TITLES.contact}. Let's talk.` },
        ],
      }
    }
    return {
      lines: [
        { kind: 'error', text: 'rafiur is not in the sudoers file.' },
        { kind: 'error', text: 'This incident will be reported.' },
      ],
    }
  },
}

const hack: CommandDef = {
  name: 'hack',
  summary: 'gain unauthorised access',
  hidden: true,
  run: async (ctx) => {
    for (const line of HACK_SEQUENCE) {
      ctx.print({ kind: 'muted', text: line })
      if (!ctx.reducedMotion) await sleep(480, ctx.signal)
      if (ctx.signal.aborted) return
    }
    return {
      lines: [
        { kind: 'error', text: '' },
        { kind: 'error', text: 'ACCESS DENIED' },
        { kind: 'muted', text: '' },
        { kind: 'muted', text: 'Reason: you are viewing a portfolio website.' },
      ],
    }
  },
}

const rm: CommandDef = {
  name: 'rm',
  summary: 'remove files',
  hidden: true,
  run: async (ctx) => {
    const flags = ctx.args.filter((a) => a.startsWith('-')).join('').replace(/-/g, '')
    const target = ctx.args.find((a) => !a.startsWith('-'))
    const nuke = /r/.test(flags) && /f/.test(flags) && (target === '/' || target === '~' || target === '/*')

    if (!nuke) {
      return { lines: [{ kind: 'error', text: 'rm: nice try, this exhibit is read-only.' }] }
    }

    ctx.unlock('dangerous-individual')
    for (const dir of ['/projects', '/experience', '/skills', '/certifications']) {
      ctx.print({ kind: 'muted', text: `Deleting ${dir}...` })
      if (!ctx.reducedMotion) await sleep(340, ctx.signal)
      if (ctx.signal.aborted) return
    }
    if (!ctx.reducedMotion) {
      ctx.print({ kind: 'muted', text: `${'█'.repeat(19)}░ 99%` })
      await sleep(700, ctx.signal)
      if (ctx.signal.aborted) return
    }
    return {
      lines: [
        { kind: 'system', text: 'Operation cancelled.' },
        { kind: 'muted', text: 'Nice try.' },
      ] satisfies OutputLine[],
    }
  },
}

const pokemon: CommandDef = {
  name: 'pokemon',
  aliases: ['pokémon'],
  summary: 'gotta debug em all',
  hidden: true,
  run: (ctx) => {
    ctx.openApp('gba')
    return { lines: [{ kind: 'system', text: `Opening ${APP_TITLES.gba}…` }] }
  },
}

const party: CommandDef = {
  name: 'party',
  summary: 'throw a small party',
  hidden: true,
  run: () => ({
    lines: [{ kind: 'system', text: '🎉 Party mode.' }],
    effect: 'party',
  }),
}

const snake: CommandDef = {
  name: 'snake',
  summary: 'play snake',
  hidden: true,
  run: () => ({ lines: [{ kind: 'muted', text: 'loading snake…' }], effect: 'snake' }),
}

export const easterEggCommands: CommandDef[] = [
  matrix,
  coffee,
  answer,
  fortune,
  sudo,
  hack,
  rm,
  pokemon,
  party,
  snake,
]
