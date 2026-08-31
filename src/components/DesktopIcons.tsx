import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import { useWindows } from '../store/windows'
import { useWorkspace } from '../store/workspace'
import type { AppId } from '../data/apps'

interface DeskIcon {
  id: string
  label: string
  glyph: string
  app: AppId
  big?: boolean
}

// Desktop stripped to a single icon for now. To bring an icon back, uncomment
// its entry here AND its matching position in DEFAULTS below.
const ICONS: DeskIcon[] = [
  { id: 'about', label: 'About the Author', glyph: '👤', app: 'about' },
  // { id: 'projects', label: 'Projects', glyph: '📁', app: 'projects' },
  // { id: 'resume', label: 'resume.pdf', glyph: '📄', app: 'resume' },
  { id: 'images', label: 'Images', glyph: '📁', app: 'images' },
  { id: 'gba', label: 'Game Boy Advance', glyph: '🎮', app: 'gba' },
  // { id: 'photo', label: 'profile.jpg', glyph: '🖼️', app: 'photo' },
  // { id: 'contact', label: 'contact.txt', glyph: '📝', app: 'contact' },
  // { id: 'assistant', label: 'AI Assistant', glyph: '✨', app: 'assistant' },
]

/* The default layout is a tidy column hugging the left edge. Positions are
   stored as fractions of the desktop (so they hold up on resize) but the
   defaults are derived from fixed pixel spacing. Users drag icons anywhere
   and the new spot is remembered. */
const COL_LEFT = 10 // px from the screen edge to the icon cell
const COL_TOP = 14 // px from the top of the icon area
const COL_STEP = 112 // px between icons in the column (cells are a fixed height)

const STORE_KEY = 'ws-icons-v2'
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

type PosMap = Record<string, { x: number; y: number }>

function defaultFrac(index: number, deskW: number, deskH: number) {
  return {
    x: COL_LEFT / Math.max(deskW, 1),
    y: (COL_TOP + index * COL_STEP) / Math.max(deskH, 1),
  }
}

function loadPositions(deskW: number, deskH: number): PosMap {
  const current: PosMap = {}
  ICONS.forEach((icon, i) => {
    current[icon.id] = defaultFrac(i, deskW, deskH)
  })

  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as PosMap
      let hadStale = false
      for (const [id, pos] of Object.entries(saved)) {
        if (id in current) current[id] = pos
        else hadStale = true // position for an icon that no longer exists
      }
      if (hadStale) localStorage.setItem(STORE_KEY, JSON.stringify(current))
    }
  } catch {
    /* ignore */
  }
  return current
}

export function DesktopIcons({ deskW, deskH }: { deskW: number; deskH: number }) {
  const openApp = useWindows((s) => s.openApp)
  const visit = useWorkspace((s) => s.visit)
  const [selected, setSelected] = useState<string | null>(null)
  const [positions, setPositions] = useState(() => loadPositions(deskW, deskH))

  // Keep the current size reachable without making it re-seed on every resize.
  const sizeRef = useRef({ deskW, deskH })
  useEffect(() => {
    sizeRef.current = { deskW, deskH }
  }, [deskW, deskH])

  // `forget me` in the terminal resets the visitor record - snap icons back
  // to the default column too.
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    setPositions(loadPositions(sizeRef.current.deskW, sizeRef.current.deskH))
    setSelected(null)
  }, [visit])

  const savePosition = useCallback((id: string, x: number, y: number) => {
    setPositions((prev) => {
      const next = { ...prev, [id]: { x, y } }
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  // Dragging around a scattered layout suits a real desktop, not a phone.
  if (deskW < 640) {
    return (
      <div className="absolute inset-0" onClick={() => setSelected(null)}>
        <div className="absolute left-2 top-3 flex flex-col gap-1">
          {ICONS.slice(0, 4).map((icon) => (
            <StaticIcon key={icon.id} icon={icon} onOpen={() => openApp(icon.app)} />
          ))}
        </div>
        <div className="absolute right-2 top-3 flex flex-col gap-1">
          {ICONS.slice(4).map((icon) => (
            <StaticIcon key={icon.id} icon={icon} onOpen={() => openApp(icon.app)} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0" onClick={() => setSelected(null)}>
      {ICONS.map((icon, i) => (
        <DraggableIcon
          key={icon.id}
          icon={icon}
          deskW={deskW}
          deskH={deskH}
          frac={positions[icon.id] ?? defaultFrac(i, deskW, deskH)}
          selected={selected === icon.id}
          onSelect={() => setSelected(icon.id)}
          onOpen={() => openApp(icon.app)}
          onMoved={savePosition}
        />
      ))}
    </div>
  )
}

// Base glyph bumped ~27%; `big` keeps its ~1.3x relative scaling on top.
function glyphClass(big?: boolean) {
  return big ? 'text-[43px]' : 'text-[33px]'
}

function StaticIcon({ icon, onOpen }: { icon: DeskIcon; onOpen: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      className="flex w-[96px] flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-center hover:bg-white/5"
    >
      <span className={`leading-none ${glyphClass(icon.big)}`}>{icon.glyph}</span>
      <span className="text-[14px] leading-tight text-desk-text [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]">
        {icon.label}
      </span>
    </button>
  )
}

function DraggableIcon({
  icon,
  deskW,
  deskH,
  frac,
  selected,
  onSelect,
  onOpen,
  onMoved,
}: {
  icon: DeskIcon
  deskW: number
  deskH: number
  frac: { x: number; y: number }
  selected: boolean
  onSelect: () => void
  onOpen: () => void
  onMoved: (id: string, x: number, y: number) => void
}) {
  const boxW = icon.big ? 116 : 92
  const boxH = icon.big ? 118 : 100
  const maxX = Math.max(0, deskW - boxW)
  const maxY = Math.max(0, deskH - boxH)

  const x = useMotionValue(clamp(frac.x * deskW, 0, maxX))
  const y = useMotionValue(clamp(frac.y * deskH, 0, maxY))
  const draggingRef = useRef(false)

  useEffect(() => {
    x.set(clamp(frac.x * deskW, 0, maxX))
    y.set(clamp(frac.y * deskH, 0, maxY))
  }, [frac.x, frac.y, deskW, deskH, maxX, maxY, x, y])

  return (
    <motion.button
      drag
      dragMomentum={false}
      dragConstraints={{ left: 0, top: 0, right: maxX, bottom: maxY }}
      onDragStart={() => {
        draggingRef.current = true
      }}
      onDragEnd={() => {
        onMoved(
          icon.id,
          clamp(x.get(), 0, maxX) / deskW,
          clamp(y.get(), 0, maxY) / deskH,
        )
        setTimeout(() => {
          draggingRef.current = false
        }, 0)
      }}
      onClick={(e) => {
        // Stop the desktop-background click that would clear the selection.
        e.stopPropagation()
        if (!draggingRef.current) onSelect()
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        if (!draggingRef.current) onOpen()
      }}
      style={{ x, y, position: 'absolute', left: 0, top: 0, width: boxW }}
      title={`${icon.label} - double-click to open`}
      className={`flex cursor-grab flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-center transition active:cursor-grabbing ${
        selected
          ? 'bg-desk-accent/20 ring-1 ring-desk-accent/40'
          : 'hover:bg-white/5'
      }`}
    >
      <span
        className={`leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${glyphClass(icon.big)}`}
      >
        {icon.glyph}
      </span>
      {/* Reserve two lines so every cell is the same height and the column
          reads as an even rhythm regardless of label length. */}
      <span className="flex min-h-[35px] items-start justify-center text-[14px] leading-tight text-desk-text [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]">
        {icon.label}
      </span>
    </motion.button>
  )
}
