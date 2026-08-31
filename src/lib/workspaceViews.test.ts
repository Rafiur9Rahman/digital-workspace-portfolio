import { describe, expect, it } from 'vitest'
import { buildWorkspaceGraph } from './workspaceGraph'
import { computeViewSet, VIEW_ALIASES } from './workspaceViews'

const g = buildWorkspaceGraph()

describe('computeViewSet', () => {
  it('"all" keeps every node', () => {
    expect(computeViewSet('all', g).size).toBe(g.nodes.length)
  })

  it('"recruiter" keeps every project, role and certification plus the profile', () => {
    const set = computeViewSet('recruiter', g)
    expect(set.has('profile')).toBe(true)
    for (const n of g.nodes) {
      if (['project', 'experience', 'certification'].includes(n.type)) {
        expect(set.has(n.id), n.id).toBe(true)
      }
    }
  })

  it('"recruiter" drops orphan / ad-hoc tech leaves', () => {
    const set = computeViewSet('recruiter', g)
    for (const id of set) {
      const n = g.byId.get(id)!
      if (n.type === 'skill') {
        expect(n.adHoc ?? false).toBe(false)
        expect(g.neighbors.get(id)!.size).toBeGreaterThan(0)
      }
    }
  })

  it('"ai-data" keeps AI/Data skills and AI/Data projects, not pure software skills', () => {
    const set = computeViewSet('ai-data', g)
    expect(set.has('skill:azure-openai')).toBe(true)
    expect(set.has('skill:sql')).toBe(true) // Data group
    expect(set.has('project:semantic-document-search')).toBe(true)
    expect(set.has('skill:react')).toBe(false) // Software group, no AI/Data link
    expect(set.has('profile')).toBe(true)
  })

  it('every view set only references real nodes', () => {
    for (const view of ['all', 'recruiter', 'ai-data'] as const) {
      for (const id of computeViewSet(view, g)) {
        expect(g.byId.has(id), `${view}: ${id}`).toBe(true)
      }
    }
  })

  it('view aliases resolve to the three view ids', () => {
    expect(VIEW_ALIASES['recruiter']).toBe('recruiter')
    expect(VIEW_ALIASES['ai']).toBe('ai-data')
    expect(VIEW_ALIASES['data']).toBe('ai-data')
    expect(VIEW_ALIASES['everything']).toBe('all')
  })
})
