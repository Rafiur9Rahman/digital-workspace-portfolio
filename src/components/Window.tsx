import { useEffect } from 'react'
import { motion, useDragControls, useMotionValue } from 'framer-motion'
import { APPS } from '../data/apps'
import { useWindows, type WinState } from '../store/windows'

interface Props {
  win: WinState
  deskW: number
  deskH: number
}

export function Window({ win, deskW, deskH }: Props) {
  const { close, focus, minimize, toggleMaximize, move } = useWindows()
  const dragControls = useDragControls()

  const x = useMotionValue(win.x)
  const y = useMotionValue(win.y)

  // Keep the transform in sync when position changes from outside a drag
  // (opening, maximizing, un-maximizing).
  useEffect(() => {
    x.set(win.x)
    y.set(win.y)
  }, [win.x, win.y, x, y])

  const app = APPS[win.appId]
  const Body = app.component

  if (win.minimized) return null

  return (
    <motion.div
      drag={!win.maximized}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragConstraints={{
        left: 0,
        top: 0,
        right: Math.max(0, deskW - win.width),
        bottom: Math.max(0, deskH - 44),
      }}
      onPointerDownCapture={() => focus(win.id)}
      onDragEnd={() => move(win.id, x.get(), y.get())}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.14 }}
      style={{
        x,
        y,
        width: win.width,
        height: win.height,
        zIndex: win.z,
        position: 'absolute',
        top: 0,
        left: 0,
      }}
      className="flex flex-col overflow-hidden rounded-xl border border-desk-edge bg-desk-panel shadow-2xl shadow-black/50"
    >
      <div
        onPointerDown={(e) => {
          if (!win.maximized) dragControls.start(e)
        }}
        onDoubleClick={() => toggleMaximize(win.id, deskW, deskH)}
        className="flex h-9 shrink-0 select-none items-center gap-2 border-b border-desk-edge bg-desk-bg/60 px-3"
        style={{ cursor: win.maximized ? 'default' : 'grab' }}
      >
        <span className="text-sm">{app.icon}</span>
        <span className="text-xs font-medium text-desk-muted">{win.title}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            aria-label="Minimize"
            onClick={() => minimize(win.id)}
            className="grid h-4 w-4 place-items-center rounded-full bg-yellow-500/80 text-[9px] text-black/70 hover:bg-yellow-400"
          >
            –
          </button>
          <button
            aria-label="Maximize"
            onClick={() => toggleMaximize(win.id, deskW, deskH)}
            className="grid h-4 w-4 place-items-center rounded-full bg-green-500/80 text-[9px] text-black/70 hover:bg-green-400"
          >
            ⤢
          </button>
          <button
            aria-label="Close"
            onClick={() => close(win.id)}
            className="grid h-4 w-4 place-items-center rounded-full bg-red-500/80 text-[9px] text-black/70 hover:bg-red-400"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="desk-scroll min-h-0 flex-1 overflow-auto">
        <Body />
      </div>
    </motion.div>
  )
}
