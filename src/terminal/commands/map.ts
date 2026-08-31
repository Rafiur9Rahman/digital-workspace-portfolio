import type { CommandDef } from '../types'

/* `map` opens the Workspace Map. `map <topic>` opens it on a node (any skill,
   project, role or certification by name) or on a curated view
   (all / recruiter / ai). */
const map: CommandDef = {
  name: 'map',
  aliases: ['workspacemap'],
  summary: 'open the Workspace Map, optionally on a topic',
  usage: 'map [topic|view]',
  run: (ctx) => {
    const topic = ctx.args.join(' ').trim()
    if (!topic) {
      ctx.openApp('map')
      return { lines: [{ kind: 'system', text: 'Opening Workspace Map…' }] }
    }
    ctx.openAppWith('map', topic)
    return {
      lines: [{ kind: 'system', text: `Opening Workspace Map on "${topic}"…` }],
    }
  },
}

export const mapCommands: CommandDef[] = [map]
