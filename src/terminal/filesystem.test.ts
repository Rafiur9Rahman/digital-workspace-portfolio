import { describe, expect, it } from 'vitest'
import { createFileSystem } from './filesystem'
import { projects, profile } from '../data/content'

const fs = createFileSystem()

describe('resolve', () => {
  it('joins a relative path onto the cwd', () => {
    expect(fs.resolve('/', 'projects')).toBe('/projects')
    expect(fs.resolve('/projects', 'analytics-pipeline')).toBe('/projects/analytics-pipeline')
  })

  it('handles absolute paths and ~', () => {
    expect(fs.resolve('/projects', '/skills')).toBe('/skills')
    expect(fs.resolve('/projects/x', '~')).toBe('/')
    expect(fs.resolve('/a/b', '~/skills')).toBe('/skills')
  })

  it('collapses . and ..', () => {
    expect(fs.resolve('/projects', '..')).toBe('/')
    expect(fs.resolve('/projects', './readme.txt')).toBe('/projects/readme.txt')
    expect(fs.resolve('/a/b/c', '../../x')).toBe('/a/x')
  })

  it('clamps .. at the root', () => {
    expect(fs.resolve('/', '..')).toBe('/')
    expect(fs.resolve('/x', '../../../..')).toBe('/')
  })
})

describe('tree', () => {
  it('exposes the portfolio structure', () => {
    const rootNames = fs.list('/')!.map((e) => e.name)
    expect(rootNames).toEqual(
      expect.arrayContaining([
        'about.txt',
        'contact.txt',
        'cv.pdf',
        'projects',
        'experience',
        'certifications',
        'skills',
        'games',
      ]),
    )
  })

  it('has a directory per project with readme/tech/outcomes', () => {
    for (const p of projects) {
      const files = fs.list(`/projects/${p.slug}`)!.map((e) => e.name)
      expect(files).toEqual(['outcomes.txt', 'readme.txt', 'tech.txt'])
    }
  })

  it('list returns null for a file or a missing path', () => {
    expect(fs.list('/about.txt')).toBeNull()
    expect(fs.list('/nope')).toBeNull()
  })
})

describe('read', () => {
  it('renders file contents lazily from the content layer', () => {
    expect(fs.read('/about.txt')!.text).toContain(profile.name)
    expect(fs.read(`/projects/${projects[0].slug}/readme.txt`)!.text).toContain(projects[0].title)
  })

  it('carries the app link for launchable files', () => {
    expect(fs.read('/contact.txt')!.app).toBe('contact')
    expect(fs.read('/cv.pdf')!.app).toBe('resume')
    expect(fs.read('/games/pokemon.gba')!.app).toBe('gba')
  })

  it('returns null for a directory or a missing file', () => {
    expect(fs.read('/projects')).toBeNull()
    expect(fs.read('/ghost.txt')).toBeNull()
  })
})
