import { describe, expect, it } from 'vitest'
import { didYouMean, parseLine, runLine } from './runner'
import { createFileSystem } from './filesystem'
import { isUnlocked } from './achievements'
import type { CommandContext } from './types'

type BaseContext = Omit<CommandContext, 'args' | 'raw'>

function baseCtx(over: Partial<BaseContext> = {}): BaseContext {
  return {
    history: [],
    cwd: '/',
    fs: createFileSystem(),
    listCommands: () => [],
    print: () => {},
    signal: new AbortController().signal,
    reducedMotion: true,
    openApp: () => {},
    openUrl: () => {},
    reboot: () => {},
    shutdown: () => {},
    setCwd: () => {},
    unlock: () => {},
    ...over,
  }
}

describe('parseLine', () => {
  it('splits the command from its arguments', () => {
    expect(parseLine('open gba')).toEqual({ name: 'open', args: ['gba'] })
  })

  it('lowercases the command name only', () => {
    expect(parseLine('ECHO Hello World')).toEqual({ name: 'echo', args: ['Hello', 'World'] })
  })

  it('keeps quoted groups intact', () => {
    expect(parseLine('echo "a b" c')).toEqual({ name: 'echo', args: ['a b', 'c'] })
    expect(parseLine("echo 'x y'")).toEqual({ name: 'echo', args: ['x y'] })
  })

  it('returns null for a blank line', () => {
    expect(parseLine('')).toBeNull()
    expect(parseLine('   ')).toBeNull()
  })
})

describe('didYouMean', () => {
  it('finds matches within edit distance 2', () => {
    expect(didYouMean('projcts', ['projects', 'about', 'skills'])).toEqual(['projects'])
    expect(didYouMean('helpp', ['help', 'about'])).toEqual(['help'])
  })

  it('returns nothing when nothing is close', () => {
    expect(didYouMean('xyzzy', ['projects', 'about', 'skills'])).toEqual([])
  })

  it('orders by closeness and caps at three', () => {
    const near = didYouMean('cat', ['cats', 'car', 'chat', 'category', 'dog'])
    expect(near.length).toBeLessThanOrEqual(3)
    expect(near[0]).toBe('cats')
  })
})

describe('runLine', () => {
  it('runs a known command', async () => {
    expect(await runLine('whoami', baseCtx())).toBe('visitor')
  })

  it('passes arguments through to the command', async () => {
    expect(await runLine('echo hi there', baseCtx())).toBe('hi there')
  })

  it('reports an unknown command with a suggestion', async () => {
    const result = await runLine('projcts', baseCtx())
    expect(result).toMatchObject({
      lines: [
        { kind: 'error', text: "Command 'projcts' not found." },
        { kind: 'muted', text: 'Did you mean: projects?' },
      ],
    })
  })

  it('falls back to the generic hint when nothing is close', async () => {
    const result = await runLine('zzzzz', baseCtx())
    expect(result).toMatchObject({
      lines: [
        { kind: 'error', text: "Command 'zzzzz' not found." },
        { kind: 'muted', text: "Type 'help' for a list of commands." },
      ],
    })
  })

  it('returns nothing for a blank line', async () => {
    expect(await runLine('   ', baseCtx())).toBeUndefined()
  })

  it('tracks discovered hidden commands and unlocks curious-mind', async () => {
    for (const cmd of ['matrix', 'coffee']) await runLine(cmd, baseCtx())
    expect(isUnlocked('curious-mind')).toBe(false)
    for (const cmd of ['fortune', '42']) await runLine(cmd, baseCtx())
    expect(isUnlocked('curious-mind')).toBe(true)
  })

  it('does not track visible commands as discoveries', async () => {
    for (const cmd of ['help', 'about', 'projects', 'skills']) await runLine(cmd, baseCtx())
    expect(isUnlocked('curious-mind')).toBe(false)
  })
})
