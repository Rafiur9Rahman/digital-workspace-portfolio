import { useState } from 'react'
import { projects } from '../data/content'

export function ProjectsApp() {
  const [selected, setSelected] = useState(projects[0].slug)
  const project = projects.find((p) => p.slug === selected)!

  return (
    <div className="flex h-full">
      <aside className="w-48 shrink-0 border-r border-desk-edge bg-desk-bg/40 p-2">
        <p className="px-2 py-1 text-[10px] uppercase tracking-widest text-desk-muted">
          Case files
        </p>
        {projects.map((p) => (
          <button
            key={p.slug}
            onClick={() => setSelected(p.slug)}
            className={`block w-full truncate rounded-md px-2 py-1.5 text-left text-xs ${
              p.slug === selected
                ? 'bg-desk-accent/20 text-desk-text'
                : 'text-desk-muted hover:bg-desk-edge/50'
            }`}
          >
            📄 {p.title}
          </button>
        ))}
      </aside>

      <div className="min-w-0 flex-1 p-5 text-sm">
        <h2 className="text-lg font-semibold text-desk-text">{project.title}</h2>
        <p className="mt-0.5 text-xs text-desk-muted">
          {project.role} · {project.period} · difficulty {project.difficulty}/5
        </p>
        <p className="mt-3 text-desk-text">{project.summary}</p>

        <h3 className="mt-4 text-xs font-semibold uppercase tracking-widest text-desk-muted">
          Tech
        </h3>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {project.tech.map((t) => (
            <span
              key={t}
              className="rounded-md border border-desk-edge bg-desk-bg/60 px-2 py-0.5 text-xs"
            >
              {t}
            </span>
          ))}
        </div>

        <h3 className="mt-4 text-xs font-semibold uppercase tracking-widest text-desk-muted">
          Outcomes
        </h3>
        <ul className="mt-1.5 list-inside list-disc space-y-1 text-desk-text">
          {project.outcomes.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
