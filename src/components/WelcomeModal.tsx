import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useWorkspace } from '../store/workspace'
import { useIsMobile } from '../lib/useIsMobile'
import { WORKSPACE_VERSION } from '../lib/version'
import { markWelcomeSeen, shouldShowWelcome } from '../lib/welcome'

const APPS: { icon: string; name: string; blurb: string; soon?: boolean }[] = [
  {
    icon: '🗺️',
    name: 'Workspace Map',
    blurb: 'an interactive map of how my projects, skills and experience connect',
  },
  {
    icon: '⌨️',
    name: 'Terminal',
    blurb: 'where most of the depth is. Dozens of commands, a few secrets, even a game. Type help to start.',
  },
  {
    icon: '🗂️',
    name: 'Projects',
    blurb: 'the case files, with the tech and outcomes behind each',
  },
  {
    icon: '✨',
    name: 'AI Assistant',
    blurb: 'still in the workshop. A proper chat about my work is on the way.',
    soon: true,
  },
]

/* First-visit welcome. Rendered by Desktop once the boot cinematic clears.
   Closing it (button, X, backdrop, Esc) records the visit so it stays gone
   until the version changes or a long time passes. */
export function WelcomeModal() {
  const power = useWorkspace((s) => s.power)
  const mobile = useIsMobile()
  const [open, setOpen] = useState(() => shouldShowWelcome())

  const close = useCallback(() => {
    markWelcomeSeen()
    setOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  return (
    <AnimatePresence>
      {open && power === 'running' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={close}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-[480px] overflow-y-auto rounded-2xl border border-desk-edge bg-desk-panel p-7 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-desk-muted">
                  Welcome
                </p>
                <h2 className="mt-1.5 text-2xl font-semibold text-desk-text">
                  This is a little desktop.
                </h2>
              </div>
              <button
                onClick={close}
                aria-label="Close"
                className="-mr-1.5 -mt-1.5 shrink-0 rounded p-1.5 text-lg leading-none text-desk-muted hover:text-desk-text"
              >
                &times;
              </button>
            </div>

            <p className="mt-3.5 text-[15px] leading-relaxed text-desk-text">
              You have landed on my portfolio, built as a small operating system.
              Open apps from the dock along the bottom.
            </p>

            <ul className="mt-5 space-y-3.5">
              {APPS.map((a) => (
                <li key={a.name} className="flex gap-3 text-sm leading-relaxed">
                  <span className="shrink-0 text-[20px] leading-tight">
                    {a.icon}
                  </span>
                  <span className="text-desk-muted">
                    <span className="font-semibold text-desk-text">{a.name}</span>
                    {a.soon && (
                      <span className="ml-1.5 rounded bg-desk-edge/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-desk-muted">
                        Soon
                      </span>
                    )}
                    {' - '}
                    {a.blurb}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-5 rounded-lg border border-desk-edge bg-desk-bg/60 px-3.5 py-2.5 text-[13px] leading-relaxed text-desk-muted">
              {mobile
                ? 'You are on a phone. It works here, but this is built for a computer - open it on a laptop for the full thing.'
                : 'This is built for a computer. It works on a phone too, just smaller.'}
            </p>

            <div className="mt-6 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-widest text-desk-muted">
                Version {WORKSPACE_VERSION}
              </span>
              <button
                onClick={close}
                className="rounded-lg bg-desk-accent px-5 py-2.5 text-sm font-medium text-white hover:brightness-110"
              >
                Look around
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
