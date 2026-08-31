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
const MOBILE_DOCK_CLEARANCE = 74 // px kept clear at the bottom for the dock

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

export function Window({ win, deskW, deskH }: Props) {
  const { close, focus, minimize, toggleMaximize, move, resize } = useWindows()
  const dragControls = useDragControls()

  const canResize = deskW >= RESIZE_BREAKPOINT
  const mobile = deskW < RESIZE_BREAKPOINT

  // On a phone every window fills the screen (minus the dock). The stored
  // desktop bounds are left untouched for when the viewport grows back.
  const bounds = mobile
    ? {
        x: 0,
        y: 0,
        width: deskW,
        height: Math.max(MIN_H, deskH - MOBILE_DOCK_CLEARANCE),
      }
    : { x: win.x, y: win.y, width: win.width, height: win.height }

  // The front-most open window is the only one shown on mobile; the rest stay
  // mounted (so a running emulator / terminal history survives) but hidden.
  const topId = useWindows((s) => {
    const open = s.windows.filter((w) => !w.minimized)
    return open.length ? open.reduce((a, b) => (b.z > a.z ? b : a)).id : null
  })
  const suppressed = win.minimized || (mobile && win.id !== topId)

  const x = useMotionValue(bounds.x)
  const y = useMotionValue(bounds.y)
  const width = useMotionValue(bounds.width)
  const height = useMotionValue(bounds.height)

  // Keep the transform / size in sync when they change from outside a drag or
  // resize (opening, maximizing, un-maximizing, applying a saved layout).
  useEffect(() => {
    x.set(bounds.x)
    y.set(bounds.y)
  }, [bounds.x, bounds.y, x, y])

  useEffect(() => {
    width.set(bounds.width)
    height.set(bounds.height)
  }, [bounds.width, bounds.height, width, height])

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
      drag={!win.maximized && !mobile}
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
      aria-hidden={suppressed || undefined}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={
        suppressed
          ? {
              opacity: 0,
              scale: win.minimized ? 0.9 : 1,
              transitionEnd: { visibility: 'hidden' },
            }
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
        pointerEvents: suppressed ? 'none' : undefined,
      }}
      className={`flex flex-col overflow-hidden bg-desk-panel ${
        mobile
          ? 'border-b border-desk-edge'
          : 'rounded-xl border border-desk-edge shadow-2xl shadow-black/40'
      }`}
    >
      <div
        onPointerDown={(e) => {
          if (!win.maximized && !mobile) dragControls.start(e)
        }}
        onDoubleClick={() => {
          if (!mobile) toggleMaximize(win.id, deskW, deskH)
        }}
        className={`flex shrink-0 select-none items-center gap-2 border-b border-desk-edge bg-desk-bg/50 px-3 ${
          mobile ? 'h-11' : 'h-8'
        }`}
        style={{ cursor: win.maximized || mobile ? 'default' : 'grab' }}
      >
        <div className={`group/tl flex items-center ${mobile ? 'gap-3' : 'gap-2'}`}>
          <TrafficLight
            color="red"
            symbol="✕"
            label="Close"
            big={mobile}
            onClick={() => close(win.id)}
          />
          <TrafficLight
            color="yellow"
            symbol="−"
            label="Minimize"
            big={mobile}
            onClick={() => minimize(win.id)}
          />
          {!mobile && (
            <TrafficLight
              color="green"
              symbol={win.maximized ? '−' : '+'}
              label={win.maximized ? 'Restore' : 'Maximize'}
              onClick={() => toggleMaximize(win.id, deskW, deskH)}
            />
          )}
        </div>

        <span className="ml-1 text-[13px] leading-none">{app.icon}</span>
        <span className="truncate text-[11px] font-medium text-desk-muted">
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
  red: 'bg-[#ff5f57]',
  yellow: 'bg-[#febc2e]',
  green: 'bg-[#28c840]',
}

function TrafficLight({
  color,
  symbol,
  label,
  onClick,
  big,
}: {
  color: 'red' | 'yellow' | 'green'
  symbol: string
  label: string
  onClick: () => void
  big?: boolean
}) {
  // On touch there is no hover, so the bigger targets show their glyph always.
  if (big) {
    return (
      <button
        aria-label={label}
        onClick={onClick}
        className={`grid h-7 w-7 place-items-center rounded-full leading-none text-black/60 transition active:brightness-90 ${TL_BG[color]}`}
      >
        <span className="text-[11px] font-bold">{symbol}</span>
      </button>
    )
  }
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`grid h-3 w-3 place-items-center rounded-full leading-none text-black/55 transition hover:brightness-110 active:brightness-90 ${TL_BG[color]}`}
    >
      <span className="text-[8px] font-bold opacity-0 transition-opacity group-hover/tl:opacity-100">
        {symbol}
      </span>
    </button>
  )
}
