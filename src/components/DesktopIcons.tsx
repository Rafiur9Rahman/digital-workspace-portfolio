import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import { useWindows } from '../store/windows'
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
  { id: 'images', label: 'Images', glyph: '📁', app: 'images', big: true },
  { id: 'gba', label: 'Game Boy Advance', glyph: '🎮', app: 'gba' },
  // { id: 'photo', label: 'profile.jpg', glyph: '🖼️', app: 'photo' },
  // { id: 'contact', label: 'contact.txt', glyph: '📝', app: 'contact' },
  // { id: 'assistant', label: 'AI Assistant', glyph: '✨', app: 'assistant' },
]

/* Default spots, as fractions of the desktop - scattered, clear of the centred
   nameplate and the dock. Users drag from here and positions are remembered.
   Keep one entry per icon in ICONS. */
const DEFAULTS: Record<string, { x: number; y: number }> = {
  about: { x: 0.06, y: 0.1 },
  // projects: { x: 0.05, y: 0.09 },
  // resume: { x: 0.04, y: 0.52 },
  images: { x: 0.13, y: 0.72 },
  gba: { x: 0.85, y: 0.14 },
  // photo: { x: 0.87, y: 0.1 },
  // contact: { x: 0.8, y: 0.32 },
  // assistant: { x: 0.89, y: 0.56 },
}

const STORE_KEY = 'ws-icons-v1'
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

type PosMap = Record<string, { x: number; y: number }>

function loadPositions(): PosMap {
  // Seed defaults for the icons that currently exist.
  const current: PosMap = {}
  for (const icon of ICONS) current[icon.id] = DEFAULTS[icon.id]

  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as PosMap
      let hadStale = false
      for (const [id, pos] of Object.entries(saved)) {
        if (id in current) current[id] = pos
        else hadStale = true // position for an icon that no longer exists
      }
      // Rewrite storage without the stale entries.
      if (hadStale) localStorage.setItem(STORE_KEY, JSON.stringify(current))
    }
  } catch {
    /* ignore */
  }
  return current
}

export function DesktopIcons({ deskW, deskH }: { deskW: number; deskH: number }) {
  const openApp = useWindows((s) => s.openApp)
  const [selected, setSelected] = useState<string | null>(null)
  const [positions, setPositions] = useState(loadPositions)

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
      {ICONS.map((icon) => (
        <DraggableIcon
          key={icon.id}
          icon={icon}
          deskW={deskW}
          deskH={deskH}
          frac={positions[icon.id] ?? DEFAULTS[icon.id]}
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
  const boxW = icon.big ? 116 : 96
  const boxH = icon.big ? 118 : 104
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
      <span className="text-[14px] leading-tight text-desk-text [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]">
        {icon.label}
      </span>
    </motion.button>
  )
}
