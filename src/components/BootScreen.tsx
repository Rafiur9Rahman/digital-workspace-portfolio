import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/* ---------------------------------------------------------------------------
   Timing. First visit gets the full ~5s cinematic; returning visitors get a
   trimmed ~2.7s run of the same animation (`fast`). The curve / process /
   message tables below are fractions of the script, so they scale for free.
--------------------------------------------------------------------------- */
const timing = (fast: boolean) => {
  const script = fast ? 1900 : 4150 // animated boot (bars + rolling messages)
  const systems = fast ? 340 : 480 // "ALL SYSTEMS READY" hold
  const welcome = fast ? 400 : 370 // final line hold
  return { script, systems, welcome, total: script + systems + welcome }
}

/* Non-linear overall progress: quick early movement, tiny pauses, final jump.
   Values are read as a smooth curve between control points (fraction -> %). */
const OVERALL: { t: number; v: number }[] = [
  { t: 0, v: 0 },
  { t: 0.1, v: 18 },
  { t: 0.17, v: 20 }, // subtle pause
  { t: 0.3, v: 37 },
  { t: 0.44, v: 52 },
  { t: 0.52, v: 54 }, // subtle pause
  { t: 0.66, v: 68 },
  { t: 0.82, v: 84 },
  { t: 0.92, v: 96 },
  { t: 1, v: 100 }, // final jump
]

/* Individual processes: staggered starts, different speeds, each ends in READY. */
const PROCESSES = [
  { label: 'Profile Engine', start: 0.0, end: 0.38 },
  { label: 'Experience Data', start: 0.06, end: 0.52 },
  { label: 'Project Index', start: 0.1, end: 0.78 },
  { label: 'AI Context', start: 0.16, end: 0.96 },
]

const MESSAGES: { at: number; text: string }[] = [
  { at: 0.0, text: 'Establishing workspace...' },
  { at: 0.2, text: 'Loading project index...' },
  { at: 0.4, text: 'Preparing AI context...' },
  { at: 0.58, text: 'Mapping experience data...' },
  { at: 0.78, text: 'Connecting interface...' },
  { at: 1.0, text: 'Workspace ready.' },
]

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n))
const smoothstep = (t: number) => {
  const x = clamp(t)
  return x * x * (3 - 2 * x)
}

function curve(points: { t: number; v: number }[], frac: number) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    if (frac <= b.t) {
      const local = (frac - a.t) / (b.t - a.t || 1)
      return a.v + (b.v - a.v) * smoothstep(local)
    }
  }
  return points[points.length - 1].v
}

type Mode = 'full' | 'reduced'

function pickMode(): Mode {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    return 'reduced'
  }
  return 'full'
}

export function BootScreen({
  onDone,
  fast = false,
  session = 1,
}: {
  onDone: () => void
  fast?: boolean
  session?: number
}) {
  const [mode] = useState<Mode>(pickMode)
  const [elapsed, setElapsed] = useState(0)
  const doneRef = useRef(false)
  const t = timing(fast)

  useEffect(() => {
    const finish = () => {
      if (doneRef.current) return
      doneRef.current = true
      onDone()
    }

    if (mode === 'reduced') {
      const timer = setTimeout(finish, 800)
      return () => clearTimeout(timer)
    }

    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const e = now - start
      setElapsed(e)
      if (e >= t.total) {
        finish()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mode, onDone, t.total])

  const frac = clamp(elapsed / t.script)
  const overall = Math.round(curve(OVERALL, frac))
  const phase =
    elapsed < t.script
      ? 'boot'
      : elapsed < t.script + t.systems
        ? 'systems'
        : 'welcome'

  const rows = PROCESSES.map((p) => {
    const ready = frac >= p.end
    const v = ready ? 100 : clamp((frac - p.start) / (p.end - p.start)) * 100
    return { label: p.label, ready, v }
  })

  const bootMsg =
    [...MESSAGES].reverse().find((m) => frac >= m.at)?.text ?? MESSAGES[0].text
  const welcomeLine =
    session > 1 ? `WELCOME BACK · SESSION #${session}` : 'WELCOME TO MY WORKSPACE'
  const line =
    phase === 'systems'
      ? 'ALL SYSTEMS READY'
      : phase === 'welcome'
        ? welcomeLine
        : bootMsg

  return (
    <motion.div
      role="status"
      aria-label="Loading workspace"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96, filter: 'blur(6px)' }}
      transition={{ duration: mode === 'full' ? 0.5 : 0.3, ease: [0.4, 0, 0.2, 1] }}
      style={{ willChange: 'opacity, transform, filter' }}
      className="fixed inset-0 z-50 flex select-none items-center justify-center overflow-hidden bg-desk-bg text-desk-text"
    >
      {/* Ambient background — deliberately near-subliminal */}
      <div className="boot-drift pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(91,140,255,0.15),transparent_60%)] blur-3xl" />
      </div>
      <div className="boot-grid pointer-events-none absolute inset-0" />
      <div className="boot-grain pointer-events-none absolute inset-0 mix-blend-overlay" />

      <div className="relative w-[84vw] max-w-[780px] rounded-2xl border border-desk-edge bg-desk-bg/50 px-6 py-9 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65),0_0_44px_-14px_rgba(91,140,255,0.22)] backdrop-blur-[2px] sm:px-12 sm:py-12">
        {/* Header */}
        <div className="text-center">
          <p className="text-[11px] font-medium tracking-[0.36em] text-desk-muted sm:text-[13px] sm:tracking-[0.46em]">
            RAFIUR RAHMAN
          </p>
          <p className="mt-1.5 text-[10px] tracking-[0.32em] text-desk-muted/60 sm:text-[11px] sm:tracking-[0.4em]">
            DIGITAL WORKSPACE
          </p>
          <div className="mt-4 inline-flex items-center gap-2">
            <span className="boot-dot h-2 w-2 rounded-full bg-desk-accent shadow-[0_0_9px_rgba(91,140,255,0.85)]" />
            <span className="text-[10px] tracking-[0.32em] text-desk-muted/70 sm:tracking-[0.36em]">
              SYSTEM ONLINE
            </span>
          </div>
        </div>

        {mode === 'full' && (
          <div className="mt-14">
            {/* Overall progress */}
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[10px] tracking-[0.2em] text-desk-muted sm:text-[12px] sm:tracking-[0.32em]">
                WORKSPACE INITIALISATION
              </span>
              <span className="font-mono text-sm tabular-nums text-desk-text">
                {phase === 'boot' ? `${overall}%` : 'READY'}
              </span>
            </div>
            <Segments
              className="mt-3.5"
              value={phase === 'boot' ? overall : 100}
              ready={phase !== 'boot'}
              tall
            />

            {/* Per-process progress */}
            <div className="mt-12 space-y-6">
              {rows.map((r) => (
                <div key={r.label} className={r.ready ? 'boot-pop' : undefined}>
                  <div className="flex items-baseline justify-between gap-4">
                    <span
                      className={`text-[12px] tracking-wide transition-colors duration-300 sm:text-[13px] ${
                        r.ready ? 'text-desk-text' : 'text-desk-muted'
                      }`}
                    >
                      {r.label}
                    </span>
                    <span
                      className={`font-mono text-[11px] tabular-nums transition-colors duration-300 sm:text-xs ${
                        r.ready ? 'text-desk-accent' : 'text-desk-muted/70'
                      }`}
                    >
                      {r.ready ? 'READY' : `${Math.round(r.v)}%`}
                    </span>
                  </div>
                  <Segments className="mt-2.5" value={r.v} ready={r.ready} />
                </div>
              ))}
            </div>

            {/* Rolling status line / final message */}
            <div className="relative mt-12 h-6 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={line}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className={
                    phase === 'boot'
                      ? 'absolute inset-x-0 text-center font-mono text-[12px] text-desk-muted'
                      : 'absolute inset-x-0 text-center text-[11px] tracking-[0.24em] text-desk-text sm:text-[13px] sm:tracking-[0.34em]'
                  }
                >
                  {phase === 'systems' ? `✓  ${line}` : line}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        )}

        {mode === 'reduced' && (
          <div className="mt-10">
            <Segments value={100} ready />
            <p className="mt-3.5 text-center font-mono text-[12px] text-desk-muted">
              {session > 1 ? 'Welcome back…' : 'Loading workspace…'}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* A progress bar rendered as discrete data blocks that switch on left-to-right.
   No track/container — the blocks span the full row width (so every bar lines
   up), and the block count is derived from the measured width so they stay a
   consistent size regardless of screen size. */
function Segments({
  value,
  ready = false,
  tall = false,
  className = '',
}: {
  value: number
  ready?: boolean
  tall?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)

  const blockW = 3
  const pitch = 7 // block + minimum gap

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      if (w > 0) {
        setCount(Math.min(180, Math.max(8, Math.floor((w + pitch - blockW) / pitch))))
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const filled = count ? (clamp(value, 0, 100) / 100) * count : 0

  return (
    <div
      ref={ref}
      aria-hidden
      className={`flex w-full items-stretch justify-between ${
        ready ? 'brightness-110' : ''
      } ${className}`}
      style={{ height: tall ? 17 : 10 }}
    >
      {Array.from({ length: count }, (_, i) => {
        const on = clamp(filled - i, 0, 1)
        return (
          <span
            key={i}
            className="rounded-[1px] bg-desk-edge/40"
            style={{ width: blockW }}
          >
            <span
              className="block h-full w-full rounded-[1px] bg-desk-accent transition-opacity duration-150 ease-out"
              style={{
                opacity: on * (ready ? 1 : 0.9),
                boxShadow:
                  on > 0.85 ? '0 0 3px rgba(91, 140, 255, 0.4)' : undefined,
              }}
            />
          </span>
        )
      })}
    </div>
  )
}
