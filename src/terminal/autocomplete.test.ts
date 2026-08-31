import { describe, expect, it } from 'vitest'
import { complete } from './autocomplete'
import { createFileSystem } from './filesystem'

const fsCtx = { cwd: '/', fs: createFileSystem() }

describe('complete', () => {
  it('completes a unique command prefix (with a trailing space, shell-style)', () => {
    expect(complete('who')).toMatchObject({ replacement: 'whoami ' })
    expect(complete('ce')).toMatchObject({ replacement: 'certifications ' })
  })

  it('lists candidates for an ambiguous prefix without picking one', () => {
    const result = complete('c')
    expect(result.replacement).toBeUndefined()
    expect(result.matches).toEqual(
      expect.arrayContaining(['certifications', 'clear', 'contact', 'cv']),
    )
  })

  it('returns matches sorted', () => {
    const { matches } = complete('c')
    expect(matches).toEqual([...matches].sort())
  })

  it('completes app names for `open`', () => {
    expect(complete('open g')).toMatchObject({ replacement: 'open gba ', matches: ['gba'] })
    const all = complete('open ')
    expect(all.matches).toEqual(expect.arrayContaining(['gba', 'projects', 'terminal']))
    expect(complete('open zzz')).toEqual({ matches: [] })
  })

  it('offers nothing for arguments it does not understand', () => {
    expect(complete('echo hi')).toEqual({ matches: [] })
    expect(complete('date ')).toEqual({ matches: [] })
  })

  it('completes filesystem paths for cd / cat / ls', () => {
    expect(complete('cd pro', fsCtx)).toMatchObject({ replacement: 'cd projects/' })
    // cd only offers directories
    expect(complete('cd ', fsCtx).matches).toEqual(
      expect.arrayContaining(['projects/', 'skills/', 'games/']),
    )
    expect(complete('cd ', fsCtx).matches).not.toContain('about.txt')
    // cat offers files too
    expect(complete('cat ', fsCtx).matches).toEqual(
      expect.arrayContaining(['about.txt', 'contact.txt', 'projects/']),
    )
    // nested
    expect(complete('cd projects/', fsCtx).matches.length).toBeGreaterThan(0)
  })

  it('needs a filesystem context for path completion', () => {
    expect(complete('cd pro')).toEqual({ matches: [] })
  })

  it('returns no matches for gibberish', () => {
    expect(complete('zzz')).toEqual({ matches: [] })
  })

  it('never offers a hidden command', () => {
    // Phase 1 has none, but the contract holds: everything offered is visible.
    const { matches } = complete('')
    expect(matches.length).toBeGreaterThan(0)
    expect(matches).not.toContain('matrix')
  })
})
