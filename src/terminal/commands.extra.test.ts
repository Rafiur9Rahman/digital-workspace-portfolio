import { describe, expect, it, vi } from 'vitest'
import { getCommand } from './registry'
import { createFileSystem } from './filesystem'
import type { CommandContext, CommandResult, OutputLine, TerminalWindow } from './types'
import { projects } from '../data/content'

function ctx(over: Partial<CommandContext> = {}): CommandContext {
  return {
    args: [],
    raw: '',
    history: [],
    cwd: '/',
    fs: createFileSystem(),
    listCommands: () => [],
    print: () => {},
    signal: new AbortController().signal,
    reducedMotion: true,
    terminalTheme: 'dark',
    uptimeMs: 90_000,
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
    forgetMe: () => {},
    ...over,
  }
}

const run = (name: string, over: Partial<CommandContext> = {}) => getCommand(name)!.run(ctx(over))

function textOf(result: CommandResult): string {
  if (result && typeof result === 'object' && 'lines' in result && result.lines) {
    return (result.lines as OutputLine[]).map((l) => l.text).join('\n')
  }
  if (Array.isArray(result)) return result.join('\n')
  return String(result ?? '')
}

const openWindows = (...w: [string, boolean][]): TerminalWindow[] =>
  w.map(([appId, minimized]) => ({ appId, title: appId, minimized }) as TerminalWindow)

describe('sysinfo', () => {
  it('neofetch shows the OS name and uptime', async () => {
    const text = textOf(await run('neofetch'))
    expect(text).toContain('RafiurOS')
    expect(text).toContain('1 min')
  })
  it('uptime formats the session length', async () => {
    expect(await run('uptime', { uptimeMs: 3_600_000 })).toBe('up 1 hr')
  })
  it('uname -a is more detailed than uname', async () => {
    expect(await run('uname')).toBe('RafiurOS')
    expect(String(await run('uname', { args: ['-a'] }))).toContain('web-x86_64')
  })
  it('id / groups / hostname', async () => {
    expect(String(await run('id'))).toContain('visitor')
    expect(await run('groups')).toContain('recruiter')
    expect(await run('hostname')).toBe('rafiur-workspace')
  })
  it('env lists fake variables', async () => {
    expect(textOf(await run('env'))).toContain('PORTFOLIO_MODE=interactive')
  })
})

describe('window control', () => {
  it('ps lists open windows', async () => {
    const text = textOf(await run('ps', { listWindows: () => openWindows(['terminal', false], ['gba', true]) }))
    expect(text).toContain('terminal')
    expect(text).toContain('minimized')
  })
  it('kill closes an open app', async () => {
    const closeApp = vi.fn()
    await run('kill', { args: ['gba'], closeApp, listWindows: () => openWindows(['gba', false]) })
    expect(closeApp).toHaveBeenCalledWith('gba')
  })
  it('kill errors when the app is not running', async () => {
    const closeApp = vi.fn()
    const text = textOf(await run('kill', { args: ['gba'], closeApp, listWindows: () => [] }))
    expect(closeApp).not.toHaveBeenCalled()
    expect(text).toContain('no such process')
  })
  it('desktop minimises everything', async () => {
    const minimizeAll = vi.fn()
    await run('desktop', { minimizeAll })
    expect(minimizeAll).toHaveBeenCalledOnce()
  })
  it('apps marks running ones', async () => {
    const text = textOf(await run('apps', { listWindows: () => openWindows(['terminal', false]) }))
    expect(text).toContain('● ')
  })
})

describe('search', () => {
  it('tree renders the filesystem', async () => {
    const text = textOf(await run('tree'))
    expect(text).toContain('projects/')
    expect(text).toMatch(/directories, \d+ files/)
  })
  it('grep finds content by term', async () => {
    const text = textOf(await run('grep', { args: ['azure'] }))
    expect(text.toLowerCase()).toContain('azure')
  })
  it('grep reports no matches', async () => {
    expect(String(await run('grep', { args: ['zzzznope'] }))).toContain('No matches')
  })
  it('find locates files by name', async () => {
    const out = await run('find', { args: ['readme'] })
    expect(textOf(out)).toContain('readme.txt')
  })
  it('file identifies a pdf', async () => {
    expect(await run('file', { args: ['cv.pdf'] })).toBe('cv.pdf: PDF document')
  })
})

describe('base64', () => {
  it('round-trips text', async () => {
    const encoded = String(await run('base64', { args: ['hello world'] }))
    expect(encoded).toBe('aGVsbG8gd29ybGQ=')
    expect(await run('base64', { args: ['-d', encoded] })).toBe('hello world')
  })
  it('handles unicode', async () => {
    const encoded = String(await run('base64', { args: ['héllo →'] }))
    expect(await run('base64', { args: ['-d', encoded] })).toBe('héllo →')
  })
  it('errors on invalid base64', async () => {
    expect(textOf(await run('base64', { args: ['-d', '!!!not-b64!!!'] }))).toContain('invalid')
  })
})

describe('theme', () => {
  it('reports the current theme when given no argument', async () => {
    expect(String(await run('theme', { terminalTheme: 'amber' }))).toContain('amber')
  })
  it('sets a known theme', async () => {
    const result = await run('theme', { args: ['matrix'] })
    expect(result).toMatchObject({ theme: 'matrix' })
  })
  it('rejects an unknown theme', async () => {
    expect(textOf(await run('theme', { args: ['neon'] }))).toContain("unknown theme 'neon'")
  })
})

describe('fun', () => {
  it('calc evaluates arithmetic', async () => {
    expect(await run('calc', { args: ['12', '*', '8'] })).toBe('12 * 8 = 96')
    expect(await run('calc', { args: ['(2+3)*4'] })).toBe('(2+3)*4 = 20')
  })
  it('calc rejects nonsense safely', async () => {
    expect(textOf(await run('calc', { args: ['alert(1)'] }))).toContain('only numbers')
  })
  it('roll stays within the die', async () => {
    const out = String(await run('roll', { args: ['20'] }))
    const n = Number(out.match(/→ (\d+)/)?.[1])
    expect(n).toBeGreaterThanOrEqual(1)
    expect(n).toBeLessThanOrEqual(20)
  })
  it('git status is clean; git push is denied', async () => {
    expect(textOf(await run('git', { args: ['status'] }))).toContain('working tree clean')
    expect(textOf(await run('git', { args: ['push'] }))).toContain('Permission denied')
  })
  it('git commit -m "hire" opens contact', async () => {
    const openApp = vi.fn()
    await run('git', { args: ['commit', '-m', 'hire'], raw: 'git commit -m "hire me"', openApp })
    expect(openApp).toHaveBeenCalledWith('contact')
  })
})

describe('meta', () => {
  it('status shows uptime + directory', async () => {
    const text = textOf(await run('status', { cwd: '/projects', uptimeMs: 120_000 }))
    expect(text).toContain('/projects')
    expect(text).toContain('2 mins')
  })
  it('history -c clears history', async () => {
    const clearHistory = vi.fn()
    await run('history', { args: ['-c'], clearHistory })
    expect(clearHistory).toHaveBeenCalledOnce()
  })
  it('mkdir refuses (read-only) and is hidden', async () => {
    expect(getCommand('mkdir')?.hidden).toBe(true)
    expect(textOf(await run('mkdir', { args: ['x'] }))).toContain('read-only')
  })
  it('launch is an alias of open', () => {
    expect(getCommand('launch')?.name).toBe('open')
  })
  it('forget me calls ctx.forgetMe and resets the theme', async () => {
    const forgetMe = vi.fn()
    const result = await run('forget', { args: ['me'], forgetMe })
    expect(forgetMe).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ theme: 'dark' })
    expect(textOf(result)).toContain('Cleared')
  })
  it('bare `forget` shows usage and does nothing', async () => {
    const forgetMe = vi.fn()
    expect(textOf(await run('forget', { forgetMe }))).toContain('Usage: forget me')
    expect(forgetMe).not.toHaveBeenCalled()
  })
  it('tour --fast prints a summary without opening apps', async () => {
    const openApp = vi.fn()
    const text = textOf(await run('tour', { raw: 'tour --fast', openApp }))
    expect(openApp).not.toHaveBeenCalled()
    expect(text).toContain(projects[0].title)
    expect(text.toLowerCase()).toContain('top work')
  })
})
