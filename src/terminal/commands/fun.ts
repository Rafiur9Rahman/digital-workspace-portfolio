import type { CommandDef, OutputLine } from '../types'
import { sleep } from '../util'

const JOKES = [
  'Why do programmers prefer dark mode? Because light attracts bugs.',
  'A SQL query walks into a bar, walks up to two tables and asks: "May I join you?"',
  'I would tell you a UDP joke, but you might not get it.',
  "There are only two hard problems in distributed systems: 2. exactly-once delivery 1. guaranteed order of messages 2. exactly-once delivery.",
  '99 little bugs in the code. Take one down, patch it around. 127 little bugs in the code.',
  'It works on my machine. Then we\'ll ship your machine.',
  'To understand recursion, see: "To understand recursion".',
]

const QUOTES = [
  'Programs must be written for people to read. - Abelson & Sussman',
  'Simplicity is prerequisite for reliability. - Dijkstra',
  'Make it work, make it right, make it fast. - Kent Beck',
  "The cheapest, fastest and most reliable components are those that aren't there. - Gordon Bell",
  'Talk is cheap. Show me the code. - Linus Torvalds',
  'Good programmers write code humans can understand. - Martin Fowler',
]

const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)]

const joke: CommandDef = {
  name: 'joke',
  summary: 'a developer joke',
  run: () => pick(JOKES),
}

const quote: CommandDef = {
  name: 'quote',
  aliases: ['motd'],
  summary: 'a programming quote',
  run: () => pick(QUOTES),
}

const coinflip: CommandDef = {
  name: 'coinflip',
  aliases: ['flip'],
  summary: 'flip a coin',
  hidden: true,
  run: () => `🪙  ${Math.random() < 0.5 ? 'Heads' : 'Tails'}`,
}

const roll: CommandDef = {
  name: 'roll',
  summary: 'roll a die',
  usage: 'roll [sides]',
  hidden: true,
  run: (ctx) => {
    const sides = Math.max(2, Math.min(1000, Math.floor(Number(ctx.args[0])) || 6))
    return `🎲  d${sides} → ${1 + Math.floor(Math.random() * sides)}`
  },
}

/* Tiny recursive-descent arithmetic - no eval, no Function. */
function evaluate(src: string): number {
  const s = src.replace(/\s+/g, '')
  let i = 0
  const number = () => {
    const start = i
    if (s[i] === '-') i++
    while (i < s.length && /[0-9.]/.test(s[i])) i++
    const v = parseFloat(s.slice(start, i))
    if (Number.isNaN(v)) throw new Error('parse')
    return v
  }
  const factor = (): number => {
    if (s[i] === '(') {
      i++
      const v = expr()
      if (s[i] !== ')') throw new Error('parse')
      i++
      return v
    }
    return number()
  }
  const term = (): number => {
    let v = factor()
    while (s[i] === '*' || s[i] === '/' || s[i] === '%') {
      const op = s[i++]
      const r = factor()
      v = op === '*' ? v * r : op === '/' ? v / r : v % r
    }
    return v
  }
  function expr(): number {
    let v = term()
    while (s[i] === '+' || s[i] === '-') {
      const op = s[i++]
      const r = term()
      v = op === '+' ? v + r : v - r
    }
    return v
  }
  const result = expr()
  if (i < s.length) throw new Error('parse')
  return result
}

const calc: CommandDef = {
  name: 'calc',
  summary: 'quick calculator',
  usage: 'calc <expression>',
  run: (ctx) => {
    const expression = ctx.args.join(' ')
    if (!expression) return { lines: [{ kind: 'error', text: 'Usage: calc 12 * 8' }] }
    if (!/^[0-9+\-*/%.()\s]+$/.test(expression)) {
      return { lines: [{ kind: 'error', text: 'calc: only numbers and + - * / % ( )' }] }
    }
    try {
      const result = evaluate(expression)
      if (!Number.isFinite(result)) throw new Error('inf')
      return `${expression} = ${result}`
    } catch {
      return { lines: [{ kind: 'error', text: `calc: could not parse "${expression}"` }] }
    }
  },
}

const base64: CommandDef = {
  name: 'base64',
  aliases: ['b64'],
  summary: 'encode / decode base64',
  usage: 'base64 [-d] <text>',
  run: (ctx) => {
    if (ctx.args.length === 0) {
      return { lines: [{ kind: 'error', text: 'Usage: base64 [-d] <text>' }] }
    }
    const decode = ctx.args[0] === '-d' || ctx.args[0] === '--decode'
    const text = ctx.args.slice(decode ? 1 : 0).join(' ')
    if (!text) return { lines: [{ kind: 'error', text: 'Usage: base64 [-d] <text>' }] }
    try {
      if (decode) {
        const bytes = Uint8Array.from(atob(text), (c) => c.charCodeAt(0))
        return new TextDecoder().decode(bytes)
      }
      const bytes = new TextEncoder().encode(text)
      let binary = ''
      bytes.forEach((b) => {
        binary += String.fromCharCode(b)
      })
      return btoa(binary)
    } catch {
      return {
        lines: [
          { kind: 'error', text: `base64: ${decode ? 'invalid base64 input' : 'could not encode'}` },
        ],
      }
    }
  },
}

const cowsay: CommandDef = {
  name: 'cowsay',
  summary: 'a cow says something',
  hidden: true,
  run: (ctx) => {
    const text = ctx.raw.replace(/^cowsay\s?/i, '') || 'moo'
    const rule = '-'.repeat(text.length + 2)
    return {
      lines: [
        { kind: 'output', text: ` _${'_'.repeat(text.length + 1)}` },
        { kind: 'output', text: `< ${text} >` },
        { kind: 'output', text: ` ${rule}` },
        { kind: 'output', text: '        \\   ^__^' },
        { kind: 'output', text: '         \\  (oo)\\_______' },
        { kind: 'output', text: '            (__)\\       )\\/\\' },
        { kind: 'output', text: '                ||----w |' },
        { kind: 'output', text: '                ||     ||' },
      ],
    }
  },
}

const ping: CommandDef = {
  name: 'ping',
  summary: 'ping a host',
  usage: 'ping [host]',
  run: async (ctx) => {
    const arg = (ctx.args[0] ?? 'rafiur.dev').toLowerCase()
    if (arg === 'recruiter') {
      ctx.print({ kind: 'muted', text: 'PING recruiter (10.0.0.1): 56 data bytes' })
      if (!ctx.reducedMotion) await sleep(400, ctx.signal)
      if (ctx.signal.aborted) return
      ctx.openApp('contact')
      return { lines: [{ kind: 'system', text: 'Recruiter reachable. Opening contact…' }] }
    }
    const host = arg.includes('.') ? arg : 'rafiur.dev'
    for (let seq = 0; seq < 4; seq++) {
      if (ctx.signal.aborted) return
      const ms = (7 + Math.random() * 24).toFixed(1)
      ctx.print({ kind: 'muted', text: `64 bytes from ${host}: icmp_seq=${seq} time=${ms} ms` })
      if (!ctx.reducedMotion) await sleep(300, ctx.signal)
    }
    return {
      lines: [
        { kind: 'output', text: `--- ${host} ping statistics ---` },
        { kind: 'muted', text: '4 packets transmitted, 4 received, 0.0% packet loss' },
      ],
    }
  },
}

const MILESTONES = [
  'matrix glitch on the desktop background',
  'Files app + minimise-to-dock',
  'terminal: filesystem, easter eggs, achievements',
  'Game Boy Advance emulator (self-hosted)',
  'Supabase-backed Images app + admin login',
  'cinematic boot sequence + desktop shell',
]

const git: CommandDef = {
  name: 'git',
  summary: 'portfolio version control',
  run: (ctx) => {
    const sub = ctx.args[0]
    if (sub === 'status') {
      return {
        lines: [
          { kind: 'output', text: 'On branch main' },
          { kind: 'muted', text: "Your portfolio is up to date with 'origin/main'." },
          { kind: 'system', text: 'nothing to commit, working tree clean' },
        ],
      }
    }
    if (sub === 'log') {
      return {
        lines: MILESTONES.map<OutputLine>((m, i) => ({
          kind: i === 0 ? 'system' : 'muted',
          text: `${(0x5b8cff + i * 0x40).toString(16).padStart(7, '0')}  ${m}`,
        })),
      }
    }
    if (sub === 'blame') return '100% Rafiur Rahman'
    if (sub === 'push') {
      return { lines: [{ kind: 'error', text: 'remote: Permission denied: visitor is read-only.' }] }
    }
    if (sub === 'commit') {
      const message = ctx.raw.match(/-m\s+["']?([^"']+)/)?.[1] ?? ''
      if (/hire/i.test(message)) {
        ctx.unlock('root-access')
        ctx.openApp('contact')
        return {
          lines: [
            { kind: 'system', text: `[main 5b8cff1] ${message}` },
            { kind: 'output', text: 'Opening contact…' },
          ],
        }
      }
      return { lines: [{ kind: 'error', text: 'nothing to commit, this is a read-only exhibit' }] }
    }
    return { lines: [{ kind: 'muted', text: 'usage: git status | log | blame | push | commit -m "…"' }] }
  },
}

export const funCommands: CommandDef[] = [
  joke,
  quote,
  coinflip,
  roll,
  calc,
  base64,
  cowsay,
  ping,
  git,
]
