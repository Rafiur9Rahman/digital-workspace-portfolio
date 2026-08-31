import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useWorkspace } from '../store/workspace'
import { useWindows } from '../store/windows'
import { shouldShowWelcome } from '../lib/welcome'
import type { VisitInfo } from '../lib/visitor'

type Bucket = 'night' | 'morning' | 'afternoon' | 'evening'

function bucketFor(hour: number): Bucket {
  if (hour >= 22 || hour < 5) return 'night'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

const FIRST: Record<Bucket, string> = {
  night: 'Hello, night owl.',
  morning: 'Good morning.',
  afternoon: 'Good afternoon.',
  evening: 'Good evening.',
}

const RETURNING: Record<Bucket, string[]> = {
  night: [
    'Hello again, night owl.',
    'Welcome back. Late one tonight.',
    'Back at this hour? Respect.',
    'The workspace never sleeps. Apparently neither do you.',
  ],
  morning: [
    'Good morning, welcome back.',
    'Morning. Good to see you again.',
    'Welcome back. Early start.',
  ],
  afternoon: [
    'Good afternoon, welcome back.',
    'Welcome back.',
    'Afternoon. Back for more?',
  ],
  evening: [
    'Good evening, welcome back.',
    'Evening. Good to see you again.',
    'Welcome back.',
  ],
}

interface GreetingText {
  primary: string
  secondary?: string
}

function greetingFor(visit: VisitInfo): GreetingText {
  const bucket = bucketFor(new Date().getHours())
  if (visit.isFirstVisit) {
    return {
      primary: FIRST[bucket],
      secondary: 'This is a desktop OS. Try the dock, or open the Terminal.',
    }
  }
  const pool = RETURNING[bucket]
  return { primary: pool[Math.floor(Math.random() * pool.length)] }
}

/* A greeting that appears once the desktop settles and fades itself out. */
export function Greeting() {
  const power = useWorkspace((s) => s.power)
  const visit = useWorkspace((s) => s.visit)
  const hasWindows = useWindows((s) => s.windows.length > 0)
  const reduce = useReducedMotion()
  const [visible, setVisible] = useState(true)
  const [text] = useState(() => greetingFor(visit))
  // The welcome dialog is doing the welcoming this load; stay out of its way.
  const [welcomePending] = useState(shouldShowWelcome)

  useEffect(() => {
    if (power !== 'running') return
    const timer = setTimeout(() => setVisible(false), reduce ? 3200 : 5200)
    return () => clearTimeout(timer)
  }, [power, reduce])

  if (power !== 'running' || welcomePending) return null

  return (
    <AnimatePresence>
      {/* The greeting welcomes the empty desktop; once an app is open it would
          just sit on top of the window, so it fades away. */}
      {visible && !hasWindows && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.5, delay: reduce ? 0 : 0.35 }}
          className="pointer-events-none absolute inset-x-0 top-16 z-20 flex flex-col items-center gap-0.5 px-6 text-center"
        >
          <p className="text-sm text-desk-text [text-shadow:0_1px_10px_rgba(0,0,0,0.6)]">
            {text.primary}
          </p>
          {text.secondary && (
            <p className="text-xs text-desk-muted [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
              {text.secondary}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
