import {
  certifications,
  experience,
  graphLabels,
  profile,
  projects,
  relations,
  skills,
} from '../data/content'
import type { AppId } from '../data/appMeta'

export type NodeType =
  | 'profile'
  | 'project'
  | 'skill'
  | 'experience'
  | 'certification'

export interface GraphNode {
  id: string
  label: string
  type: NodeType
  /** skill group (Data / AI / Software) for curated skills */
  group?: string
  /** a technology not in the curated skills list - hidden until a neighbour is focused */
  adHoc?: boolean
  description?: string
  /** desktop app the detail panel can open, plus the record slug to focus */
  appId?: AppId
  ref?: string
  degree: number
}

export interface GraphEdge {
  /** canonical `${a}::${b}` with a < b */
  id: string
  source: string
  target: string
  label?: string
}

export interface WorkspaceGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
  byId: Map<string, GraphNode>
  /** undirected adjacency */
  neighbors: Map<string, Set<string>>
  stats: { nodes: number; edges: number; categories: number }
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')

/** "azure-ai-search" -> "Azure Ai Search" (last-resort label). */
const deslug = (id: string) =>
  id
    .replace(/^[a-z]+:/, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

export function buildWorkspaceGraph(): WorkspaceGraph {
  const byId = new Map<string, GraphNode>()
  const add = (node: Omit<GraphNode, 'degree'>) => {
    const existing = byId.get(node.id)
    if (existing) {
      // first real definition wins; fill gaps only
      existing.label = existing.adHoc && !node.adHoc ? node.label : existing.label
      existing.type = node.type
      existing.group ??= node.group
      existing.description ??= node.description
      existing.appId ??= node.appId
      existing.ref ??= node.ref
      if (!node.adHoc) existing.adHoc = false
      return existing
    }
    const created: GraphNode = { ...node, degree: 0 }
    byId.set(node.id, created)
    return created
  }

  add({ id: 'profile', label: profile.name, type: 'profile' })

  for (const [group, items] of Object.entries(skills)) {
    for (const name of items) {
      add({ id: `skill:${slug(name)}`, label: name, type: 'skill', group })
    }
  }

  for (const p of projects) {
    add({
      id: `project:${p.slug}`,
      label: p.title,
      type: 'project',
      description: p.summary,
      appId: 'projects',
      ref: p.slug,
    })
  }

  for (const job of experience) {
    add({
      id: `exp:${slug(job.company)}`,
      label: job.company,
      type: 'experience',
      description: `${job.role} · ${job.period}`,
    })
  }

  for (const c of certifications) {
    add({
      id: `cert:${slug(c.name)}`,
      label: c.name,
      type: 'certification',
      description: `${c.issuer} · ${c.year}`,
    })
  }

  const edges = new Map<string, GraphEdge>()
  const addEdge = (a: string, b: string, label?: string) => {
    if (a === b || !byId.has(a) || !byId.has(b)) return
    const [source, target] = a < b ? [a, b] : [b, a]
    const id = `${source}::${target}`
    const existing = edges.get(id)
    if (existing) {
      if (!existing.label && label) existing.label = label
      return
    }
    edges.set(id, { id, source, target, label })
  }

  const ensureSkill = (id: string) => {
    if (byId.has(id)) return
    if (!id.startsWith('skill:')) return
    add({ id, label: graphLabels[id] ?? deslug(id), type: 'skill', adHoc: true })
  }

  // project.tech -> skill / tech nodes
  for (const p of projects) {
    for (const tech of p.tech) {
      const id = `skill:${slug(tech)}`
      if (!byId.has(id)) add({ id, label: tech, type: 'skill', adHoc: true })
      addEdge(`project:${p.slug}`, id, `uses ${tech}`)
    }
  }

  // explicit relationships
  for (const r of relations) {
    ensureSkill(r.from)
    ensureSkill(r.to)
    addEdge(r.from, r.to, r.label)
  }

  // degree + adjacency
  const neighbors = new Map<string, Set<string>>()
  for (const id of byId.keys()) neighbors.set(id, new Set())
  for (const e of edges.values()) {
    neighbors.get(e.source)!.add(e.target)
    neighbors.get(e.target)!.add(e.source)
  }
  for (const [id, set] of neighbors) byId.get(id)!.degree = set.size

  const nodes = [...byId.values()]
  // the four real categories - profile is the hub, not a category
  const categories = new Set(
    nodes.map((n) => n.type).filter((t) => t !== 'profile'),
  ).size

  return {
    nodes,
    edges: [...edges.values()],
    byId,
    neighbors,
    stats: { nodes: nodes.length, edges: edges.size, categories },
  }
}
