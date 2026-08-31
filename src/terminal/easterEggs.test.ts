import { describe, expect, it, vi } from 'vitest'
import { getCommand, visibleCommands } from './registry'
import { createFileSystem } from './filesystem'
import { createKonamiMatcher, KONAMI_SEQUENCE } from './easterEggs/useKonami'
import { FORTUNES } from './easterEggs/data'
import type { CommandContext, CommandResult, OutputLine } from './types'

const EGGS = ['matrix', 'coffee', '42', 'fortune', 'sudo', 'hack', 'rm', 'pokemon', 'party']

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
    uptimeMs: 0,
    openApp: () => {},
    openAppWith: () => {},
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

const run = (name: string, over: Partial<CommandContext> = {}) =>
  getCommand(name)!.run(ctx(over))

function textOf(result: CommandResult): string {
  if (result && typeof result === 'object' && 'lines' in result && result.lines) {
    return (result.lines as OutputLine[]).map((l) => l.text).join('\n')
  }
  return String(result ?? '')
}

describe('easter eggs - discovery', () => {
  it('are all hidden from help and autocomplete', () => {
    const visible = new Set(visibleCommands().map((c) => c.name))
    for (const name of EGGS) {
      expect(getCommand(name)?.hidden).toBe(true)
      expect(visible.has(name)).toBe(false)
    }
  })
})

describe('easter eggs - behaviour', () => {
  it('matrix starts the effect and unlocks Wake Up, Neo', async () => {
    const unlock = vi.fn()
    expect(await run('matrix', { unlock })).toMatchObject({ effect: 'matrix' })
    expect(unlock).toHaveBeenCalledWith('wake-up-neo')
  })

  it('42 answers and unlocks The Answer', async () => {
    const unlock = vi.fn()
    expect(textOf(await run('42', { unlock }))).toContain('Life, the Universe')
    expect(unlock).toHaveBeenCalledWith('the-answer')
  })

  it('fortune returns one of the internal fortunes', async () => {
    expect(FORTUNES).toContain(textOf(await run('fortune')))
  })

  it('coffee brews and finishes ready', async () => {
    const printed: string[] = []
    const result = await run('coffee', {
      print: (l) => printed.push(typeof l === 'string' ? l : l.text),
    })
    expect(printed.join('\n')).toContain('Brewing developer fuel')
    expect(textOf(result)).toContain('Coffee ready')
  })

  it('sudo alone refuses', async () => {
    expect(textOf(await run('sudo'))).toContain('not in the sudoers file')
  })

  it('sudo hire rafiur grants access and opens Contact', async () => {
    const openApp = vi.fn()
    const unlock = vi.fn()
    const result = await run('sudo', { args: ['hire', 'rafiur'], openApp, unlock })
    expect(openApp).toHaveBeenCalledWith('contact')
    expect(unlock).toHaveBeenCalledWith('root-access')
    expect(textOf(result)).toContain('Access granted')
  })

  it('hack denies access and does nothing real', async () => {
    const printed: string[] = []
    const result = await run('hack', {
      print: (l) => printed.push(typeof l === 'string' ? l : l.text),
    })
    expect(printed.join('\n')).toContain('INITIALISING')
    expect(textOf(result)).toContain('ACCESS DENIED')
  })

  it('rm -rf / is a harmless prank and unlocks Dangerous Individual', async () => {
    const unlock = vi.fn()
    const result = await run('rm', { args: ['-rf', '/'], unlock })
    expect(unlock).toHaveBeenCalledWith('dangerous-individual')
    expect(textOf(result)).toContain('Nice try')
  })

  it('rm on an ordinary file just refuses, with no unlock', async () => {
    const unlock = vi.fn()
    const result = await run('rm', { args: ['about.txt'], unlock })
    expect(unlock).not.toHaveBeenCalled()
    expect(textOf(result).toLowerCase()).toContain('read-only')
  })

  it('pokemon opens the emulator', async () => {
    const openApp = vi.fn()
    await run('pokemon', { openApp })
    expect(openApp).toHaveBeenCalledWith('gba')
  })

  it('party triggers the party effect', async () => {
    expect(await run('party')).toMatchObject({ effect: 'party' })
  })
})

describe('konami matcher', () => {
  it('fires only once the full code is entered', () => {
    const match = createKonamiMatcher()
    const results = KONAMI_SEQUENCE.map((k) => match(k))
    expect(results.slice(0, -1).every((r) => r === false)).toBe(true)
    expect(results.at(-1)).toBe(true)
  })

  it('is case-insensitive for the B / A keys', () => {
    const match = createKonamiMatcher()
    for (const k of KONAMI_SEQUENCE.slice(0, -2)) match(k)
    expect(match('B')).toBe(false)
    expect(match('A')).toBe(true)
  })

  it('resets on a wrong key', () => {
    const match = createKonamiMatcher()
    match('arrowup')
    match('arrowup')
    match('x') // wrong - progress resets
    for (const k of KONAMI_SEQUENCE.slice(2)) match(k)
    // the run is incomplete because the first two arrowups were discarded
    expect(match('a')).toBe(false)
  })

  it('restarts cleanly and can still fire afterwards', () => {
    const match = createKonamiMatcher()
    match('arrowdown') // wrong first key
    const results = KONAMI_SEQUENCE.map((k) => match(k))
    expect(results.at(-1)).toBe(true)
  })
})
