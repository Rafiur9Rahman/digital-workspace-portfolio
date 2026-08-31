import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/* Fake OS power-off. Never closes the tab - the workspace boots again on
   Enter / click / the power button, which replays the real BootScreen. */
export function ShutdownScreen({ onPowerOn }: { onPowerOn: () => void }) {
  const reduce = useReducedMotion()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onPowerOn()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onPowerOn])

  return (
    <motion.div
      role="alertdialog"
      aria-label="Workspace powered off"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.4, ease: [0.4, 0, 0.2, 1] }}
      onClick={onPowerOn}
      className="fixed inset-0 z-50 flex cursor-pointer select-none flex-col items-center justify-center gap-7 bg-desk-bg text-center text-desk-text"
    >
      <div>
        <p className="text-[11px] tracking-[0.36em] text-desk-muted">
          WORKSPACE POWERED OFF
        </p>
        <p className="mt-3 text-lg">It is now safe to close your browser.</p>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onPowerOn()
        }}
        className="grid h-12 w-12 place-items-center rounded-full border border-desk-edge text-lg text-desk-muted transition hover:border-desk-accent hover:text-desk-text"
        aria-label="Power on"
      >
        ⏻
      </button>

      <p className="text-xs text-desk-muted/60">Press Enter or click anywhere to boot</p>
    </motion.div>
  )
}
