import type { GraphEdge, GraphNode } from './workspaceGraph'

export interface Vec {
  x: number
  y: number
}
export type Positions = Map<string, Vec>

export interface LayoutOptions {
  width: number
  height: number
  seed?: number
  iterations?: number
}

/* Deterministic, seeded force-directed layout. Runs to a settled state and
   returns fixed positions - it never keeps ticking. O(n^2) repulsion, which is
   fine for the few dozen nodes the Workspace Map shows. */

function mulberry32(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Skills sit toward the middle; everything else drifts outward. */
function gravityFor(type: GraphNode['type']): number {
  if (type === 'profile') return 1.8
  if (type === 'skill') return 1.3
  return 0.55
}

/** Rough on-screen half-width, so wide cards keep more clearance. */
function radiusFor(type: GraphNode['type']): number {
  if (type === 'profile') return 56
  if (type === 'project') return 88
  if (type === 'experience') return 78
  if (type === 'certification') return 62
  return 58
}

export function forceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  { width, height, seed = 1, iterations = 420 }: LayoutOptions,
): Positions {
  const cx = width / 2
  const cy = height / 2
  const rnd = mulberry32(seed)

  const pos: Positions = new Map()
  const vel = new Map<string, Vec>()
  nodes.forEach((n, i) => {
    const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2 + rnd() * 0.6
    const radius = 60 + rnd() * Math.min(width, height) * 0.28
    pos.set(n.id, { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius })
    vel.set(n.id, { x: 0, y: 0 })
  })

  if (nodes.length <= 1) return pos

  const K_REPULSION = 13000
  const K_SPRING = 0.028
  const REST = 118
  const K_GRAVITY = 0.008
  const DAMPING = 0.84
  const pad = 48
  const radius = nodes.map((n) => radiusFor(n.type))

  let alpha = 1
  for (let step = 0; step < iterations; step++) {
    // repulsion (every pair)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = pos.get(nodes[i].id)!
        const b = pos.get(nodes[j].id)!
        let dx = a.x - b.x
        let dy = a.y - b.y
        let d2 = dx * dx + dy * dy
        if (d2 < 1) {
          dx = rnd() - 0.5
          dy = rnd() - 0.5
          d2 = 1
        }
        const d = Math.sqrt(d2)
        let f = K_REPULSION / d2
        // hard shove apart if the cards would visually overlap
        const minGap = radius[i] + radius[j]
        if (d < minGap) f += 0.22 * (minGap - d)
        const fx = (dx / d) * f
        const fy = (dy / d) * f
        const va = vel.get(nodes[i].id)!
        const vb = vel.get(nodes[j].id)!
        va.x += fx
        va.y += fy
        vb.x -= fx
        vb.y -= fy
      }
    }

    // springs (edges)
    for (const e of edges) {
      const a = pos.get(e.source)
      const b = pos.get(e.target)
      if (!a || !b) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.hypot(dx, dy) || 1
      const f = K_SPRING * (d - REST)
      const fx = (dx / d) * f
      const fy = (dy / d) * f
      vel.get(e.source)!.x += fx
      vel.get(e.source)!.y += fy
      vel.get(e.target)!.x -= fx
      vel.get(e.target)!.y -= fy
    }

    // gravity toward centre, per type
    for (const n of nodes) {
      const p = pos.get(n.id)!
      const v = vel.get(n.id)!
      const g = K_GRAVITY * gravityFor(n.type)
      v.x += (cx - p.x) * g
      v.y += (cy - p.y) * g
    }

    // integrate + cool
    for (const n of nodes) {
      const p = pos.get(n.id)!
      const v = vel.get(n.id)!
      v.x *= DAMPING
      v.y *= DAMPING
      p.x += v.x * alpha
      p.y += v.y * alpha
      p.x = Math.max(pad, Math.min(width - pad, p.x))
      p.y = Math.max(pad, Math.min(height - pad, p.y))
    }
    alpha *= 0.994
  }

  // recentre the settled cloud in the canvas
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of pos.values()) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  const offX = cx - (minX + maxX) / 2
  const offY = cy - (minY + maxY) / 2
  for (const p of pos.values()) {
    p.x += offX
    p.y += offY
  }

  return pos
}
