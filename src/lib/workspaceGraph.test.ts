import { describe, expect, it } from 'vitest'
import { buildWorkspaceGraph, slug } from './workspaceGraph'
import { certifications, experience, projects } from '../data/content'

describe('slug', () => {
  it('normalises to lowercase kebab', () => {
    expect(slug('Azure OpenAI')).toBe('azure-openai')
    expect(slug('Embeddings / RAG')).toBe('embeddings-rag')
    expect(slug('  Power BI  ')).toBe('power-bi')
  })
})

describe('buildWorkspaceGraph', () => {
  const g = buildWorkspaceGraph()

  it('builds without throwing and has a profile node at the centre', () => {
    expect(g.byId.has('profile')).toBe(true)
    expect(g.byId.get('profile')!.type).toBe('profile')
  })

  it('has one node per project, experience and certification', () => {
    for (const p of projects) expect(g.byId.has(`project:${p.slug}`)).toBe(true)
    for (const e of experience) expect(g.byId.has(`exp:${slug(e.company)}`)).toBe(true)
    for (const c of certifications) expect(g.byId.has(`cert:${slug(c.name)}`)).toBe(true)
  })

  it('carries a ref back to the source record for each typed node', () => {
    expect(g.byId.get(`project:${projects[0].slug}`)!.ref).toBe(projects[0].slug)
    expect(g.byId.get(`exp:${slug(experience[0].company)}`)!.ref).toBe(
      experience[0].company,
    )
    expect(g.byId.get(`cert:${slug(certifications[0].name)}`)!.ref).toBe(
      certifications[0].name,
    )
  })

  it('auto-links a project to the skills in its tech list', () => {
    const edge = g.edges.find(
      (e) =>
        (e.source === 'project:semantic-document-search' &&
          e.target === 'skill:python') ||
        (e.target === 'project:semantic-document-search' &&
          e.source === 'skill:python'),
    )
    expect(edge).toBeTruthy()
  })

  it('creates an ad-hoc node for a tech that is not a curated skill', () => {
    const pgvector = g.byId.get('skill:pgvector')
    expect(pgvector).toBeTruthy()
    expect(pgvector!.adHoc).toBe(true)
  })

  it('applies explicit relations and their labels', () => {
    expect(g.byId.has('skill:azure')).toBe(true)
    const azureEdge = g.edges.find((e) => e.id === 'skill:azure::skill:azure-openai')
    expect(azureEdge?.label).toBe('Azure service')
  })

  it('never references a node that does not exist', () => {
    for (const e of g.edges) {
      expect(g.byId.has(e.source), e.id).toBe(true)
      expect(g.byId.has(e.target), e.id).toBe(true)
    }
  })

  it('computes degree from a symmetric adjacency map', () => {
    for (const [id, set] of g.neighbors) {
      expect(g.byId.get(id)!.degree).toBe(set.size)
      for (const other of set) {
        expect(g.neighbors.get(other)!.has(id), `${id} <-> ${other}`).toBe(true)
      }
    }
  })

  it('reports stats matching the built graph', () => {
    expect(g.stats.nodes).toBe(g.nodes.length)
    expect(g.stats.edges).toBe(g.edges.length)
    expect(g.stats.categories).toBe(
      new Set(g.nodes.map((n) => n.type).filter((t) => t !== 'profile')).size,
    )
  })
})
