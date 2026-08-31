import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BootScreen } from './components/BootScreen'
import { ShutdownScreen } from './components/ShutdownScreen'
import { Desktop } from './components/Desktop'
import { useAuth } from './store/auth'
import { useWorkspace } from './store/workspace'

export default function App() {
  const power = useWorkspace((s) => s.power)
  const powerOn = useWorkspace((s) => s.powerOn)
  const reboot = useWorkspace((s) => s.reboot)
  const reduce = useReducedMotion()

  useEffect(() => useAuth.getState().init(), [])

  const settled = power === 'running'

  return (
    <>
      {/* Homepage sits underneath and settles into place as the loader clears. */}
      <motion.div
        className="h-full w-full"
        initial={false}
        animate={{
          opacity: settled || reduce ? 1 : 0.55,
          scale: settled || reduce ? 1 : 0.994,
        }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Desktop />
      </motion.div>

      <AnimatePresence>
        {power === 'booting' && <BootScreen key="boot" onDone={powerOn} />}
        {power === 'shutdown' && (
          <ShutdownScreen key="shutdown" onPowerOn={reboot} />
        )}
      </AnimatePresence>
    </>
  )
}
