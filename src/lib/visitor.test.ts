import { describe, expect, it } from 'vitest'
import {
  forgetVisitor,
  hasSeenBoot,
  markBootSeen,
  recordVisit,
} from './visitor'

describe('visitor record', () => {
  it('reports the first visit', () => {
    const info = recordVisit()
    expect(info).toEqual({ isFirstVisit: true, visits: 1, previousVisit: null })
  })

  it('does not double-count within a session, but does across sessions', () => {
    recordVisit()
    expect(recordVisit().visits).toBe(1) // same session - guard holds

    sessionStorage.clear() // simulate a new browser session
    const next = recordVisit()
    expect(next.isFirstVisit).toBe(false)
    expect(next.visits).toBe(2)
    expect(next.previousVisit).toBeTypeOf('number')
  })

  it('tracks whether the full boot has played', () => {
    recordVisit()
    expect(hasSeenBoot()).toBe(false)
    markBootSeen()
    expect(hasSeenBoot()).toBe(true)
  })

  it('forget wipes it back to a clean first visit', () => {
    recordVisit()
    markBootSeen()
    forgetVisitor()
    expect(hasSeenBoot()).toBe(false)
    expect(recordVisit().isFirstVisit).toBe(true)
  })

  it('survives a corrupt record', () => {
    localStorage.setItem('ws-visitor-v1', '{broken')
    expect(recordVisit().isFirstVisit).toBe(true)
  })
})
