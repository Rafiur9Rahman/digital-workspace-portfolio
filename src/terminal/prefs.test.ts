import { describe, expect, it } from 'vitest'
import { bumpCommandCount, loadPrefs, savePrefs } from './prefs'

describe('terminal prefs', () => {
  it('defaults to the dark theme and zero counters', () => {
    expect(loadPrefs()).toEqual({ theme: 'dark', commandsRun: 0, snakeBest: 0 })
  })

  it('persists and merges partial updates', () => {
    savePrefs({ theme: 'amber' })
    savePrefs({ snakeBest: 12 })
    expect(loadPrefs()).toMatchObject({ theme: 'amber', snakeBest: 12 })
  })

  it('bumpCommandCount increments across calls', () => {
    expect(bumpCommandCount()).toBe(1)
    expect(bumpCommandCount()).toBe(2)
    expect(loadPrefs().commandsRun).toBe(2)
  })

  it('ignores an unknown theme and a corrupt store', () => {
    savePrefs({ theme: 'neon' as never })
    expect(loadPrefs().theme).toBe('dark')
    localStorage.setItem('ws-terminal-prefs-v1', '{oops')
    expect(loadPrefs().theme).toBe('dark')
  })
})
