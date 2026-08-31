import type { CommandContext, CommandResult, OutputLine } from './types'
import { getCommand, visibleCommands } from './registry'
import { noteHiddenDiscovery } from './achievements'

export interface ParsedLine {
  name: string
  args: string[]
}

/* Deliberately minimal: whitespace split, with single/double quoted groups kept
   together. Not a real shell parser — no pipes, redirects, or variable
   expansion. */
export function parseLine(raw: string): ParsedLine | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const tokens = trimmed.match(/"[^"]*"|'[^']*'|\S+/g) ?? []
  const cleaned = tokens.map((t) => t.replace(/^["']|["']$/g, ''))
  const [name, ...args] = cleaned
  return { name: name.toLowerCase(), args }
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  const row = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[n]
}

export function didYouMean(input: string, names: string[], max = 2): string[] {
  return names
    .map((name) => ({ name, dist: levenshtein(input, name) }))
    .filter((c) => c.dist <= max)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3)
    .map((c) => c.name)
}

type BaseContext = Omit<CommandContext, 'args' | 'raw'>

export async function runLine(raw: string, base: BaseContext): Promise<CommandResult> {
  const parsed = parseLine(raw)
  if (!parsed) return
  const command = getCommand(parsed.name)
  if (!command) {
    const near = didYouMean(
      parsed.name,
      visibleCommands().map((c) => c.name),
    )
    const lines: OutputLine[] = [{ kind: 'error', text: `Command '${parsed.name}' not found.` }]
    lines.push(
      near.length
        ? { kind: 'muted', text: `Did you mean: ${near.join(', ')}?` }
        : { kind: 'muted', text: "Type 'help' for a list of commands." },
    )
    return { lines }
  }
  // Track discovered easter eggs (feeds the 'curious-mind' achievement).
  if (command.hidden) noteHiddenDiscovery(command.name)
  return command.run({ ...base, args: parsed.args, raw: raw.trim() })
}
