import { Suspense, useEffect, useRef } from 'react'
import { motion, useDragControls, useMotionValue } from 'framer-motion'
import { APPS } from '../data/apps'
import { useWindows, type WinState } from '../store/windows'
import { loadLayout, saveLayout } from '../lib/windowLayout'

interface Props {
  win: WinState
  deskW: number
  deskH: number
}

const MIN_W = 300
const MIN_H = 200
const RESIZE_BREAKPOINT = 640 // below this width, windows aren't resizable

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

export function Window({ win, deskW, deskH }: Props) {
  const { close, focus, minimize, toggleMaximize, move, resize } = useWindows()
  const dragControls = useDragControls()

  const x = useMotionValue(win.x)
  const y = useMotionValue(win.y)
  const width = useMotionValue(win.width)
  const height = useMotionValue(win.height)

  const canResize = deskW >= RESIZE_BREAKPOINT

  // Keep the transform / size in sync when they change from outside a drag or
  // resize (opening, maximizing, un-maximizing, applying a saved layout).
  useEffect(() => {
    x.set(win.x)
    y.set(win.y)
  }, [win.x, win.y, x, y])

  useEffect(() => {
    width.set(win.width)
    height.set(win.height)
  }, [win.width, win.height, width, height])

  // Restore the last size/position this app was left at (once, desktop only).
  const appliedRef = useRef(false)
  useEffect(() => {
    if (appliedRef.current || !canResize) return
    appliedRef.current = true
    const saved = loadLayout(win.appId)
    if (saved) {
      move(win.id, saved.x, saved.y)
      resize(win.id, saved.width, saved.height)
    }
  }, [canResize, win.appId, win.id, move, resize])

  const persist = () => {
    if (canResize && !win.maximized) {
      saveLayout(win.appId, {
        x: x.get(),
        y: y.get(),
        width: width.get(),
        height: height.get(),
      })
    }
  }

  // Pointer-driven resize from any edge/corner. Independent of the title-bar
  // drag (which only starts via dragControls), so grabbing a handle never moves
  // the window. Dragging the top/left pins the opposite edge: y+height (or
  // x+width) change together in one gesture.
  const startResize =
    (dir: ResizeDir) => (e: React.PointerEvent<HTMLDivElement>) => {
      if (!canResize || win.maximized) return
      e.preventDefault()
      e.stopPropagation()
      focus(win.id)

      const el = e.currentTarget
      el.setPointerCapture(e.pointerId) // keep tracking if the pointer leaves the handle

      const px = e.clientX
      const py = e.clientY
      const x0 = x.get()
      const y0 = y.get()
      const w0 = width.get()
      const h0 = height.get()
      const right0 = x0 + w0 // fixed edge when dragging from the left
      const bottom0 = y0 + h0 // fixed edge when dragging from the top

      const fromN = dir.includes('n')
      const fromS = dir.includes('s')
      const fromW = dir.includes('w')
      const fromE = dir.includes('e')

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - px
        const dy = ev.clientY - py

        if (fromE) {
          width.set(clamp(w0 + dx, MIN_W, Math.max(MIN_W, deskW - x0)))
        } else if (fromW) {
          const nx = clamp(x0 + dx, 0, right0 - MIN_W)
          x.set(nx)
          width.set(right0 - nx)
        }

        if (fromS) {
          height.set(clamp(h0 + dy, MIN_H, Math.max(MIN_H, deskH - y0)))
        } else if (fromN) {
          const ny = clamp(y0 + dy, 0, bottom0 - MIN_H)
          y.set(ny)
          height.set(bottom0 - ny)
        }
      }
      const onEnd = () => {
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerup', onEnd)
        el.removeEventListener('lostpointercapture', onEnd)
        move(win.id, x.get(), y.get())
        resize(win.id, width.get(), height.get())
        persist()
      }
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerup', onEnd)
      el.addEventListener('lostpointercapture', onEnd)
    }

  const app = APPS[win.appId]
  const Body = app.component

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
      onDragEnd={() => {
        move(win.id, x.get(), y.get())
        persist()
      }}
      aria-hidden={win.minimized || undefined}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={
        win.minimized
          ? { opacity: 0, scale: 0.9, transitionEnd: { visibility: 'hidden' } }
          : { opacity: 1, scale: 1, visibility: 'visible' }
      }
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{
        x,
        y,
        width,
        height,
        zIndex: win.z,
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: win.minimized ? 'none' : undefined,
      }}
      className="flex flex-col overflow-hidden rounded-xl border border-white/[0.12] bg-desk-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_2px_8px_rgba(0,0,0,0.4),0_20px_44px_-10px_rgba(0,0,0,0.55),0_44px_90px_-24px_rgba(0,0,0,0.5)]"
    >
      <div
        onPointerDown={(e) => {
          if (!win.maximized) dragControls.start(e)
        }}
        onDoubleClick={() => toggleMaximize(win.id, deskW, deskH)}
        className="flex h-9 shrink-0 select-none items-center gap-2.5 border-b border-black/30 bg-gradient-to-b from-[#1c2540] to-desk-panel px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        style={{ cursor: win.maximized ? 'default' : 'grab' }}
      >
        <div className="group/tl flex items-center gap-2">
          <TrafficLight color="red" symbol="✕" label="Close" onClick={() => close(win.id)} />
          <TrafficLight
            color="yellow"
            symbol="−"
            label="Minimize"
            onClick={() => minimize(win.id)}
          />
          <TrafficLight
            color="green"
            symbol={win.maximized ? '−' : '+'}
            label={win.maximized ? 'Restore' : 'Maximize'}
            onClick={() => toggleMaximize(win.id, deskW, deskH)}
          />
        </div>

        <span className="ml-1 text-[15px] leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
          {app.icon}
        </span>
        <span className="truncate text-xs font-medium text-desk-text/85">
          {win.title}
        </span>
      </div>

      <div className="desk-scroll min-h-0 flex-1 overflow-auto">
        <Suspense
          fallback={
            <div className="p-4 text-sm text-desk-muted">Loading…</div>
          }
        >
          <Body />
        </Suspense>
      </div>

      {canResize && !win.maximized && (
        <>
          {/* edges (corners sit on top and own the 16px ends) */}
          <div
            onPointerDown={startResize('n')}
            className="absolute inset-x-4 top-0 z-10 h-1.5 cursor-n-resize"
          />
          <div
            onPointerDown={startResize('s')}
            className="absolute inset-x-4 bottom-0 z-10 h-2 cursor-s-resize"
          />
          <div
            onPointerDown={startResize('w')}
            className="absolute inset-y-4 left-0 z-10 w-2 cursor-w-resize"
          />
          <div
            onPointerDown={startResize('e')}
            className="absolute inset-y-4 right-0 z-10 w-2 cursor-e-resize"
          />
          {/* corners */}
          <div
            onPointerDown={startResize('nw')}
            className="absolute left-0 top-0 z-10 h-4 w-4 cursor-nw-resize"
          />
          <div
            onPointerDown={startResize('ne')}
            className="absolute right-0 top-0 z-10 h-4 w-4 cursor-ne-resize"
          />
          <div
            onPointerDown={startResize('sw')}
            className="absolute bottom-0 left-0 z-10 h-4 w-4 cursor-sw-resize"
          />
          <div
            onPointerDown={startResize('se')}
            className="absolute bottom-0 right-0 z-10 h-4 w-4 cursor-se-resize"
          >
            <span className="pointer-events-none absolute bottom-[3px] right-[3px] h-1.5 w-1.5 border-b-2 border-r-2 border-desk-muted/50" />
          </div>
        </>
      )}
    </motion.div>
  )
}

const TL_BG: Record<'red' | 'yellow' | 'green', string> = {
  red: 'radial-gradient(circle at 32% 28%, #ff9a8f, #ff5f57 55%, #d84036)',
  yellow: 'radial-gradient(circle at 32% 28%, #ffd67a, #febc2e 55%, #e0991a)',
  green: 'radial-gradient(circle at 32% 28%, #86e88f, #28c840 55%, #16a02f)',
}

function TrafficLight({
  color,
  symbol,
  label,
  onClick,
}: {
  color: 'red' | 'yellow' | 'green'
  symbol: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="grid h-3 w-3 place-items-center rounded-full leading-none text-black/45 transition-transform active:scale-90"
      style={{
        background: TL_BG[color],
        boxShadow:
          'inset 0 1px 1.5px rgba(255,255,255,0.6), inset 0 -1.5px 2px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.4)',
      }}
    >
      <span className="text-[8px] font-bold opacity-0 transition-opacity group-hover/tl:opacity-100">
        {symbol}
      </span>
    </button>
  )
}
