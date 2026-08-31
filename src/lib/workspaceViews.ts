import { projects } from '../data/content'
import type { WorkspaceGraph } from './workspaceGraph'

/* Curated views over the Workspace Map. A view narrows the graph to the nodes
   that tell one story; the category filters and focus mode then compose on top. */

export type ViewId = 'all' | 'recruiter' | 'ai-data'

export const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'recruiter', label: 'Recruiter' },
  { id: 'ai-data', label: 'AI & Data' },
]

/** Words the terminal `map <topic>` command accepts for a view. */
export const VIEW_ALIASES: Record<string, ViewId> = {
  all: 'all',
  everything: 'all',
  overview: 'all',
  recruiter: 'recruiter',
  hire: 'recruiter',
  hiring: 'recruiter',
  cv: 'recruiter',
  ai: 'ai-data',
  data: 'ai-data',
  'ai-data': 'ai-data',
  'ai & data': 'ai-data',
  'ai&data': 'ai-data',
}

const isAiData = (c: string) => c === 'AI' || c === 'Data'

/** The set of node ids a view keeps. */
export function computeViewSet(view: ViewId, g: WorkspaceGraph): Set<string> {
  if (view === 'all') return new Set(g.byId.keys())

  const inSet = new Set<string>()
  if (g.byId.has('profile')) inSet.add('profile')

  if (view === 'recruiter') {
    // the career story: roles, shipped work, credentials, and applied skills
    for (const n of g.nodes) {
      if (
        n.type === 'project' ||
        n.type === 'experience' ||
        n.type === 'certification'
      ) {
        inSet.add(n.id)
      } else if (
        n.type === 'skill' &&
        !n.adHoc &&
        (g.neighbors.get(n.id)?.size ?? 0) > 0
      ) {
        inSet.add(n.id)
      }
    }
    return inSet
  }

  // ai-data: the AI / Data competency and what connects to it
  for (const n of g.nodes) {
    if (n.type === 'skill' && (n.group === 'AI' || n.group === 'Data')) {
      inSet.add(n.id)
    } else if (n.type === 'project') {
      const p = projects.find((x) => x.slug === n.ref)
      if (p?.categories.some(isAiData)) inSet.add(n.id)
    }
  }
  for (const n of g.nodes) {
    if (inSet.has(n.id)) continue
    const linkable =
      n.type === 'experience' ||
      n.type === 'certification' ||
      (n.type === 'skill' && n.adHoc)
    if (!linkable) continue
    for (const nb of g.neighbors.get(n.id) ?? []) {
      if (inSet.has(nb)) {
        inSet.add(n.id)
        break
      }
    }
  }
  return inSet
}
