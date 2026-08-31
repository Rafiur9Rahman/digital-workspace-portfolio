import { version as reactVersion } from 'react'
import type { CommandContext, CommandDef, OutputLine } from '../types'
import { APP_IDS } from '../../data/appMeta'
import { profile, projects } from '../../data/content'
import { WORKSPACE_VERSION } from '../../lib/version'
import { formatDuration } from '../util'

const OS_NAME = 'RafiurOS 1.0'
const HOSTNAME = 'rafiur-workspace'

function pair(key: string, value: string): OutputLine {
  return { kind: 'muted', text: `${key.padEnd(9)} ${value}` }
}

function infoLines(ctx: CommandContext): OutputLine[] {
  const wins = ctx.listWindows()
  const running = wins.filter((w) => !w.minimized).length
  return [
    { kind: 'accent', text: `visitor@${HOSTNAME}` },
    { kind: 'muted', text: '─'.repeat(22) },
    pair('OS', `${OS_NAME} (Web)`),
    pair('Build', WORKSPACE_VERSION),
    pair('Host', `React ${reactVersion}`),
    pair('Kernel', 'web-x86_64'),
    pair('Uptime', formatDuration(ctx.uptimeMs)),
    pair('Shell', 'rsh'),
    pair('Apps', `${APP_IDS.length} installed · ${running} running`),
    pair('Projects', String(projects.length)),
    pair('Theme', 'dark'),
    pair('Font', 'JetBrains Mono'),
  ]
}

const LOGO = [
  '  ██████╗ ',
  '  ██╔══██╗',
  '  ██████╔╝',
  '  ██╔══██╗',
  '  ██║  ██║   R A F I U R O S',
  '  ╚═╝  ╚═╝',
]

const neofetch: CommandDef = {
  name: 'neofetch',
  aliases: ['systeminfo', 'banner'],
  summary: 'system info + logo',
  run: (ctx) => ({
    lines: [
      ...LOGO.map<OutputLine>((text) => ({ kind: 'system', text })),
      { kind: 'output', text: '' },
      ...infoLines(ctx),
    ],
  }),
}

const uptime: CommandDef = {
  name: 'uptime',
  summary: 'how long this session has been open',
  run: (ctx) => `up ${formatDuration(ctx.uptimeMs)}`,
}

const hostname: CommandDef = {
  name: 'hostname',
  summary: 'print the machine name',
  run: () => HOSTNAME,
}

const uname: CommandDef = {
  name: 'uname',
  summary: 'print system information',
  run: (ctx) =>
    ctx.args.includes('-a')
      ? `${OS_NAME} ${HOSTNAME} web-x86_64 React/${reactVersion}`
      : OS_NAME.split(' ')[0],
}

const id: CommandDef = {
  name: 'id',
  summary: 'print user identity',
  run: () => 'uid=1000(visitor) gid=1000(visitor) groups=1000(visitor),recruiter,developer',
}

const groups: CommandDef = {
  name: 'groups',
  summary: 'print group memberships',
  run: () => 'visitor recruiter developer',
}

const ENV: Record<string, string> = {
  PORTFOLIO_MODE: 'interactive',
  USER: 'visitor',
  HOME: '/',
  SHELL: '/bin/rsh',
  TERM: 'rafiur-256color',
  LANG: 'en_GB.UTF-8',
  NODE_ENV: 'production',
  CONTACT: profile.email,
}

const env: CommandDef = {
  name: 'env',
  aliases: ['printenv'],
  summary: 'print environment variables',
  run: () => Object.entries(ENV).map(([k, v]) => `${k}=${v}`),
}

const version: CommandDef = {
  name: 'version',
  summary: 'print the OS version',
  run: () =>
    `${OS_NAME} (web) · workspace ${WORKSPACE_VERSION} · React ${reactVersion}`,
}

export const sysinfoCommands: CommandDef[] = [
  neofetch,
  uptime,
  hostname,
  uname,
  id,
  groups,
  env,
  version,
]
