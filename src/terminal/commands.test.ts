import { describe, expect, it, vi } from 'vitest'
import { getCommand, listCommands } from './registry'
import { createFileSystem } from './filesystem'
import { unlock } from './achievements'
import type { CommandContext, CommandResult, OutputLine } from './types'
import { profile, projects } from '../data/content'

function run(name: string, over: Partial<CommandContext> = {}): CommandResult | Promise<CommandResult> {
  const command = getCommand(name)
  if (!command) throw new Error(`no command '${name}'`)
  return command.run({
    args: [],
    raw: name,
    history: [],
    cwd: '/',
    fs: createFileSystem(),
    listCommands,
    print: () => {},
    signal: new AbortController().signal,
    reducedMotion: true,
    terminalTheme: 'dark',
    uptimeMs: 0,
    openApp: () => {},
    openUrl: () => {},
    reboot: () => {},
    shutdown: () => {},
    setCwd: () => {},
    unlock: () => {},
    listWindows: () => [],
    closeApp: () => {},
    focusApp: () => {},
    minimizeApp: () => {},
    minimizeAll: () => {},
    clearHistory: () => {},
    ...over,
  })
}

function textOf(result: CommandResult): string {
  if (result && typeof result === 'object' && 'lines' in result && result.lines) {
    return result.lines.map((l) => l.text).join('\n')
  }
  if (Array.isArray(result)) return result.join('\n')
  return String(result ?? '')
}

describe('portfolio commands', () => {
  it('help lists every visible command', async () => {
    const text = textOf(await run('help'))
    for (const command of listCommands().filter((c) => !c.hidden)) {
      expect(text).toContain(command.name)
    }
  })

  it('about reads name + tagline from the content layer', async () => {
    const text = textOf(await run('about'))
    expect(text).toContain(profile.name)
    expect(text).toContain(profile.tagline)
  })

  it('projects lists every project by title', async () => {
    const text = textOf(await run('projects'))
    for (const project of projects) expect(text).toContain(project.title)
  })

  it('skills prints each group from the content layer', async () => {
    const text = textOf(await run('skills'))
    expect(text).toContain('Data')
    expect(text).toContain('AI')
    expect(text).toContain('Software')
  })

  it('github opens the profile URL through ctx.openUrl', async () => {
    const openUrl = vi.fn()
    const result = await run('github', { openUrl })
    expect(openUrl).toHaveBeenCalledWith(expect.stringContaining('github.com'))
    const lines = (result as { lines: OutputLine[] }).lines
    expect(lines[0].kind).toBe('system')
  })

  it('whoami returns visitor', async () => {
    expect(await run('whoami')).toBe('visitor')
  })

  it('cv falls back to an email line when no PDF is linked', async () => {
    const text = textOf(await run('cv'))
    expect(text).toContain(profile.email)
  })
})

describe('system commands', () => {
  it('clear signals a screen wipe', async () => {
    expect(await run('clear')).toEqual({ clear: true })
  })

  it('echo prints the argument text, preserving spacing', async () => {
    expect(await run('echo', { raw: 'echo hello   world' })).toBe('hello   world')
  })

  it('history is friendly when empty', async () => {
    expect(await run('history', { history: [] })).toBe('No commands yet.')
  })

  it('history numbers each entry', async () => {
    const result = (await run('history', { history: ['help', 'about'] })) as string[]
    expect(result).toHaveLength(2)
    expect(result[0]).toContain('help')
    expect(result[1]).toContain('about')
  })
})

describe('aliases', () => {
  it('certs resolves to certifications', () => {
    expect(getCommand('certs')?.name).toBe('certifications')
  })

  it('cls resolves to clear', () => {
    expect(getCommand('cls')?.name).toBe('clear')
  })
})

describe('open', () => {
  it('opens an app by id via ctx.openApp', async () => {
    const openApp = vi.fn()
    const result = await run('open', { args: ['projects'], openApp })
    expect(openApp).toHaveBeenCalledWith('projects')
    expect((result as { lines: OutputLine[] }).lines[0].kind).toBe('system')
  })

  it('resolves friendly aliases (cv → resume, pokemon → gba)', async () => {
    const openApp = vi.fn()
    await run('open', { args: ['cv'], openApp })
    await run('open', { args: ['pokemon'], openApp })
    expect(openApp).toHaveBeenNthCalledWith(1, 'resume')
    expect(openApp).toHaveBeenNthCalledWith(2, 'gba')
  })

  it('with no argument, prints usage + the app list', async () => {
    const openApp = vi.fn()
    const text = textOf(await run('open', { openApp }))
    expect(openApp).not.toHaveBeenCalled()
    expect(text).toContain('Usage: open <app>')
    expect(text).toContain('gba')
  })

  it('rejects an unknown app', async () => {
    const openApp = vi.fn()
    const text = textOf(await run('open', { args: ['nonsense'], openApp }))
    expect(openApp).not.toHaveBeenCalled()
    expect(text).toContain("No app called 'nonsense'")
  })
})

describe('achievements command', () => {
  it('is visible and starts at 0 / total', async () => {
    expect(getCommand('achievements')?.hidden).toBeFalsy()
    const text = textOf(await run('achievements'))
    expect(text).toMatch(/Achievements\s+0\//)
    expect(text).toContain('???')
  })

  it('shows an achievement as done once unlocked', async () => {
    unlock('the-answer')
    const text = textOf(await run('achievements'))
    expect(text).toMatch(/Achievements\s+1\//)
    expect(text).toContain('✓  The Answer')
  })
})

describe('filesystem commands', () => {
  it('pwd prints the working directory', async () => {
    expect(await run('pwd', { cwd: '/' })).toBe('/')
    expect(await run('pwd', { cwd: '/projects' })).toBe('/projects')
  })

  it('ls lists the root (dirs first, with a trailing slash)', async () => {
    const text = textOf(await run('ls', { cwd: '/' }))
    expect(text).toContain('projects/')
    expect(text).toContain('about.txt')
  })

  it('ls <path> lists a subdirectory', async () => {
    const text = textOf(await run('ls', { cwd: '/', args: ['projects'] }))
    for (const p of projects) expect(text).toContain(p.slug)
  })

  it('cd moves into a directory and back out', async () => {
    expect(await run('cd', { cwd: '/', args: ['projects'] })).toEqual({ cwd: '/projects' })
    expect(await run('cd', { cwd: '/projects', args: ['..'] })).toEqual({ cwd: '/' })
    expect(await run('cd', { cwd: '/projects/x', args: ['/'] })).toEqual({ cwd: '/' })
    expect(await run('cd', { cwd: '/projects', args: [] })).toEqual({ cwd: '/' })
  })

  it('cd rejects missing dirs and files', async () => {
    expect(textOf(await run('cd', { args: ['nope'] }))).toContain('no such file or directory')
    expect(textOf(await run('cd', { args: ['about.txt'] }))).toContain('not a directory')
  })

  it('cat prints a file and appends an open hint when it maps to an app', async () => {
    const about = textOf(await run('cat', { args: ['about.txt'] }))
    expect(about).toContain(profile.name)

    const contact = textOf(await run('cat', { args: ['contact.txt'] }))
    expect(contact).toContain('open contact')
  })

  it('cat errors on a missing file or a directory', async () => {
    expect(textOf(await run('cat', { args: ['ghost'] }))).toContain('no such file or directory')
    expect(textOf(await run('cat', { args: ['projects'] }))).toContain('is a directory')
    expect(textOf(await run('cat', {}))).toContain('Usage: cat')
  })

  it('reads project files relative to the current directory', async () => {
    const readme = textOf(
      await run('cat', { cwd: `/projects/${projects[0].slug}`, args: ['readme.txt'] }),
    )
    expect(readme).toContain(projects[0].title)
  })
})

describe('reboot / shutdown', () => {
  it('reboot calls ctx.reboot and is hidden from help', async () => {
    const reboot = vi.fn()
    await run('reboot', { reboot })
    expect(reboot).toHaveBeenCalledOnce()
    expect(getCommand('reboot')?.hidden).toBe(true)
  })

  it('shutdown calls ctx.shutdown and is hidden from help', async () => {
    const shutdown = vi.fn()
    await run('shutdown', { shutdown })
    expect(shutdown).toHaveBeenCalledOnce()
    expect(getCommand('shutdown')?.hidden).toBe(true)
  })

  it('restart / poweroff aliases resolve', () => {
    expect(getCommand('restart')?.name).toBe('reboot')
    expect(getCommand('poweroff')?.name).toBe('shutdown')
  })
})
