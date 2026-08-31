import { describe, expect, it } from 'vitest'
import { forceLayout } from './graphLayout'
import type { GraphEdge, GraphNode } from './workspaceGraph'

const node = (id: string, type: GraphNode['type'] = 'skill'): GraphNode => ({
  id,
  label: id,
  type,
  degree: 0,
})

const edge = (source: string, target: string): GraphEdge => ({
  id: `${source}::${target}`,
  source,
  target,
})

const BOX = { width: 800, height: 600 }

describe('forceLayout', () => {
  it('is deterministic for the same seed', () => {
    const nodes = ['a', 'b', 'c', 'd'].map((id) => node(id))
    const edges = [edge('a', 'b'), edge('b', 'c'), edge('c', 'd')]
    const one = forceLayout(nodes, edges, { ...BOX, seed: 7 })
    const two = forceLayout(nodes, edges, { ...BOX, seed: 7 })
    for (const id of ['a', 'b', 'c', 'd']) {
      expect(one.get(id)).toEqual(two.get(id))
    }
  })

  it('differs for different seeds', () => {
    const nodes = ['a', 'b', 'c'].map((id) => node(id))
    const edges = [edge('a', 'b')]
    const one = forceLayout(nodes, edges, { ...BOX, seed: 1 })
    const two = forceLayout(nodes, edges, { ...BOX, seed: 2 })
    expect(one.get('a')).not.toEqual(two.get('a'))
  })

  it('keeps every node inside the canvas bounds', () => {
    const nodes = Array.from({ length: 20 }, (_, i) => node(`n${i}`))
    const edges = nodes.slice(1).map((n, i) => edge(nodes[i].id, n.id))
    const pos = forceLayout(nodes, edges, { ...BOX })
    for (const p of pos.values()) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(BOX.width)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(BOX.height)
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
    }
  })

  it('pulls connected nodes closer than unconnected ones on average', () => {
    const nodes = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => node(id))
    const edges = [edge('a', 'b'), edge('c', 'd'), edge('e', 'f')]
    const pos = forceLayout(nodes, edges, { ...BOX, seed: 3 })
    const dist = (p: string, q: string) =>
      Math.hypot(pos.get(p)!.x - pos.get(q)!.x, pos.get(p)!.y - pos.get(q)!.y)
    const connected = (dist('a', 'b') + dist('c', 'd') + dist('e', 'f')) / 3
    const unconnected = (dist('a', 'c') + dist('a', 'd') + dist('b', 'e')) / 3
    expect(connected).toBeLessThan(unconnected)
  })

  it('handles a single node and an empty edge list without NaN', () => {
    const solo = forceLayout([node('only')], [], { ...BOX })
    expect(Number.isFinite(solo.get('only')!.x)).toBe(true)
    const none = forceLayout(['a', 'b'].map((id) => node(id)), [], { ...BOX })
    for (const p of none.values()) {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
    }
  })
})
