import { useEffect, useRef, useState } from 'react'
import { profile, projects, skills } from '../data/content'

const HELP = `Available commands:
  help        show this message
  about       who is Rafiur
  projects    list projects
  skills      list skills
  contact     how to get in touch
  clear       clear the screen`

function run(cmd: string): string {
  const c = cmd.trim().toLowerCase()
  switch (c) {
    case '':
      return ''
    case 'help':
      return HELP
    case 'about':
      return `${profile.name} — ${profile.title}\n${profile.tagline}`
    case 'projects':
      return projects.map((p) => `• ${p.title} (${p.period}) — ${p.summary}`).join('\n')
    case 'skills':
      return Object.entries(skills)
        .map(([g, items]) => `${g}: ${items.join(', ')}`)
        .join('\n')
    case 'contact':
      return `Email: ${profile.email}`
    default:
      return `command not found: ${c} — type "help"`
  }
}

export function TerminalApp() {
  const [history, setHistory] = useState<string[]>([
    'workspace terminal — type "help" to begin',
  ])
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView()
  }, [history])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (input.trim().toLowerCase() === 'clear') {
      setHistory([])
      setInput('')
      return
    }
    const out = run(input)
    setHistory((h) => [...h, `$ ${input}`, ...(out ? [out] : [])])
    setInput('')
  }

  return (
    <div className="h-full bg-desk-bg p-3 font-mono text-xs leading-relaxed text-green-300">
      {history.map((line, i) => (
        <pre key={i} className="whitespace-pre-wrap">
          {line}
        </pre>
      ))}
      <form onSubmit={submit} className="flex gap-2">
        <span className="text-desk-muted">$</span>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent text-green-300 outline-none"
        />
      </form>
      <div ref={endRef} />
    </div>
  )
}
