import { useMemo, useRef, useState } from 'react'
import { buildWorkspaceGraph, type GraphNode } from '../lib/workspaceGraph'
import { forceLayout } from '../lib/graphLayout'

/* Workspace Map - Phase 1: a static, pannable, zoomable relationship index.
   Nodes and edges come straight from src/data/content.ts via buildWorkspaceGraph.
   No selection, hover, or detail panel yet - that lands in a later phase. */

const CANVAS_W = 960
const CANVAS_H = 640
const MIN_ZOOM = 0.4
const MAX_ZOOM = 2.5

/** Phase 1 visible set: everything except low-signal ad-hoc tech leaves. */
function isVisible(n: GraphNode): boolean {
  return !n.adHoc || n.degree >= 2
}

interface NodeBox {
  w: number
  h: number
  className: string
}

function boxFor(type: GraphNode['type']): NodeBox {
  switch (type) {
    case 'profile':
      return {
        w: 96,
        h: 96,
        className:
          'rounded-full border-2 border-desk-edge bg-desk-panel text-[13px] font-semibold',
      }
    case 'project':
      return {
        w: 148,
        h: 54,
        className:
          'rounded-md border border-desk-edge bg-desk-panel text-[12px] font-medium',
      }
    case 'experience':
      return {
        w: 132,
        h: 52,
        className:
          'rounded-md border-2 border-desk-edge bg-desk-bg text-[12px] font-medium',
      }
    case 'certification':
      return {
        w: 132,
        h: 34,
        className:
          'rounded-lg border border-desk-edge bg-desk-bg px-2 py-1 text-[10px] text-desk-muted',
      }
    case 'skill':
    default:
      return {
        w: 104,
        h: 40,
        className:
          'rounded-full border border-desk-edge bg-desk-panel text-[11px]',
      }
  }
}

export function WorkspaceMapApp() {
  const { nodes, edges, positions, stats } = useMemo(() => {
    const g = buildWorkspaceGraph()
    const visible = g.nodes.filter(isVisible)
    const visibleIds = new Set(visible.map((n) => n.id))
    const visibleEdges = g.edges.filter(
      (e) => visibleIds.has(e.source) && visibleIds.has(e.target),
    )
    const positions = forceLayout(visible, visibleEdges, {
      width: CANVAS_W,
      height: CANVAS_H,
      seed: 20260831,
    })
    return {
      nodes: visible,
      edges: visibleEdges,
      positions,
      stats: {
        nodes: visible.length,
        edges: visibleEdges.length,
        categories: new Set(
          visible.map((n) => n.type).filter((t) => t !== 'profile'),
        ).size,
      },
    }
  }, [])

  const [zoom, setZoom] = useState(0.85)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null,
  )
  const surfaceRef = useRef<HTMLDivElement>(null)

  const reset = () => {
    setZoom(0.85)
    setPan({ x: 0, y: 0 })
  }

  const zoomBy = (factor: number) => {
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor)))
  }

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
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    setPan({ x: d.panX + (e.clientX - d.x), y: d.panY + (e.clientY - d.y) })
  }

  const endDrag = () => {
    dragRef.current = null
  }

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
        className="relative flex-1 cursor-grab overflow-hidden active:cursor-grabbing"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onDoubleClick={reset}
      >
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <svg
            className="pointer-events-none absolute overflow-visible"
            style={{ left: -CANVAS_W / 2, top: -CANVAS_H / 2 }}
            width={CANVAS_W}
            height={CANVAS_H}
          >
            {edges.map((e) => {
              const a = positions.get(e.source)
              const b = positions.get(e.target)
              if (!a || !b) return null
              return (
                <line
                  key={e.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="currentColor"
                  strokeWidth={1}
                  className="text-desk-edge"
                />
              )
            })}
          </svg>

          {nodes.map((n) => {
            const p = positions.get(n.id)
            if (!p) return null
            const box = boxFor(n.type)
            return (
              <button
                key={n.id}
                type="button"
                aria-label={`${n.type}: ${n.label}`}
                className={`absolute flex items-center justify-center px-2 text-center leading-tight text-desk-text shadow-sm transition-colors hover:border-desk-accent ${box.className}`}
                style={{
                  left: p.x - CANVAS_W / 2,
                  top: p.y - CANVAS_H / 2,
                  width: box.w,
                  minHeight: box.h,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {n.label}
              </button>
            )
          })}
        </div>

        <div className="absolute bottom-2 right-2 flex items-center gap-1">
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
        {stats.nodes} nodes • {stats.edges} relationships • {stats.categories} categories
      </footer>
    </div>
  )
}
