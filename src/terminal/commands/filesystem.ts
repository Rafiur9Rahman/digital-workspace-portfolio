import type { CommandDef, OutputLine } from '../types'

const pwd: CommandDef = {
  name: 'pwd',
  summary: 'print the current directory',
  run: (ctx) => ctx.cwd,
}

const ls: CommandDef = {
  name: 'ls',
  aliases: ['dir'],
  summary: 'list directory contents',
  usage: 'ls [path]',
  run: (ctx) => {
    const arg = ctx.args[0]
    const target = arg ? ctx.fs.resolve(ctx.cwd, arg) : ctx.cwd
    const node = ctx.fs.node(target)
    if (!node) {
      return { lines: [{ kind: 'error', text: `ls: ${arg}: no such file or directory` }] }
    }
    if (node.type === 'file') return target.split('/').pop() ?? target

    const entries = ctx.fs.list(target) ?? []
    return {
      lines: [
        ...entries
          .filter((e) => e.type === 'dir')
          .map<OutputLine>((e) => ({ kind: 'accent', text: `${e.name}/` })),
        ...entries
          .filter((e) => e.type === 'file')
          .map<OutputLine>((e) => ({ kind: 'output', text: e.name })),
      ],
    }
  },
}

const cd: CommandDef = {
  name: 'cd',
  summary: 'change directory',
  usage: 'cd [path]',
  run: (ctx) => {
    const arg = ctx.args[0] ?? '~'
    const target = ctx.fs.resolve(ctx.cwd, arg)
    const node = ctx.fs.node(target)
    if (!node) {
      return { lines: [{ kind: 'error', text: `cd: ${arg}: no such file or directory` }] }
    }
    if (node.type !== 'dir') {
      return { lines: [{ kind: 'error', text: `cd: ${arg}: not a directory` }] }
    }
    return { cwd: target }
  },
}

const cat: CommandDef = {
  name: 'cat',
  summary: 'print a file',
  usage: 'cat <file>',
  run: (ctx) => {
    const arg = ctx.args[0]
    if (!arg) return { lines: [{ kind: 'error', text: 'Usage: cat <file>' }] }
    const target = ctx.fs.resolve(ctx.cwd, arg)
    const node = ctx.fs.node(target)
    if (!node) {
      return { lines: [{ kind: 'error', text: `cat: ${arg}: no such file or directory` }] }
    }
    if (node.type === 'dir') {
      return { lines: [{ kind: 'error', text: `cat: ${arg}: is a directory` }] }
    }
    const contents = ctx.fs.read(target)!
    const lines: OutputLine[] = contents.text
      .split('\n')
      .map((text) => ({ kind: 'output', text }))
    if (contents.app) {
      lines.push({ kind: 'muted', text: `→ run \`open ${contents.app}\` to launch the app` })
    }
    return { lines }
  },
}

export const filesystemCommands: CommandDef[] = [pwd, ls, cd, cat]
