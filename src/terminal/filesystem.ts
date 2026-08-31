import {
  certifications,
  experience,
  links,
  profile,
  projects,
  skills,
} from '../data/content'
import type { AppId } from '../data/appMeta'

/* A tiny read-only filesystem that mirrors the portfolio. It never touches the
   real disk. File contents are rendered lazily from the content layer, so this
   tree stays in sync with content.ts automatically. */

export interface FsFile {
  type: 'file'
  content: string | (() => string)
  /** launching this file opens the given desktop app */
  app?: AppId
}
export interface FsDir {
  type: 'dir'
  children: Record<string, FsNode>
}
export type FsNode = FsFile | FsDir

export interface FsEntry {
  name: string
  type: 'file' | 'dir'
}

export interface FileSystem {
  /** normalise a path (relative to cwd, or absolute / ~) — always returns an
      absolute path; `..` past the root just clamps */
  resolve: (cwd: string, path: string) => string
  node: (absPath: string) => FsNode | null
  list: (absPath: string) => FsEntry[] | null
  read: (absPath: string) => { text: string; app?: AppId } | null
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const file = (content: string | (() => string), app?: AppId): FsFile => ({
  type: 'file',
  content,
  app,
})
const dir = (children: Record<string, FsNode>): FsDir => ({ type: 'dir', children })

function buildRoot(): FsDir {
  const projectDirs: Record<string, FsNode> = {}
  for (const p of projects) {
    projectDirs[p.slug] = dir({
      'readme.txt': file(() =>
        [
          p.title,
          '',
          p.summary,
          '',
          `Role:       ${p.role}`,
          `Period:     ${p.period}`,
          `Difficulty: ${p.difficulty}/5`,
        ].join('\n'),
      ),
      'tech.txt': file(() => p.tech.join('\n')),
      'outcomes.txt': file(() => p.outcomes.map((o) => `- ${o}`).join('\n')),
    })
  }

  const experienceFiles: Record<string, FsNode> = {}
  for (const job of experience) {
    experienceFiles[`${slug(job.company)}.txt`] = file(() =>
      [
        `${job.role} — ${job.company}`,
        `${job.period}${job.location ? ` · ${job.location}` : ''}`,
        '',
        ...job.highlights.map((h) => `- ${h}`),
      ].join('\n'),
    )
  }

  const certFiles: Record<string, FsNode> = {}
  for (const c of certifications) {
    certFiles[`${slug(c.name)}.txt`] = file(() =>
      [
        c.name,
        `${c.issuer} · ${c.year}`,
        ...(c.credentialUrl ? ['', c.credentialUrl] : []),
      ].join('\n'),
    )
  }

  const skillFiles: Record<string, FsNode> = {}
  for (const [group, items] of Object.entries(skills)) {
    skillFiles[`${slug(group)}.txt`] = file(() => items.join('\n'))
  }

  return dir({
    'about.txt': file(() =>
      [profile.name + ' — ' + profile.title, '', profile.tagline, '', profile.location, profile.email].join('\n'),
    ),
    'contact.txt': file(
      () =>
        [
          `Email:    ${profile.email}`,
          `Location: ${profile.location}`,
          ...(links.github ? [`GitHub:   ${links.github}`] : []),
          ...(links.linkedin ? [`LinkedIn: ${links.linkedin}`] : []),
        ].join('\n'),
      'contact',
    ),
    'cv.pdf': file(
      () => `${profile.name} — ${profile.title}\n\n(binary document)`,
      'resume',
    ),
    projects: dir(projectDirs),
    experience: dir(experienceFiles),
    certifications: dir(certFiles),
    skills: dir(skillFiles),
    games: dir({
      'pokemon.gba': file(() => 'Pokémon — Emerald Version (USA, Europe)', 'gba'),
    }),
  })
}

function resolve(cwd: string, input: string): string {
  const raw = input.trim()
  const fromRoot = raw === '~' || raw.startsWith('~/') || raw.startsWith('/')
  const rest = raw === '~' ? '' : raw.startsWith('~/') ? raw.slice(2) : raw
  const segments = [
    ...(fromRoot ? [] : cwd.split('/')),
    ...rest.split('/'),
  ].filter((s) => s.length > 0)

  const stack: string[] = []
  for (const seg of segments) {
    if (seg === '.') continue
    if (seg === '..') stack.pop()
    else stack.push(seg)
  }
  return '/' + stack.join('/')
}

function nodeAt(root: FsDir, absPath: string): FsNode | null {
  let node: FsNode = root
  for (const seg of absPath.split('/').filter(Boolean)) {
    if (node.type !== 'dir') return null
    const next: FsNode | undefined = node.children[seg]
    if (!next) return null
    node = next
  }
  return node
}

export function createFileSystem(): FileSystem {
  const root = buildRoot()
  return fsApi(root)
}

/** The shared read-only portfolio filesystem — one instance for the whole app. */
export const portfolioFs: FileSystem = createFileSystem()

function fsApi(root: FsDir): FileSystem {
  return {
    resolve,
    node: (absPath) => nodeAt(root, absPath),
    list: (absPath) => {
      const node = nodeAt(root, absPath)
      if (!node || node.type !== 'dir') return null
      return Object.keys(node.children)
        .sort()
        .map((name) => ({ name, type: node.children[name].type }))
    },
    read: (absPath) => {
      const node = nodeAt(root, absPath)
      if (!node || node.type !== 'file') return null
      return {
        text: typeof node.content === 'function' ? node.content() : node.content,
        app: node.app,
      }
    },
  }
}
