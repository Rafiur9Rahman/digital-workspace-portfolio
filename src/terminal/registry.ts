import type { CommandDef } from './types'
import { portfolioCommands } from './commands/portfolio'
import { navigationCommands } from './commands/navigation'
import { filesystemCommands } from './commands/filesystem'
import { systemCommands } from './commands/system'
import { sysinfoCommands } from './commands/sysinfo'
import { windowCommands } from './commands/windows'
import { searchCommands } from './commands/search'
import { funCommands } from './commands/fun'
import { easterEggCommands } from './easterEggs'

const MODULES: CommandDef[][] = [
  portfolioCommands,
  navigationCommands,
  filesystemCommands,
  systemCommands,
  sysinfoCommands,
  windowCommands,
  searchCommands,
  funCommands,
  easterEggCommands,
]

const byName = new Map<string, CommandDef>()
for (const mod of MODULES) {
  for (const cmd of mod) {
    byName.set(cmd.name, cmd)
    for (const alias of cmd.aliases ?? []) byName.set(alias, cmd)
  }
}

export function getCommand(name: string): CommandDef | undefined {
  return byName.get(name.toLowerCase())
}

export function listCommands(): CommandDef[] {
  return [...new Set(byName.values())]
}

export function visibleCommands(): CommandDef[] {
  return listCommands()
    .filter((c) => !c.hidden)
    .sort((a, b) => a.name.localeCompare(b.name))
}
