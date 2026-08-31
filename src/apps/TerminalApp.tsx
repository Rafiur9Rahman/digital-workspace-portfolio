import { useCallback, useEffect, useRef, type CSSProperties } from 'react'
import { useWindows } from '../store/windows'
import { useWorkspace } from '../store/workspace'
import { ACHIEVEMENTS, unlock, type AchievementId } from '../terminal/achievements'
import { complete } from '../terminal/autocomplete'
import { MatrixRain, PartyBurst } from '../terminal/easterEggs/effects'
import { Snake } from '../terminal/easterEggs/Snake'
import { useKonami } from '../terminal/easterEggs/useKonami'
import { portfolioFs } from '../terminal/filesystem'
import type { TerminalTheme } from '../terminal/prefs'
import { promptFor, useTerminalSession } from '../terminal/useTerminalSession'
import type { LineKind, OutputLine } from '../terminal/types'

/* Themes swap CSS variables on the terminal root; everything below reads them.
   Green (--tk) still means success / status. */
const THEMES: Record<
  TerminalTheme,
  { bg: string; fg: string; dim: string; accent: string; ok: string; err: string }
> = {
  dark: {
    bg: '#0b1020',
    fg: '#d7dcef',
    dim: '#8b97b8',
    accent: '#7aa2f7',
    ok: '#34d399',
    err: '#f87171',
  },
  matrix: {
    bg: '#020a04',
    fg: '#8dffb8',
    dim: '#41a86e',
    accent: '#38ff88',
    ok: '#c9ffdb',
    err: '#ff7a7a',
  },
  amber: {
    bg: '#1a1200',
    fg: '#ffc971',
    dim: '#b08640',
    accent: '#ffe0a3',
    ok: '#ffdd99',
    err: '#ff8a5c',
  },
  mono: {
    bg: '#0d0d0d',
    fg: '#d2d2d2',
    dim: '#7a7a7a',
    accent: '#ffffff',
    ok: '#eaeaea',
    err: '#ff9a9a',
  },
}

const KIND_CLASS: Record<LineKind, string> = {
  input: 'text-[var(--td)]',
  output: 'text-[var(--tf)]',
  error: 'text-[var(--te)]',
  system: 'text-[var(--tk)]',
  muted: 'text-[var(--td)]/85',
  accent: 'text-[var(--ta)]',
}

export function TerminalApp() {
  const openApp = useWindows((s) => s.openApp)
  const windows = useWindows((s) => s.windows)
  const closeWin = useWindows((s) => s.close)
  const minimizeWin = useWindows((s) => s.minimize)
  const restoreWin = useWindows((s) => s.restore)
  const reboot = useWorkspace((s) => s.reboot)
  const shutdown = useWorkspace((s) => s.shutdown)
  const startedAt = useWorkspace((s) => s.startedAt)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const winFor = (id: string) => windows.find((w) => w.appId === id)

  const { state, dispatch, submit } = useTerminalSession({
    openApp,
    openUrl: (url) => window.open(url, '_blank', 'noopener,noreferrer'),
    reboot,
    shutdown,
    uptimeMs: () => Date.now() - startedAt,
    listWindows: () =>
      [...windows]
        .sort((a, b) => a.z - b.z)
        .map((w) => ({ appId: w.appId, title: w.title, minimized: w.minimized })),
    closeApp: (id) => {
      const w = winFor(id)
      if (w) closeWin(w.id)
    },
    focusApp: (id) => {
      const w = winFor(id)
      if (w) restoreWin(w.id)
    },
    minimizeApp: (id) => {
      const w = winFor(id)
      if (w && !w.minimized) minimizeWin(w.id)
    },
    minimizeAll: () => {
      for (const w of windows) if (!w.minimized) minimizeWin(w.id)
    },
  })

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [state.lines])

  // Auto-dismiss achievement toasts, one after another.
  useEffect(() => {
    if (state.toasts.length === 0) return
    const timer = window.setTimeout(() => dispatch({ type: 'dismissToast' }), 3800)
    return () => clearTimeout(timer)
  }, [state.toasts, dispatch])

  useKonami(() => {
    dispatch({
      type: 'append',
      lines: [{ kind: 'system', text: '↑ ↑ ↓ ↓ ← → ← → B A — you know the way.' }],
    })
    dispatch({ type: 'setEffect', effect: 'party' })
    if (unlock('konami-code')) dispatch({ type: 'toast', ids: ['konami-code'] })
  })

  const clearEffect = useCallback(() => {
    dispatch({ type: 'setEffect', effect: null })
    inputRef.current?.focus()
  }, [dispatch])

  const dismissParty = useCallback(
    () => dispatch({ type: 'setEffect', effect: null }),
    [dispatch],
  )

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // A full-screen effect (matrix / snake) owns the keyboard while it's up —
    // let its own window listener handle everything, don't also nav history.
    if (state.effect) return
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      dispatch({ type: 'historyPrev' })
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      dispatch({ type: 'historyNext' })
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const result = complete(state.input, { cwd: state.cwd, fs: portfolioFs })
      if (result.replacement !== undefined) {
        dispatch({ type: 'setInput', value: result.replacement })
      } else if (result.matches.length > 1) {
        dispatch({
          type: 'append',
          lines: [
            { kind: 'input', text: `${promptFor(state.cwd)} ${state.input}` },
            { kind: 'muted', text: result.matches.join('   ') },
          ],
        })
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      dispatch({ type: 'clear' })
    }
  }

  const palette = THEMES[state.theme]
  const themeVars = {
    '--tb': palette.bg,
    '--tf': palette.fg,
    '--td': palette.dim,
    '--ta': palette.accent,
    '--tk': palette.ok,
    '--te': palette.err,
    backgroundColor: palette.bg,
  } as CSSProperties

  return (
    <div
      style={themeVars}
      className="relative h-full overflow-hidden font-mono text-[13px] leading-relaxed selection:bg-white/15"
      onClick={() => {
        if (!window.getSelection()?.toString()) inputRef.current?.focus()
      }}
    >
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Terminal output"
        className="desk-scroll h-full overflow-auto px-4 py-3"
      >
        <div className="mb-3 border-b border-[var(--td)]/25 pb-2.5">
          <p className="text-[var(--tf)]">Welcome to the terminal.</p>
          <p className="mt-0.5 text-[12px] text-[var(--td)]">
            Only use this if you&rsquo;re comfortable with a command line. Type{' '}
            <span className="text-[var(--tk)]">help</span> to get started.
          </p>
        </div>

        {state.lines.map((line, i) => (
          <TerminalLine key={i} line={line} />
        ))}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
          className="flex"
        >
          <Prompt cwd={state.cwd} />
          <input
            ref={inputRef}
            value={state.input}
            onChange={(e) => dispatch({ type: 'setInput', value: e.target.value })}
            onKeyDown={onKeyDown}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            aria-label="Terminal input"
            className="min-w-0 flex-1 bg-transparent text-[var(--tf)] caret-[var(--tk)] outline-none"
          />
        </form>
      </div>

      {state.effect === 'matrix' && <MatrixRain onExit={clearEffect} />}
      {state.effect === 'party' && <PartyBurst onExit={dismissParty} />}
      {state.effect === 'snake' && <Snake onExit={clearEffect} />}
      {state.toasts[0] && <AchievementToast id={state.toasts[0]} />}
    </div>
  )
}

function Prompt({ cwd }: { cwd: string }) {
  const path = cwd === '/' ? '~' : `~${cwd}`
  return (
    <span className="shrink-0 select-none whitespace-pre">
      <span className="text-[var(--tk)]">visitor@rafiur</span>
      <span className="text-[var(--td)]">:</span>
      <span className="text-[var(--ta)]">{path}</span>
      <span className="text-[var(--td)]">{'$ '}</span>
    </span>
  )
}

function TerminalLine({ line }: { line: OutputLine }) {
  if (line.kind === 'input' && line.text.startsWith('visitor@rafiur:')) {
    const i = line.text.indexOf('$ ')
    if (i !== -1) {
      return (
        <pre className="whitespace-pre-wrap break-words">
          <span className="text-[var(--tk)]/70">{line.text.slice(0, i + 1)}</span>
          <span className="text-[var(--tf)]/80">{line.text.slice(i + 1)}</span>
        </pre>
      )
    }
  }
  return (
    <pre className={`whitespace-pre-wrap break-words ${KIND_CLASS[line.kind]}`}>
      {line.text || ' '}
    </pre>
  )
}

function AchievementToast({ id }: { id: AchievementId }) {
  const def = ACHIEVEMENTS.find((a) => a.id === id)
  if (!def) return null
  return (
    <div
      role="status"
      className="animate-fade-in absolute right-3 top-3 z-20 max-w-[240px] rounded-lg border border-desk-edge bg-desk-panel px-3 py-2 shadow-xl"
    >
      <p className="text-[10px] uppercase tracking-widest text-desk-muted">
        Achievement unlocked
      </p>
      <p className="mt-0.5 text-sm text-desk-text">🏆 {def.title}</p>
    </div>
  )
}
