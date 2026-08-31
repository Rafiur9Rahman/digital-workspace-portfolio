import { describe, expect, it } from 'vitest'
import {
  ACHIEVEMENTS,
  CURIOUS_MIND_THRESHOLD,
  getProgress,
  isUnlocked,
  noteHiddenDiscovery,
  unlock,
} from './achievements'

// localStorage is a fresh in-memory shim per test - see src/test/setup.ts

describe('achievements', () => {
  it('unlock returns true the first time and false afterwards', () => {
    expect(unlock('the-answer')).toBe(true)
    expect(unlock('the-answer')).toBe(false)
    expect(isUnlocked('the-answer')).toBe(true)
  })

  it('persists unlocks to localStorage', () => {
    unlock('root-access')
    expect(localStorage.getItem('ws-terminal-v1')).toContain('root-access')
  })

  it('starts empty for a fresh visitor', () => {
    expect(getProgress()).toEqual({ unlocked: [], total: ACHIEVEMENTS.length })
    expect(isUnlocked('wake-up-neo')).toBe(false)
  })

  it('getProgress reflects what has been unlocked', () => {
    unlock('wake-up-neo')
    unlock('dangerous-individual')
    const progress = getProgress()
    expect(progress.total).toBe(ACHIEVEMENTS.length)
    expect(progress.unlocked).toEqual(
      expect.arrayContaining(['wake-up-neo', 'dangerous-individual']),
    )
    expect(progress.unlocked).not.toContain('the-answer')
  })

  it('noteHiddenDiscovery dedupes and returns the running count', () => {
    expect(noteHiddenDiscovery('matrix')).toBe(1)
    expect(noteHiddenDiscovery('matrix')).toBe(1)
    expect(noteHiddenDiscovery('coffee')).toBe(2)
  })

  it('unlocks curious-mind once enough hidden commands are discovered', () => {
    const names = ['matrix', 'coffee', 'fortune', '42', 'party', 'hack']
    for (let i = 0; i < CURIOUS_MIND_THRESHOLD - 1; i++) {
      noteHiddenDiscovery(names[i])
      expect(isUnlocked('curious-mind')).toBe(false)
    }
    noteHiddenDiscovery(names[CURIOUS_MIND_THRESHOLD - 1])
    expect(isUnlocked('curious-mind')).toBe(true)
  })

  it('treats a corrupt store as empty and does not throw', () => {
    localStorage.setItem('ws-terminal-v1', '{ not json')
    expect(isUnlocked('the-answer')).toBe(false)
    expect(() => unlock('the-answer')).not.toThrow()
    expect(isUnlocked('the-answer')).toBe(true)
  })
})
