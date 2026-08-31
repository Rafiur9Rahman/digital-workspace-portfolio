import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { AppId } from '../data/appMeta'
import type {
  CommandResult,
  OutputLine,
  TerminalEffect,
  TerminalWindow,
} from './types'
import { listCommands } from './registry'
import { runLine } from './runner'
import { portfolioFs } from './filesystem'
import { bumpCommandCount, loadPrefs, savePrefs, type TerminalTheme } from './prefs'
import {
  getProgress,
  unlock as unlockAchievement,
  type AchievementId,
} from './achievements'

const ANOMALIES = [
  'A cosmic ray flipped a bit somewhere. Probably fine.',
  'kernel: reticulating splines...',
  'A wild semicolon appeared. It was not needed.',
  'The terminal briefly considered becoming a spreadsheet.',
  'Someone wrote this feature at 3am. It shows.',
  'entropy pool topped up.',
  'That command was witnessed by exactly zero people.',
]

export interface SessionDeps {
  openApp: (id: AppId) => void
  openUrl: (url: string) => void
  reboot: () => void
  shutdown: () => void
  listWindows: () => TerminalWindow[]
  closeApp: (id: AppId) => void
  focusApp: (id: AppId) => void
  minimizeApp: (id: AppId) => void
  minimizeAll: () => void
  uptimeMs: () => number
}

export interface SessionState {
  lines: OutputLine[]
  input: string
  /** submitted command lines, oldest first — powers ↑/↓ and `history` */
  submitted: string[]
  /** cursor into `submitted`; === submitted.length means "editing a new line" */
  histCursor: number
  cwd: string
  effect: TerminalEffect | null
  running: boolean
  theme: TerminalTheme
  /** queue of achievements to announce, oldest first */
  toasts: AchievementId[]
}

export const INITIAL_SESSION: SessionState = {
  lines: [],
  input: '',
  submitted: [],
  histCursor: 0,
  cwd: '/',
  effect: null,
  running: false,
  theme: 'dark',
  toasts: [],
}

export type SessionAction =
  | { type: 'setInput'; value: string }
  | { type: 'append'; lines: OutputLine[] }
  | { type: 'clear' }
  | { type: 'setCwd'; cwd: string }
  | { type: 'setEffect'; effect: TerminalEffect | null }
  | { type: 'setRunning'; running: boolean }
  | { type: 'pushSubmitted'; line: string }
  | { type: 'historyPrev' }
  | { type: 'historyNext' }
  | { type: 'toast'; ids: AchievementId[] }
  | { type: 'dismissToast' }
  | { type: 'clearHistory' }
  | { type: 'setTheme'; theme: TerminalTheme }

export function reducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'setInput':
      return { ...state, input: action.value, histCursor: state.submitted.length }
    case 'append':
      return { ...state, lines: [...state.lines, ...action.lines] }
    case 'clear':
      return { ...state, lines: [] }
    case 'setCwd':
      return { ...state, cwd: action.cwd }
    case 'setEffect':
      return { ...state, effect: action.effect }
    case 'setRunning':
      return { ...state, running: action.running }
    case 'toast':
      return { ...state, toasts: [...state.toasts, ...action.ids] }
    case 'dismissToast':
      return { ...state, toasts: state.toasts.slice(1) }
    case 'clearHistory':
      return { ...state, submitted: [], histCursor: 0 }
    case 'setTheme':
      return { ...state, theme: action.theme }
    case 'pushSubmitted':
      return {
        ...state,
        submitted: [...state.submitted, action.line],
        histCursor: state.submitted.length + 1,
      }
    case 'historyPrev': {
      if (state.submitted.length === 0) return state
      const cursor = Math.max(0, state.histCursor - 1)
      return { ...state, histCursor: cursor, input: state.submitted[cursor] ?? '' }
    }
    case 'historyNext': {
      if (state.submitted.length === 0) return state
      const cursor = Math.min(state.submitted.length, state.histCursor + 1)
      return {
        ...state,
        histCursor: cursor,
        input: cursor === state.submitted.length ? '' : state.submitted[cursor],
      }
    }
    default:
      return state
  }
}

export function promptFor(cwd: string): string {
  return `visitor@rafiur:${cwd === '/' ? '~' : `~${cwd}`}$`
}

function toLine(line: OutputLine | string): OutputLine {
  return typeof line === 'string' ? { kind: 'output', text: line } : line
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function useTerminalSession(deps: SessionDeps) {
  const [state, dispatch] = useReducer(reducer, INITIAL_SESSION, (initial) => ({
    ...initial,
    theme: loadPrefs().theme,
  }))

  const stateRef = useRef(state)
  const depsRef = useRef(deps)
  const controllersRef = useRef<AbortController[]>([])

  // Keep the latest values reachable from the stable `submit` callback without
  // rebuilding it every render. submit() only ever runs from an event handler,
  // i.e. after these effects have flushed.
  useEffect(() => {
    stateRef.current = state
    depsRef.current = deps
  })

  useEffect(() => {
    const controllers = controllersRef.current
    return () => controllers.forEach((c) => c.abort())
  }, [])

  const applyResult = useCallback((result: CommandResult) => {
    if (result == null) return
    if (typeof result === 'string') {
      dispatch({ type: 'append', lines: [{ kind: 'output', text: result }] })
      return
    }
    if (Array.isArray(result)) {
      dispatch({ type: 'append', lines: result.map((text) => ({ kind: 'output', text })) })
      return
    }
    if (result.clear) dispatch({ type: 'clear' })
    if (result.lines?.length) dispatch({ type: 'append', lines: result.lines })
    if (result.cwd) dispatch({ type: 'setCwd', cwd: result.cwd })
    if (result.effect) dispatch({ type: 'setEffect', effect: result.effect })
    if (result.theme) {
      dispatch({ type: 'setTheme', theme: result.theme })
      savePrefs({ theme: result.theme })
    }
  }, [])

  const submit = useCallback(async () => {
    const current = stateRef.current
    const prompt = promptFor(current.cwd)
    let raw = current.input.trim()

    dispatch({ type: 'setInput', value: '' })

    if (!raw) {
      dispatch({ type: 'append', lines: [{ kind: 'input', text: prompt }] })
      return
    }

    if (raw === '!!') {
      const previous = current.submitted.at(-1)
      if (!previous) {
        dispatch({
          type: 'append',
          lines: [
            { kind: 'input', text: `${prompt} !!` },
            { kind: 'error', text: '!!: no previous command' },
          ],
        })
        return
      }
      raw = previous
    }

    dispatch({ type: 'append', lines: [{ kind: 'input', text: `${prompt} ${raw}` }] })
    dispatch({ type: 'pushSubmitted', line: raw })
    dispatch({ type: 'setRunning', running: true })

    const controller = new AbortController()
    controllersRef.current.push(controller)
    const unlockedBefore = new Set(getProgress().unlocked)
    bumpCommandCount()

    try {
      const result = await runLine(raw, {
        history: [...current.submitted, raw],
        cwd: current.cwd,
        fs: portfolioFs,
        listCommands,
        print: (line) => dispatch({ type: 'append', lines: [toLine(line)] }),
        signal: controller.signal,
        reducedMotion: prefersReducedMotion(),
        uptimeMs: depsRef.current.uptimeMs(),
        terminalTheme: current.theme,
        openApp: (id) => depsRef.current.openApp(id),
        openUrl: (url) => depsRef.current.openUrl(url),
        reboot: () => depsRef.current.reboot(),
        shutdown: () => depsRef.current.shutdown(),
        setCwd: (path) => dispatch({ type: 'setCwd', cwd: path }),
        unlock: (id) => {
          unlockAchievement(id)
        },
        listWindows: () => depsRef.current.listWindows(),
        closeApp: (id) => depsRef.current.closeApp(id),
        focusApp: (id) => depsRef.current.focusApp(id),
        minimizeApp: (id) => depsRef.current.minimizeApp(id),
        minimizeAll: () => depsRef.current.minimizeAll(),
        clearHistory: () => dispatch({ type: 'clearHistory' }),
      })
      applyResult(result)
      const freshlyUnlocked = getProgress().unlocked.filter(
        (id) => !unlockedBefore.has(id),
      )
      if (freshlyUnlocked.length) {
        dispatch({ type: 'toast', ids: freshlyUnlocked })
      }
      // Rare harmless flavour — repeat visitors occasionally see something odd.
      if (Math.random() < 0.01) {
        dispatch({
          type: 'append',
          lines: [
            {
              kind: 'muted',
              text: `» ${ANOMALIES[Math.floor(Math.random() * ANOMALIES.length)]}`,
            },
          ],
        })
      }
    } catch (error) {
      dispatch({
        type: 'append',
        lines: [
          { kind: 'error', text: error instanceof Error ? error.message : String(error) },
        ],
      })
    } finally {
      controllersRef.current = controllersRef.current.filter((c) => c !== controller)
      dispatch({ type: 'setRunning', running: false })
    }
  }, [applyResult])

  return { state, dispatch, submit }
}
