import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  buildWorkspaceGraph,
  type GraphEdge,
  type GraphNode,
  type NodeType,
} from '../lib/workspaceGraph'
import { forceLayout } from '../lib/graphLayout'

/* Workspace Map.
   Phase 1: static, pannable, zoomable relationship index.
   Phase 2: click a node to enter focus mode - it moves to the centre, its
   direct connections fan out on a ring, everything else dims. A breadcrumb
   records the path you walked; click any crumb to jump back. Esc or a click
   on empty canvas returns to the overview. */

const CANVAS_W = 960
const CANVAS_H = 640
const CX = CANVAS_W / 2
const CY = CANVAS_H / 2
const MIN_ZOOM = 0.4
const MAX_ZOOM = 2.5

const TYPE_ORDER: Record<NodeType, number> = {
  profile: 0,
  experience: 1,
  project: 2,
  skill: 3,
  certification: 4,
}

/** Overview visible set: everything except low-signal ad-hoc tech leaves. */
function isVisible(n: GraphNode): boolean {
  return !n.adHoc || n.degree >= 2
}

interface NodeBox {
  w: number
  h: number
  className: string
}

function boxFor(type: NodeType): NodeBox {
  switch (type) {
    case 'profile':
      return {
        w: 96,
        h: 96,
        className:
          'rounded-full border-2 bg-desk-panel text-[13px] font-semibold',
      }
    case 'project':
      return {
        w: 148,
        h: 54,
        className: 'rounded-md border bg-desk-panel text-[12px] font-medium',
      }
    case 'experience':
      return {
        w: 132,
        h: 52,
        className: 'rounded-md border-2 bg-desk-bg text-[12px] font-medium',
      }
    case 'certification':
      return {
        w: 132,
        h: 34,
        className:
          'rounded-lg border bg-desk-bg px-2 py-1 text-[10px] text-desk-muted',
      }
    case 'skill':
    default:
      return {
        w: 104,
        h: 40,
        className: 'rounded-full border bg-desk-panel text-[11px]',
      }
  }
}

export function WorkspaceMapApp() {
  const { g, forcePos, baseVisible, stats } = useMemo(() => {
    const g = buildWorkspaceGraph()
    const visible = g.nodes.filter(isVisible)
    const baseVisible = new Set(visible.map((n) => n.id))
    const visibleEdges = g.edges.filter(
      (e) => baseVisible.has(e.source) && baseVisible.has(e.target),
    )
    const forcePos = forceLayout(visible, visibleEdges, {
      width: CANVAS_W,
      height: CANVAS_H,
      seed: 20260831,
    })
    return {
      g,
      forcePos,
      baseVisible,
      stats: {
        nodes: visible.length,
        edges: visibleEdges.length,
        categories: new Set(
          visible.map((n) => n.type).filter((t) => t !== 'profile'),
        ).size,
      },
    }
  }, [])

  // The path of focused nodes; the last one is the current focus.
  const [trail, setTrail] = useState<string[]>([])
  const focusId = trail.length ? trail[trail.length - 1] : null

  const [zoom, setZoom] = useState(0.85)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null,
  )
  const movedRef = useRef(false)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  const nbrSet = useMemo(
    () => new Set(focusId ? [...(g.neighbors.get(focusId) ?? [])] : []),
    [g, focusId],
  )

  /** Focus mode: focused node centred, direct connections on a ring. */
  const layout = useMemo(() => {
    if (!focusId) return forcePos
    const m = new Map(forcePos)
    m.set(focusId, { x: CX, y: CY })
    const ring = [...nbrSet]
      .filter((id) => g.byId.has(id))
      .sort((a, b) => {
        const na = g.byId.get(a)!
        const nb = g.byId.get(b)!
        return (
          TYPE_ORDER[na.type] - TYPE_ORDER[nb.type] ||
          na.label.localeCompare(nb.label)
        )
      })
    const R = Math.max(210, 24 * ring.length)
    ring.forEach((id, i) => {
      const ang = -Math.PI / 2 + (i / ring.length) * Math.PI * 2
      m.set(id, { x: CX + Math.cos(ang) * R, y: CY + Math.sin(ang) * R })
    })
    return m
  }, [g, focusId, nbrSet, forcePos])

  const posOf = (id: string) => layout.get(id) ?? forcePos.get(id) ?? { x: CX, y: CY }

  const opacityOf = (id: string) => {
    if (!focusId) return baseVisible.has(id) ? 1 : 0
    if (id === focusId || nbrSet.has(id)) return 1
    return baseVisible.has(id) ? 0.12 : 0
  }

  const edgeOpacity = (e: GraphEdge) => {
    if (!focusId) {
      return baseVisible.has(e.source) && baseVisible.has(e.target) ? 0.9 : 0
    }
    if (e.source === focusId || e.target === focusId) return 0.95
    const a = nbrSet.has(e.source)
    const b = nbrSet.has(e.target)
    if (a && b) return 0.28
    if (baseVisible.has(e.source) && baseVisible.has(e.target)) return 0.05
    return 0
  }

  const focusNode = (id: string) => {
    setTrail((prev) => {
      const at = prev.indexOf(id)
      return at !== -1 ? prev.slice(0, at + 1) : [...prev, id]
    })
    setPan({ x: 0, y: 0 })
  }
  const exitFocus = () => setTrail([])

  // Fallback for Esc when the canvas itself does not hold DOM focus.
  useEffect(() => {
    if (!focusId) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTrail([])
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [focusId])

  const reset = () => {
    setZoom(0.85)
    setPan({ x: 0, y: 0 })
  }
  const zoomBy = (factor: number) =>
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor)))

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const rect = surfaceRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = e.clientX - rect.left - rect.width / 2
    const cy = e.clientY - rect.top - rect.height / 2
    const nz = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)),
    )
    setPan((p) => ({
      x: cx - (nz / zoom) * (cx - p.x),
      y: cy - (nz / zoom) * (cy - p.y),
    }))
    setZoom(nz)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    movedRef.current = false
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4) {
      movedRef.current = true
    }
    setPan({ x: d.panX + (e.clientX - d.x), y: d.panY + (e.clientY - d.y) })
  }
  const endDrag = () => {
    dragRef.current = null
  }
  const onSurfaceClick = (e: React.MouseEvent) => {
    if (movedRef.current) return
    if ((e.target as HTMLElement).closest('button')) return
    if (focusId) exitFocus()
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && focusId) {
      e.stopPropagation()
      exitFocus()
    }
  }

  const nodeTransition = reduce
    ? { duration: 0 }
    : {
        default: { type: 'spring' as const, stiffness: 220, damping: 28 },
        opacity: { duration: 0.22 },
      }
  const edgeTransition = reduce
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 190, damping: 30 }

  return (
    <div className="flex h-full flex-col bg-desk-bg text-desk-text">
      <header className="border-b border-desk-edge px-4 py-2.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-desk-text">
          Workspace Map
        </h2>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.15em] text-desk-muted">
          Relationship index // Projects • Skills • Experience • Certifications
        </p>
      </header>

      <div
        ref={surfaceRef}
        tabIndex={0}
        className="relative flex-1 cursor-grab overflow-hidden outline-none active:cursor-grabbing"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClick={onSurfaceClick}
        onDoubleClick={reset}
        onKeyDown={onKeyDown}
      >
        {trail.length > 0 && (
          <div
            className="absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1.5 text-[11px]"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={exitFocus}
              className="rounded border border-desk-edge bg-desk-panel/90 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-desk-muted hover:text-desk-text"
            >
              Overview
            </button>
            {trail.map((id, i) => (
              <Fragment key={id}>
                <span className="text-desk-muted">/</span>
                <button
                  type="button"
                  onClick={() => focusNode(id)}
                  className={
                    i === trail.length - 1
                      ? 'font-medium text-desk-accent'
                      : 'text-desk-muted hover:text-desk-text'
                  }
                >
                  {g.byId.get(id)?.label ?? id}
                </button>
              </Fragment>
            ))}
          </div>
        )}

        <div
          className="absolute left-1/2 top-1/2"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <svg
            className="pointer-events-none absolute overflow-visible"
            style={{ left: -CX, top: -CY }}
            width={CANVAS_W}
            height={CANVAS_H}
          >
            {g.edges.map((e) => {
              const op = edgeOpacity(e)
              if (op === 0) return null
              const a = posOf(e.source)
              const b = posOf(e.target)
              const incident =
                focusId != null && (e.source === focusId || e.target === focusId)
              return (
                <motion.line
                  key={e.id}
                  stroke="currentColor"
                  strokeWidth={incident ? 1.5 : 1}
                  className={incident ? 'text-desk-accent' : 'text-desk-edge'}
                  initial={false}
                  animate={{ x1: a.x, y1: a.y, x2: b.x, y2: b.y, opacity: op }}
                  transition={edgeTransition}
                />
              )
            })}
          </svg>

          {g.nodes.map((n) => {
            const box = boxFor(n.type)
            const p = posOf(n.id)
            const op = opacityOf(n.id)
            const interactive = op > 0.9
            const isFocus = n.id === focusId
            return (
              <motion.button
                key={n.id}
                type="button"
                aria-label={`${n.type}: ${n.label}`}
                disabled={!interactive}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  if (interactive) focusNode(n.id)
                }}
                className={`absolute flex items-center justify-center px-2 text-center leading-tight text-desk-text shadow-sm ${box.className} ${
                  isFocus
                    ? 'border-desk-accent ring-2 ring-desk-accent/50'
                    : 'border-desk-edge'
                } ${
                  interactive
                    ? 'cursor-pointer hover:border-desk-accent'
                    : 'cursor-default'
                }`}
                style={{
                  left: 0,
                  top: 0,
                  marginLeft: -box.w / 2,
                  marginTop: -box.h / 2,
                  width: box.w,
                  minHeight: box.h,
                  zIndex: isFocus ? 30 : interactive ? 20 : 10,
                }}
                initial={false}
                animate={{ x: p.x - CX, y: p.y - CY, opacity: op }}
                transition={nodeTransition}
              >
                {n.label}
              </motion.button>
            )
          })}
        </div>

        {!focusId && (
          <p className="pointer-events-none absolute bottom-2 left-3 text-[10px] lowercase tracking-wide text-desk-muted/70">
            click a node to focus
          </p>
        )}

        <div
          className="absolute bottom-2 right-2 flex items-center gap-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.2)}
            aria-label="Zoom out"
            className="h-6 w-6 rounded border border-desk-edge bg-desk-panel text-xs text-desk-muted hover:text-desk-text"
          >
            &minus;
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1.2)}
            aria-label="Zoom in"
            className="h-6 w-6 rounded border border-desk-edge bg-desk-panel text-xs text-desk-muted hover:text-desk-text"
          >
            +
          </button>
          <button
            type="button"
            onClick={reset}
            className="h-6 rounded border border-desk-edge bg-desk-panel px-2 text-[10px] uppercase tracking-widest text-desk-muted hover:text-desk-text"
          >
            Reset
          </button>
        </div>
      </div>

      <footer className="border-t border-desk-edge px-4 py-1.5 text-[10px] uppercase tracking-[0.15em] text-desk-muted">
        {focusId
          ? `${g.byId.get(focusId)?.label ?? focusId} • ${nbrSet.size} direct ${
              nbrSet.size === 1 ? 'connection' : 'connections'
            }`
          : `${stats.nodes} nodes • ${stats.edges} relationships • ${stats.categories} categories`}
      </footer>
    </div>
  )
}
