import type { CommandDef, OutputLine } from '../types'
import {
  certifications,
  experience,
  links,
  profile,
  projects,
  skills,
} from '../../data/content'

/* Two-column layout for `help` and similar. */
function table(rows: [string, string][]): string {
  const width = rows.length ? Math.max(...rows.map(([left]) => left.length)) : 0
  return rows.map(([left, right]) => `  ${left.padEnd(width)}  ${right}`).join('\n')
}

const help: CommandDef = {
  name: 'help',
  summary: 'list available commands',
  run: (ctx) => {
    const rows = ctx
      .listCommands()
      .filter((c) => !c.hidden)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => [c.name, c.summary] as [string, string])
    return {
      lines: [
        { kind: 'output', text: 'Commands' },
        { kind: 'output', text: table(rows) },
        { kind: 'muted', text: '' },
        {
          kind: 'muted',
          text: 'Tab completes commands · ↑/↓ recalls history · not everything is on this list.',
        },
      ],
    }
  },
}

const about: CommandDef = {
  name: 'about',
  summary: 'who is Rafiur',
  run: () => ({
    lines: [
      { kind: 'output', text: `${profile.name} — ${profile.title}` },
      { kind: 'output', text: profile.tagline },
      { kind: 'muted', text: `${profile.location} · ${profile.email}` },
    ],
  }),
}

const projectsCmd: CommandDef = {
  name: 'projects',
  summary: 'list portfolio projects',
  run: () => ({
    lines: projects.flatMap<OutputLine>((p) => [
      { kind: 'output', text: `${p.title}  (${p.period})` },
      { kind: 'muted', text: `  ${p.summary}` },
      { kind: 'muted', text: `  ${p.tech.join(' · ')}` },
    ]),
  }),
}

const skillsCmd: CommandDef = {
  name: 'skills',
  summary: 'skills by area',
  run: () => ({
    lines: Object.entries(skills).map<OutputLine>(([group, items]) => ({
      kind: 'output',
      text: `${group.padEnd(10)} ${items.join(', ')}`,
    })),
  }),
}

const experienceCmd: CommandDef = {
  name: 'experience',
  summary: 'work history',
  run: () => ({
    lines: experience.flatMap<OutputLine>((job) => [
      { kind: 'output', text: `${job.role} — ${job.company}` },
      {
        kind: 'muted',
        text: `  ${job.period}${job.location ? ` · ${job.location}` : ''}`,
      },
      ...job.highlights.map<OutputLine>((h) => ({ kind: 'muted', text: `  • ${h}` })),
    ]),
  }),
}

const certificationsCmd: CommandDef = {
  name: 'certifications',
  aliases: ['certs'],
  summary: 'certifications',
  run: () => ({
    lines: certifications.map<OutputLine>((c) => ({
      kind: 'output',
      text: `${c.name} — ${c.issuer} (${c.year})`,
    })),
  }),
}

const contact: CommandDef = {
  name: 'contact',
  summary: 'how to get in touch',
  run: () => {
    const lines: OutputLine[] = [
      { kind: 'output', text: `Email     ${profile.email}` },
      { kind: 'output', text: `Location  ${profile.location}` },
    ]
    if (links.github) lines.push({ kind: 'output', text: `GitHub    ${links.github}` })
    if (links.linkedin) lines.push({ kind: 'output', text: `LinkedIn  ${links.linkedin}` })
    return { lines }
  },
}

const cv: CommandDef = {
  name: 'cv',
  aliases: ['resume'],
  summary: 'condensed CV',
  run: () => {
    const top = [...projects].sort((a, b) => b.difficulty - a.difficulty).slice(0, 3)
    const lines: OutputLine[] = [
      { kind: 'output', text: `${profile.name} — ${profile.title}` },
      { kind: 'muted', text: profile.tagline },
      { kind: 'muted', text: '' },
      { kind: 'output', text: 'Selected work' },
      ...top.map<OutputLine>((p) => ({ kind: 'muted', text: `  • ${p.title} — ${p.summary}` })),
      { kind: 'muted', text: '' },
      { kind: 'output', text: 'Skills' },
      ...Object.entries(skills).map<OutputLine>(([group, items]) => ({
        kind: 'muted',
        text: `  ${group}: ${items.join(', ')}`,
      })),
      { kind: 'muted', text: '' },
      links.cv
        ? { kind: 'muted', text: `Full PDF: ${links.cv}` }
        : { kind: 'muted', text: `Full CV on request — ${profile.email}` },
    ]
    return { lines }
  },
}

const github: CommandDef = {
  name: 'github',
  summary: 'open the GitHub profile',
  run: (ctx) => {
    if (!links.github) return { lines: [{ kind: 'muted', text: 'GitHub link not published yet.' }] }
    ctx.openUrl(links.github)
    return { lines: [{ kind: 'system', text: `Opening ${links.github}` }] }
  },
}

const whoami: CommandDef = {
  name: 'whoami',
  summary: 'print the current user',
  run: () => 'visitor',
}

export const portfolioCommands: CommandDef[] = [
  help,
  about,
  projectsCmd,
  skillsCmd,
  experienceCmd,
  certificationsCmd,
  contact,
  cv,
  github,
  whoami,
]
