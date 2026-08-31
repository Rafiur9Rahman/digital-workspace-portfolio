import { describe, expect, it } from 'vitest'
import { INITIAL_SESSION, promptFor, reducer, type SessionState } from './useTerminalSession'

const start = (over: Partial<SessionState> = {}): SessionState => ({ ...INITIAL_SESSION, ...over })

describe('session reducer', () => {
  it('appends lines to the buffer', () => {
    const next = reducer(start(), {
      type: 'append',
      lines: [{ kind: 'output', text: 'hi' }],
    })
    expect(next.lines).toEqual([{ kind: 'output', text: 'hi' }])
  })

  it('clear empties the buffer', () => {
    const next = reducer(start({ lines: [{ kind: 'output', text: 'x' }] }), { type: 'clear' })
    expect(next.lines).toEqual([])
  })

  it('pushSubmitted records the line and parks the cursor at the end', () => {
    const next = reducer(start(), { type: 'pushSubmitted', line: 'help' })
    expect(next.submitted).toEqual(['help'])
    expect(next.histCursor).toBe(1)
  })

  it('historyPrev / historyNext walk the recorded commands', () => {
    let s = start()
    s = reducer(s, { type: 'pushSubmitted', line: 'a' })
    s = reducer(s, { type: 'pushSubmitted', line: 'b' })

    s = reducer(s, { type: 'historyPrev' })
    expect(s.input).toBe('b')
    s = reducer(s, { type: 'historyPrev' })
    expect(s.input).toBe('a')
    s = reducer(s, { type: 'historyPrev' })
    expect(s.input).toBe('a') // clamped

    s = reducer(s, { type: 'historyNext' })
    expect(s.input).toBe('b')
    s = reducer(s, { type: 'historyNext' })
    expect(s.input).toBe('') // back to a fresh line
  })

  it('typing resets the history cursor to the end', () => {
    let s = start()
    s = reducer(s, { type: 'pushSubmitted', line: 'a' })
    s = reducer(s, { type: 'historyPrev' })
    s = reducer(s, { type: 'setInput', value: 'ab' })
    expect(s.histCursor).toBe(s.submitted.length)
  })

  it('history navigation is a no-op with no history', () => {
    const s = start()
    expect(reducer(s, { type: 'historyPrev' })).toBe(s)
    expect(reducer(s, { type: 'historyNext' })).toBe(s)
  })

  it('setCwd updates the working directory', () => {
    expect(reducer(start(), { type: 'setCwd', cwd: '/projects' }).cwd).toBe('/projects')
  })

  it('queues and dequeues achievement toasts', () => {
    let s = reducer(start(), { type: 'toast', ids: ['the-answer', 'root-access'] })
    expect(s.toasts).toEqual(['the-answer', 'root-access'])
    s = reducer(s, { type: 'dismissToast' })
    expect(s.toasts).toEqual(['root-access'])
    s = reducer(s, { type: 'dismissToast' })
    expect(s.toasts).toEqual([])
  })
})

describe('promptFor', () => {
  it('shows ~ at the root', () => {
    expect(promptFor('/')).toBe('visitor@rafiur:~$')
  })

  it('shows the path elsewhere', () => {
    expect(promptFor('/projects')).toBe('visitor@rafiur:~/projects$')
  })
})
