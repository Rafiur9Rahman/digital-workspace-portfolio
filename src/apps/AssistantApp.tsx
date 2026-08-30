import { useState } from 'react'
import { projects, type Project } from '../data/content'
import { useWindows } from '../store/windows'

interface Msg {
  role: 'user' | 'assistant'
  text: string
  project?: Project
}

const SUGGESTIONS = [
  'Give me his most technically difficult project',
  'What has he done with AI?',
  'What technologies does he know?',
]

/**
 * Local stand-in for the real portfolio AI. Matches the question against the
 * content layer with simple heuristics. Swap this for a call to /api/ask later.
 */
function answer(qRaw: string): Msg {
  const q = qRaw.toLowerCase()

  if (/(hard|difficult|complex|challeng)/.test(q)) {
    const p = [...projects].sort((a, b) => b.difficulty - a.difficulty)[0]
    return {
      role: 'assistant',
      text: `His most technically difficult project is "${p.title}" (difficulty ${p.difficulty}/5) — ${p.summary}`,
      project: p,
    }
  }

  if (/(ai|machine learning|ml|openai|llm|rag|embedding)/.test(q)) {
    const ai = projects.filter((p) => p.categories.includes('AI'))
    const p = ai[0]
    return {
      role: 'assistant',
      text: `AI work: ${ai
        .map((x) => x.title)
        .join(', ')}. For example "${p.title}" — ${p.summary}`,
      project: p,
    }
  }

  if (/(tech|technolog|stack|skill|language|tool)/.test(q)) {
    const techs = [...new Set(projects.flatMap((p) => p.tech))]
    return {
      role: 'assistant',
      text: `Across his projects he has used: ${techs.join(', ')}.`,
    }
  }

  const words = q.split(/\W+/).filter((w) => w.length > 3)
  const hit = projects.find((p) =>
    words.some((w) => (p.title + ' ' + p.summary + ' ' + p.tech.join(' ')).toLowerCase().includes(w)),
  )
  if (hit) {
    return {
      role: 'assistant',
      text: `That sounds like "${hit.title}" — ${hit.summary}`,
      project: hit,
    }
  }

  return {
    role: 'assistant',
    text: "I can answer questions about Rafiur's projects, skills and experience. Try one of the suggestions below.",
  }
}

export function AssistantApp() {
  const openApp = useWindows((s) => s.openApp)
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', text: "Hi — I'm Rafiur's portfolio assistant. Ask me anything about his work." },
  ])
  const [input, setInput] = useState('')

  function send(text: string) {
    const t = text.trim()
    if (!t) return
    setMessages((m) => [...m, { role: 'user', text: t }, answer(t)])
    setInput('')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="desk-scroll flex-1 space-y-3 overflow-auto p-4 text-sm">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div
              className={`inline-block max-w-[85%] rounded-xl px-3 py-2 text-left ${
                m.role === 'user'
                  ? 'bg-desk-accent text-white'
                  : 'border border-desk-edge bg-desk-bg/60 text-desk-text'
              }`}
            >
              {m.text}
              {m.project && (
                <button
                  onClick={() => openApp('projects')}
                  className="mt-2 block rounded-md bg-desk-accent px-2.5 py-1 text-xs font-medium text-white hover:brightness-110"
                >
                  View case study: {m.project.title} →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-desk-edge p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-desk-edge px-2.5 py-1 text-[11px] text-desk-muted hover:bg-desk-edge/50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a project, skill or technology…"
            className="min-w-0 flex-1 rounded-lg border border-desk-edge bg-desk-bg px-3 py-2 text-sm outline-none focus:border-desk-accent"
          />
          <button
            type="submit"
            className="rounded-lg bg-desk-accent px-3 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  )
}
