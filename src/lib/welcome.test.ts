import { afterEach, describe, expect, it } from 'vitest'
import { forgetWelcome, markWelcomeSeen, shouldShowWelcome } from './welcome'
import { WORKSPACE_VERSION } from './version'

afterEach(() => forgetWelcome())

describe('welcome dialog state', () => {
  it('shows for a fresh visitor', () => {
    expect(shouldShowWelcome()).toBe(true)
  })

  it('stays gone once seen at the current version', () => {
    markWelcomeSeen()
    expect(shouldShowWelcome()).toBe(false)
  })

  it('comes back when the workspace version changes', () => {
    localStorage.setItem(
      'ws-welcome-v1',
      JSON.stringify({ version: 'R0.1', seenAt: Date.now() }),
    )
    expect(shouldShowWelcome()).toBe(true)
  })

  it('comes back after a long absence', () => {
    localStorage.setItem(
      'ws-welcome-v1',
      JSON.stringify({
        version: WORKSPACE_VERSION,
        seenAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
      }),
    )
    expect(shouldShowWelcome()).toBe(true)
  })

  it('treats a corrupt record as fresh', () => {
    localStorage.setItem('ws-welcome-v1', '{not json')
    expect(shouldShowWelcome()).toBe(true)
  })

  it('forget clears it', () => {
    markWelcomeSeen()
    forgetWelcome()
    expect(shouldShowWelcome()).toBe(true)
  })
})
