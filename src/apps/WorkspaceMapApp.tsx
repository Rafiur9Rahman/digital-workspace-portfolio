import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  buildWorkspaceGraph,
  type GraphEdge,
  type GraphNode,
  type NodeType,
  type WorkspaceGraph,
} from '../lib/workspaceGraph'
import { forceLayout } from '../lib/graphLayout'
import {
  computeViewSet,
  VIEW_ALIASES,
  VIEWS,
  type ViewId,
} from '../lib/workspaceViews'
import { certifications, experience, projects } from '../data/content'
import type { AppId } from '../data/appMeta'
import { useWindows } from '../store/windows'
import { useIsMobile } from '../lib/useIsMobile'

/* Workspace Map.
   Phase 1: static, pannable, zoomable relationship index.
   Phase 2: click a node to enter focus mode - it moves to the centre, its
   direct connections fan out on a ring, everything else dims. A breadcrumb
   records the path you walked; click any crumb to jump back.
   Phase 3: a side panel with the focused node's full record and connections.
   Phase 4: curated views, category filters and search across the top; the
   terminal `map <topic>` command drives all three. */

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

const TYPE_LABEL: Record<NodeType, string> = {
  profile: 'Profile',
  project: 'Project',
  skill: 'Skill',
  experience: 'Experience',
  certification: 'Certification',
}

const TYPE_PLURAL: Record<NodeType, string> = {
  profile: 'Profile',
  project: 'Projects',
  skill: 'Skills',
  experience: 'Experience',
  certification: 'Certifications',
}

const CONNECTION_ORDER: NodeType[] = [
  'project',
  'skill',
  'experience',
  'certification',
  'profile',
]

/** The categories the top filter bar toggles (profile is always on). */
const CATEGORY_FILTERS: NodeType[] = [
  'project',
  'skill',
  'experience',
  'certification',
]

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
  const { g, baseVisible } = useMemo(() => {
    const g = buildWorkspaceGraph()
    const baseVisible = new Set(g.nodes.filter(isVisible).map((n) => n.id))
    return { g, baseVisible }
  }, [])

  // The path of focused nodes; the last one is the current focus.
  const [trail, setTrail] = useState<string[]>([])
  const focusId = trail.length ? trail[trail.length - 1] : null

  const [view, setView] = useState<ViewId>('all')
  const [cats, setCats] = useState<Set<NodeType>>(
    () => new Set(CATEGORY_FILTERS),
  )

  const viewSet = useMemo(() => computeViewSet(view, g), [view, g])

  /** Overview visible set: base graph, narrowed by the view and the filters. */
  const activeVisible = useMemo(() => {
    const s = new Set<string>()
    for (const n of g.nodes) {
      if (!baseVisible.has(n.id) || !viewSet.has(n.id)) continue
      if (n.type !== 'profile' && !cats.has(n.type)) continue
      s.add(n.id)
    }
    return s
  }, [g, baseVisible, viewSet, cats])

  // Re-run the layout whenever the visible set changes; nodes glide to place.
  const overviewPos = useMemo(() => {
    const nodes = g.nodes.filter((n) => activeVisible.has(n.id))
    const edges = g.edges.filter(
      (e) => activeVisible.has(e.source) && activeVisible.has(e.target),
    )
    return forceLayout(nodes, edges, {
      width: CANVAS_W,
      height: CANVAS_H,
      seed: 20260831,
    })
  }, [g, activeVisible])

  const stats = useMemo(
    () => ({
      nodes: activeVisible.size,
      edges: g.edges.filter(
        (e) => activeVisible.has(e.source) && activeVisible.has(e.target),
      ).length,
      categories: new Set(
        [...activeVisible]
          .map((id) => g.byId.get(id)!.type)
          .filter((t) => t !== 'profile'),
      ).size,
    }),
    [g, activeVisible],
  )

  const allCatsOn = cats.size === CATEGORY_FILTERS.length

  const [zoom, setZoom] = useState(0.85)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null,
  )
  const movedRef = useRef(false)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const mobile = useIsMobile()
  const openAppWith = useWindows((s) => s.openAppWith)
  const focusRequest = useWindows((s) => s.focusRequest)
  const clearFocusRequest = useWindows((s) => s.clearFocusRequest)

  const nbrSet = useMemo(
    () => new Set(focusId ? [...(g.neighbors.get(focusId) ?? [])] : []),
    [g, focusId],
  )

  /** Focus mode: focused node centred, direct connections on a ring. */
  const layout = useMemo(() => {
    if (!focusId) return overviewPos
    const m = new Map(overviewPos)
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
  }, [g, focusId, nbrSet, overviewPos])

  const posOf = (id: string) =>
    layout.get(id) ?? overviewPos.get(id) ?? { x: CX, y: CY }

  const opacityOf = (id: string) => {
    if (!focusId) return activeVisible.has(id) ? 1 : 0
    if (id === focusId || nbrSet.has(id)) return 1
    return activeVisible.has(id) ? 0.12 : 0
  }

  const edgeOpacity = (e: GraphEdge) => {
    if (!focusId) {
      return activeVisible.has(e.source) && activeVisible.has(e.target) ? 0.9 : 0
    }
    if (e.source === focusId || e.target === focusId) return 0.95
    const a = nbrSet.has(e.source)
    const b = nbrSet.has(e.target)
    if (a && b) return 0.28
    if (activeVisible.has(e.source) && activeVisible.has(e.target)) return 0.05
    return 0
  }

  const focusNode = useCallback((id: string) => {
    setTrail((prev) => {
      const at = prev.indexOf(id)
      return at !== -1 ? prev.slice(0, at + 1) : [...prev, id]
    })
    setPan({ x: 0, y: 0 })
  }, [])
  const exitFocus = () => setTrail([])

  const toggleCat = (c: NodeType) =>
    setCats((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  const enableAllCats = () => setCats(new Set(CATEGORY_FILTERS))

  // Fallback for Esc when the canvas itself does not hold DOM focus.
  useEffect(() => {
    if (!focusId) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTrail([])
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [focusId])

  // `map <topic>` from the terminal: switch to a view, or focus a node.
  useEffect(() => {
    if (focusRequest?.appId !== 'map') return
    const raw = focusRequest.ref.trim().toLowerCase()
    clearFocusRequest()
    if (!raw) return
    if (VIEW_ALIASES[raw]) {
      setView(VIEW_ALIASES[raw])
      return
    }
    const hit =
      g.nodes.find((n) => n.label.toLowerCase() === raw) ??
      g.nodes.find((n) => n.label.toLowerCase().includes(raw)) ??
      g.nodes.find((n) => n.id.toLowerCase().includes(raw))
    if (hit) focusNode(hit.id)
  }, [focusRequest, clearFocusRequest, g, focusNode])

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
    // a dimmed / disabled node is not a real target - treat it as empty canvas
    const btn = (e.target as HTMLElement).closest('button')
    if (btn && !(btn as HTMLButtonElement).disabled) return
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
        className={`flex flex-wrap items-center border-b border-desk-edge px-4 py-2 ${
          mobile ? 'gap-x-1.5 gap-y-1.5' : 'gap-x-3 gap-y-2'
        }`}
      >
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[9px] uppercase tracking-[0.2em] text-desk-muted">
            View
          </span>
          {VIEWS.map((v) => (
            <ToolbarChip
              key={v.id}
              active={view === v.id}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </ToolbarChip>
          ))}
        </div>

        {!mobile && <span className="h-4 w-px bg-desk-edge" />}

        <div className="flex items-center gap-1">
          <ToolbarChip active={allCatsOn} onClick={enableAllCats}>
            All
          </ToolbarChip>
          {CATEGORY_FILTERS.map((c) => (
            <ToolbarChip
              key={c}
              active={cats.has(c)}
              onClick={() => toggleCat(c)}
            >
              {TYPE_PLURAL[c]}
            </ToolbarChip>
          ))}
        </div>

        <div className={mobile ? 'w-full' : 'ml-auto'}>
          <SearchBox
            nodes={g.nodes.filter((n) => !n.adHoc || n.degree >= 1)}
            onPick={focusNode}
            wide={mobile}
          />
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
      <div
        ref={surfaceRef}
        tabIndex={0}
        className="relative min-w-0 flex-1 cursor-grab overflow-hidden outline-none active:cursor-grabbing"
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

      {focusId && g.byId.has(focusId) && !mobile && (
        <aside className="w-64 shrink-0 overflow-hidden border-l border-desk-edge bg-desk-panel">
          <DetailPanel
            node={g.byId.get(focusId)!}
            neighborIds={[...nbrSet]}
            graph={g}
            onFocus={focusNode}
            onOpen={openAppWith}
            onClose={exitFocus}
          />
        </aside>
      )}

      <AnimatePresence>
        {focusId && g.byId.has(focusId) && mobile && (
          <motion.aside
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={
              reduce ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 34 }
            }
            className="absolute inset-x-0 bottom-0 z-40 flex h-[62%] flex-col overflow-hidden rounded-t-2xl border-t border-desk-edge bg-desk-panel shadow-2xl shadow-black/50"
          >
            <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-desk-edge" />
            <div className="min-h-0 flex-1">
              <DetailPanel
                node={g.byId.get(focusId)!}
                neighborIds={[...nbrSet]}
                graph={g}
                onFocus={focusNode}
                onOpen={openAppWith}
                onClose={exitFocus}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
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

function ToolbarChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-widest transition-colors ${
        active
          ? 'border-desk-accent/60 bg-desk-accent/15 text-desk-text'
          : 'border-desk-edge text-desk-muted hover:text-desk-text'
      }`}
    >
      {children}
    </button>
  )
}

function SearchBox({
  nodes,
  onPick,
  wide,
}: {
  nodes: GraphNode[]
  onPick: (id: string) => void
  wide?: boolean
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const query = q.trim().toLowerCase()
  const matches = query
    ? nodes
        .filter((n) => n.label.toLowerCase().includes(query))
        .sort((a, b) => {
          const ai = a.label.toLowerCase().startsWith(query) ? 0 : 1
          const bi = b.label.toLowerCase().startsWith(query) ? 0 : 1
          return ai - bi || a.label.localeCompare(b.label)
        })
        .slice(0, 8)
    : []

  const pick = (id: string) => {
    onPick(id)
    setQ('')
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matches[0]) pick(matches[0].id)
          else if (e.key === 'Escape') {
            setQ('')
            setOpen(false)
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        placeholder="Search the map"
        aria-label="Search the map"
        className={`rounded border border-desk-edge bg-desk-bg px-2 py-1 text-[11px] text-desk-text placeholder:text-desk-muted focus:border-desk-accent focus:outline-none ${
          wide ? 'w-full' : 'w-40'
        }`}
      />
      {open && matches.length > 0 && (
        <ul
          className={`absolute z-40 mt-1 overflow-hidden rounded border border-desk-edge bg-desk-panel shadow-lg ${
            wide ? 'inset-x-0' : 'right-0 w-56'
          }`}
        >
          {matches.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(n.id)}
                className="flex w-full items-center justify-between gap-2 px-2 py-1 text-left text-[11px] text-desk-text hover:bg-desk-edge/40"
              >
                <span className="truncate">{n.label}</span>
                <span className="shrink-0 text-[9px] uppercase tracking-widest text-desk-muted">
                  {n.type}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function groupConnections(ids: string[], graph: WorkspaceGraph) {
  return CONNECTION_ORDER.map(
    (type) =>
      [
        type,
        ids
          .filter((id) => graph.byId.get(id)?.type === type)
          .sort((a, b) =>
            (graph.byId.get(a)?.label ?? '').localeCompare(
              graph.byId.get(b)?.label ?? '',
            ),
          ),
      ] as const,
  ).filter(([, list]) => list.length > 0)
}

function DetailPanel({
  node,
  neighborIds,
  graph,
  onFocus,
  onOpen,
  onClose,
}: {
  node: GraphNode
  neighborIds: string[]
  graph: WorkspaceGraph
  onFocus: (id: string) => void
  onOpen: (appId: AppId, ref: string) => void
  onClose: () => void
}) {
  const project =
    node.type === 'project'
      ? projects.find((p) => p.slug === node.ref)
      : undefined
  const job =
    node.type === 'experience'
      ? experience.find((j) => j.company === node.ref)
      : undefined
  const cert =
    node.type === 'certification'
      ? certifications.find((c) => c.name === node.ref)
      : undefined

  const groups = groupConnections(neighborIds, graph)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-desk-edge px-4 py-3">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.2em] text-desk-muted">
            {TYPE_LABEL[node.type]}
            {node.group ? ` • ${node.group}` : ''}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-desk-text">
            {node.label}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail panel"
          className="shrink-0 rounded p-0.5 text-desk-muted hover:text-desk-text"
        >
          &times;
        </button>
      </div>

      <div className="desk-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 text-[12px]">
        {node.description && (
          <p className="leading-relaxed text-desk-text">{node.description}</p>
        )}

        {project && (
          <>
            <p className="text-[11px] text-desk-muted">
              {project.role} • {project.period} • difficulty{' '}
              {project.difficulty}/5
            </p>
            <PanelSection title="Tech">
              <div className="flex flex-wrap gap-1">
                {project.tech.map((t) => (
                  <span
                    key={t}
                    className="rounded border border-desk-edge bg-desk-bg/60 px-1.5 py-0.5 text-[10px]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </PanelSection>
            <PanelSection title="Outcomes">
              <ul className="list-inside list-disc space-y-1 text-desk-text">
                {project.outcomes.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </PanelSection>
            <button
              type="button"
              onClick={() => onOpen('projects', project.slug)}
              className="w-full rounded-md bg-desk-accent px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white hover:brightness-110"
            >
              Open project
            </button>
          </>
        )}

        {job && (
          <>
            <p className="text-[11px] text-desk-muted">
              {job.role} • {job.period}
            </p>
            <PanelSection title="Highlights">
              <ul className="list-inside list-disc space-y-1 text-desk-text">
                {job.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </PanelSection>
          </>
        )}

        {cert && (
          <>
            <p className="text-[11px] text-desk-muted">
              {cert.issuer} • {cert.year}
            </p>
            {cert.credentialUrl && (
              <a
                href={cert.credentialUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-desk-accent hover:underline"
              >
                View credential
              </a>
            )}
          </>
        )}

        {groups.map(([type, ids]) => (
          <PanelSection key={type} title={`${TYPE_PLURAL[type]} (${ids.length})`}>
            <div className="flex flex-col gap-0.5">
              {ids.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onFocus(id)}
                  className="truncate rounded px-1.5 py-1 text-left text-[11px] text-desk-muted hover:bg-desk-edge/40 hover:text-desk-text"
                >
                  {graph.byId.get(id)?.label ?? id}
                </button>
              ))}
            </div>
          </PanelSection>
        ))}
      </div>
    </div>
  )
}

function PanelSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h4 className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-desk-muted">
        {title}
      </h4>
      {children}
    </div>
  )
}
