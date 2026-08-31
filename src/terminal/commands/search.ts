import type { CommandDef, OutputLine } from '../types'
import {
  certifications,
  experience,
  projects,
  skills,
} from '../../data/content'

const tree: CommandDef = {
  name: 'tree',
  summary: 'print the filesystem as a tree',
  run: (ctx) => {
    const lines: OutputLine[] = [{ kind: 'accent', text: '.' }]
    let dirs = 0
    let files = 0

    const walk = (path: string, prefix: string) => {
      const entries = ctx.fs.list(path) ?? []
      entries.forEach((entry, i) => {
        const last = i === entries.length - 1
        const isDir = entry.type === 'dir'
        if (isDir) dirs++
        else files++
        lines.push({
          kind: isDir ? 'accent' : 'output',
          text: `${prefix}${last ? '└── ' : '├── '}${entry.name}${isDir ? '/' : ''}`,
        })
        if (isDir) {
          const child = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`
          walk(child, prefix + (last ? '    ' : '│   '))
        }
      })
    }
    walk('/', '')
    lines.push({ kind: 'muted', text: '' })
    lines.push({ kind: 'muted', text: `${dirs} directories, ${files} files` })
    return { lines }
  },
}

const find: CommandDef = {
  name: 'find',
  summary: 'find files by name',
  usage: 'find <term>',
  run: (ctx) => {
    const term = ctx.args.join(' ').toLowerCase()
    if (!term) return { lines: [{ kind: 'error', text: 'Usage: find <term>' }] }
    const hits: string[] = []
    const walk = (path: string) => {
      for (const entry of ctx.fs.list(path) ?? []) {
        const full = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`
        if (entry.name.toLowerCase().includes(term)) hits.push(full)
        if (entry.type === 'dir') walk(full)
      }
    }
    walk('/')
    return hits.length ? hits : `find: nothing matching "${ctx.args.join(' ')}"`
  },
}

const grep: CommandDef = {
  name: 'grep',
  aliases: ['search'],
  summary: 'search portfolio content',
  usage: 'grep <term>',
  run: (ctx) => {
    const term = ctx.args.join(' ').toLowerCase()
    if (!term) return { lines: [{ kind: 'error', text: 'Usage: grep <term>' }] }
    const hits: OutputLine[] = []
    const test = (label: string, text: string) => {
      if (text.toLowerCase().includes(term)) {
        hits.push({ kind: 'output', text: `${label.padEnd(11)} ${text}` })
      }
    }
    for (const p of projects) {
      test('project', `${p.title} - ${p.summary}`)
      test('tech', `${p.title}: ${p.tech.join(', ')}`)
      for (const o of p.outcomes) test('outcome', `${p.title}: ${o}`)
    }
    for (const [group, items] of Object.entries(skills)) {
      test('skill', `${group}: ${items.join(', ')}`)
    }
    for (const job of experience) test('experience', `${job.role} - ${job.company}`)
    for (const c of certifications) test('cert', `${c.name} - ${c.issuer}`)
    return hits.length ? { lines: hits } : `No matches for "${ctx.args.join(' ')}".`
  },
}

const file: CommandDef = {
  name: 'file',
  summary: 'identify a file',
  usage: 'file <path>',
  run: (ctx) => {
    const arg = ctx.args[0]
    if (!arg) return { lines: [{ kind: 'error', text: 'Usage: file <path>' }] }
    const node = ctx.fs.node(ctx.fs.resolve(ctx.cwd, arg))
    if (!node) return { lines: [{ kind: 'error', text: `file: ${arg}: no such file` }] }
    if (node.type === 'dir') return `${arg}: directory`
    const type = arg.endsWith('.pdf')
      ? 'PDF document'
      : arg.endsWith('.gba')
        ? 'Game Boy Advance ROM image'
        : /\.(jpe?g|png)$/.test(arg)
          ? 'image data'
          : 'ASCII text'
    return `${arg}: ${type}`
  },
}

export const searchCommands: CommandDef[] = [tree, find, grep, file]
