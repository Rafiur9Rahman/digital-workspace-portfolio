import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BootScreen } from './components/BootScreen'
import { Desktop } from './components/Desktop'

export default function App() {
  const [booted, setBooted] = useState(false)
  const reduce = useReducedMotion()

  return (
    <>
      {/* Homepage sits underneath and settles into place as the loader clears. */}
      <motion.div
        className="h-full w-full"
        initial={false}
        animate={{
          opacity: booted || reduce ? 1 : 0.55,
          scale: booted || reduce ? 1 : 0.994,
        }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Desktop />
      </motion.div>

      <AnimatePresence>
        {!booted && <BootScreen onDone={() => setBooted(true)} />}
      </AnimatePresence>
    </>
  )
}
