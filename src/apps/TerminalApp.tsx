import { useEffect, useRef } from 'react'
import { useWindows } from '../store/windows'
import { useWorkspace } from '../store/workspace'
import { ACHIEVEMENTS, unlock, type AchievementId } from '../terminal/achievements'
import { complete } from '../terminal/autocomplete'
import { MatrixRain, PartyBurst } from '../terminal/easterEggs/effects'
import { useKonami } from '../terminal/easterEggs/useKonami'
import { portfolioFs } from '../terminal/filesystem'
import { promptFor, useTerminalSession } from '../terminal/useTerminalSession'
import type { LineKind, OutputLine } from '../terminal/types'

/* Green is reserved for success / status lines — the rest uses the normal
   desktop text palette so the terminal matches the other apps. */
const KIND_CLASS: Record<LineKind, string> = {
  input: 'text-desk-muted',
  output: 'text-desk-text',
  error: 'text-red-400',
  system: 'text-green-400',
  muted: 'text-desk-muted/80',
  accent: 'text-desk-accent',
}

export function TerminalApp() {
  const openApp = useWindows((s) => s.openApp)
  const reboot = useWorkspace((s) => s.reboot)
  const shutdown = useWorkspace((s) => s.shutdown)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { state, dispatch, submit } = useTerminalSession({
    openApp,
    openUrl: (url) => window.open(url, '_blank', 'noopener,noreferrer'),
    reboot,
    shutdown,
  })

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [state.lines, state.showHint])

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

  const clearEffect = () => {
    dispatch({ type: 'setEffect', effect: null })
    inputRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
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

  return (
    <div
      className="relative flex h-full flex-col bg-desk-bg font-mono text-xs"
      onClick={() => {
        if (!window.getSelection()?.toString()) inputRef.current?.focus()
      }}
    >
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Terminal output"
        className="desk-scroll flex-1 overflow-auto px-3 py-2.5 leading-relaxed"
      >
        {state.showHint && (
          <p className="text-desk-muted">
            Try: <span className="text-desk-text">help</span>,{' '}
            <span className="text-desk-text">projects</span>,{' '}
            <span className="text-desk-text">about</span>
          </p>
        )}
        {state.lines.map((line, i) => (
          <TerminalLine key={i} line={line} />
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        className="flex items-center gap-2 border-t border-desk-edge px-3 py-2"
      >
        <span className="shrink-0 select-none text-desk-accent">
          {promptFor(state.cwd)}
        </span>
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
          className="min-w-0 flex-1 bg-transparent text-desk-text outline-none"
        />
      </form>

      {state.effect === 'matrix' && <MatrixRain onExit={clearEffect} />}
      {state.effect === 'party' && (
        <PartyBurst onExit={() => dispatch({ type: 'setEffect', effect: null })} />
      )}
      {state.toasts[0] && <AchievementToast id={state.toasts[0]} />}
    </div>
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

function TerminalLine({ line }: { line: OutputLine }) {
  return (
    <pre className={`whitespace-pre-wrap break-words ${KIND_CLASS[line.kind]}`}>
      {line.text || ' '}
    </pre>
  )
}
