import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { MenuBar } from './MenuBar'
import { MatrixGlitch } from './MatrixGlitch'
import { Greeting } from './Greeting'
import { Dock } from './Dock'
import { DesktopIcons } from './DesktopIcons'
import { WelcomeModal } from './WelcomeModal'
import { Window } from './Window'
import { useWindows } from '../store/windows'

export function Desktop() {
  const windows = useWindows((s) => s.windows)
  const areaRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(() => ({
    w: typeof window === 'undefined' ? 1200 : window.innerWidth,
    h: typeof window === 'undefined' ? 800 : Math.max(200, window.innerHeight - 32),
  }))

  useEffect(() => {
    const measure = () => {
      const el = areaRef.current
      if (el) setSize({ w: el.clientWidth, h: el.clientHeight })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(1200px_600px_at_70%_-10%,#1b2a55_0%,#0b1020_60%)]">
      <MatrixGlitch />
      <MenuBar />

      {/* Window area sits between menu bar and screen bottom */}
      <div
        ref={areaRef}
        className="absolute inset-x-0 bottom-0 top-[calc(2rem+env(safe-area-inset-top))]"
      >
        <Greeting />
        <DesktopIcons deskW={size.w} deskH={size.h} />
        {/* Windows stay mounted while minimised (Window.tsx hides them) so their
            state - a running emulator, terminal history - survives. */}
        <AnimatePresence>
          {windows.map((win) => (
            <Window key={win.id} win={win} deskW={size.w} deskH={size.h} />
          ))}
        </AnimatePresence>
      </div>

      <Dock />
      <WelcomeModal />
    </div>
  )
}
