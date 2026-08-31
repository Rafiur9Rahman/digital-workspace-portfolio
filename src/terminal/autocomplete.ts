import { visibleCommands } from './registry'
import { APP_IDS } from '../data/appMeta'
import type { FileSystem } from './filesystem'

export interface CompletionResult {
  /** replace the whole input with this (exact match, or a longer shared prefix) */
  replacement?: string
  /** every candidate - shown when there is more than one and no clear extension */
  matches: string[]
}

export interface CompleteContext {
  cwd: string
  fs: FileSystem
}

function commonPrefix(values: string[]): string {
  if (values.length === 0) return ''
  let prefix = values[0]
  for (const value of values) {
    while (!value.startsWith(prefix)) prefix = prefix.slice(0, -1)
  }
  return prefix
}

/* Turn a token + candidate list into a replacement for the whole input.
   `prefix` is everything before the token (e.g. "open " or "cd projects/"). */
function resolve(prefix: string, token: string, candidates: string[]): CompletionResult {
  const matches = candidates.filter((c) => c.startsWith(token)).sort()
  if (matches.length === 0) return { matches: [] }
  if (matches.length === 1) {
    // no trailing space after a directory - the user keeps navigating
    const trail = matches[0].endsWith('/') ? '' : ' '
    return { replacement: `${prefix}${matches[0]}${trail}`, matches }
  }
  const shared = commonPrefix(matches)
  return {
    replacement: shared.length > token.length ? `${prefix}${shared}` : undefined,
    matches,
  }
}

function completePath(
  ctx: CompleteContext,
  command: string,
  token: string,
  dirsOnly: boolean,
): CompletionResult {
  const slash = token.lastIndexOf('/')
  const dirPart = slash >= 0 ? token.slice(0, slash + 1) : ''
  const namePart = slash >= 0 ? token.slice(slash + 1) : token
  const entries = ctx.fs.list(ctx.fs.resolve(ctx.cwd, dirPart || '.'))
  if (!entries) return { matches: [] }
  const names = entries
    .filter((e) => !dirsOnly || e.type === 'dir')
    .map((e) => (e.type === 'dir' ? `${e.name}/` : e.name))
  return resolve(`${command} ${dirPart}`, namePart, names)
}

/* Completes command names first, then obvious arguments: `open <app>` and
   filesystem paths for cd / ls / cat. Hidden commands are never offered. */
export function complete(input: string, ctx?: CompleteContext): CompletionResult {
  const trailingSpace = /\s$/.test(input)
  const parts = input.trimStart().split(/\s+/)

  if (parts.length <= 1 && !trailingSpace) {
    return resolve('', parts[0] ?? '', visibleCommands().map((c) => c.name))
  }

  const command = parts[0].toLowerCase()
  const token = trailingSpace ? '' : (parts[parts.length - 1] ?? '')

  if (command === 'open') return resolve('open ', token, APP_IDS)
  if (ctx && (command === 'cd' || command === 'ls' || command === 'cat' || command === 'dir')) {
    return completePath(ctx, command, token, command === 'cd')
  }

  return { matches: [] }
}
