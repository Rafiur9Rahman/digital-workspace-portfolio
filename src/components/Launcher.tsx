import { motion } from 'framer-motion'
import { profile } from '../data/content'

/* The centred nameplate that sits on the desktop wallpaper. */
export function Launcher() {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        <h1 className="text-4xl font-semibold tracking-tight text-desk-text [text-shadow:0_2px_24px_rgba(0,0,0,0.5)]">
          {profile.name}
        </h1>
        <p className="mt-2 text-sm tracking-wide text-desk-muted">
          {profile.title}
        </p>
      </motion.div>
    </div>
  )
}
