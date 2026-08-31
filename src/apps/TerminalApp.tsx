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

/* Green is reserved for success / status; the rest is a calm terminal palette
   (soft off-white body, blue paths, muted secondary). */
const KIND_CLASS: Record<LineKind, string> = {
  input: 'text-desk-muted',
  output: 'text-[#d7dcef]',
  error: 'text-red-400',
  system: 'text-emerald-400',
  muted: 'text-desk-muted/80',
  accent: 'text-[#7aa2f7]',
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
      className="relative h-full overflow-hidden bg-desk-bg font-mono text-[13px] leading-relaxed selection:bg-emerald-400/25"
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
        <div className="mb-3 border-b border-desk-edge/60 pb-2.5">
          <p className="text-[#d7dcef]">Welcome to the terminal.</p>
          <p className="mt-0.5 text-[12px] text-desk-muted">
            Only use this if you&rsquo;re comfortable with a command line. Type{' '}
            <span className="text-emerald-400">help</span> to get started.
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
            className="min-w-0 flex-1 bg-transparent text-[#e6ecff] caret-emerald-400 outline-none"
          />
        </form>
      </div>

      {state.effect === 'matrix' && <MatrixRain onExit={clearEffect} />}
      {state.effect === 'party' && (
        <PartyBurst onExit={() => dispatch({ type: 'setEffect', effect: null })} />
      )}
      {state.toasts[0] && <AchievementToast id={state.toasts[0]} />}
    </div>
  )
}

function Prompt({ cwd }: { cwd: string }) {
  const path = cwd === '/' ? '~' : `~${cwd}`
  return (
    <span className="shrink-0 select-none whitespace-pre">
      <span className="text-emerald-400">visitor@rafiur</span>
      <span className="text-desk-muted">:</span>
      <span className="text-[#7aa2f7]">{path}</span>
      <span className="text-desk-muted">{'$ '}</span>
    </span>
  )
}

function TerminalLine({ line }: { line: OutputLine }) {
  if (line.kind === 'input' && line.text.startsWith('visitor@rafiur:')) {
    const i = line.text.indexOf('$ ')
    if (i !== -1) {
      return (
        <pre className="whitespace-pre-wrap break-words">
          <span className="text-emerald-400/70">{line.text.slice(0, i + 1)}</span>
          <span className="text-desk-text/80">{line.text.slice(i + 1)}</span>
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
