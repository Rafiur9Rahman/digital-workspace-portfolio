import { useEffect, useState } from 'react'
import { projects } from '../data/content'
import { useWindows } from '../store/windows'
import { useIsMobile } from '../lib/useIsMobile'

export function ProjectsApp() {
  const [selected, setSelected] = useState(projects[0].slug)
  const [mobilePane, setMobilePane] = useState<'list' | 'detail'>('list')
  const mobile = useIsMobile()
  const focusRequest = useWindows((s) => s.focusRequest)
  const clearFocusRequest = useWindows((s) => s.clearFocusRequest)

  // Jump to the project the Workspace Map (or anything else) asked for.
  useEffect(() => {
    if (
      focusRequest?.appId === 'projects' &&
      projects.some((p) => p.slug === focusRequest.ref)
    ) {
      setSelected(focusRequest.ref)
      setMobilePane('detail')
      clearFocusRequest()
    }
  }, [focusRequest, clearFocusRequest])

  const project = projects.find((p) => p.slug === selected)!

  const list = (
    <>
      <p className="px-2 py-1 text-[10px] uppercase tracking-widest text-desk-muted">
        Case files
      </p>
      {projects.map((p) => (
        <button
          key={p.slug}
          onClick={() => {
            setSelected(p.slug)
            setMobilePane('detail')
          }}
          className={`block w-full truncate rounded-md px-2 text-left ${
            mobile ? 'py-2.5 text-sm' : 'py-1.5 text-xs'
          } ${
            p.slug === selected && !mobile
              ? 'bg-desk-accent/20 text-desk-text'
              : 'text-desk-muted hover:bg-desk-edge/50'
          }`}
        >
          📄 {p.title}
        </button>
      ))}
    </>
  )

  const detail = (
    <div className={`text-sm ${mobile ? 'p-4' : 'p-5'}`}>
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
  )

  if (mobile) {
    return (
      <div className="flex h-full flex-col">
        {mobilePane === 'list' ? (
          <div className="min-h-0 flex-1 overflow-auto p-2">{list}</div>
        ) : (
          <>
            <button
              onClick={() => setMobilePane('list')}
              className="flex shrink-0 items-center gap-1 border-b border-desk-edge px-3 py-2 text-xs text-desk-muted hover:text-desk-text"
            >
              &lsaquo; Case files
            </button>
            <div className="min-h-0 flex-1 overflow-auto">{detail}</div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <aside className="w-48 shrink-0 border-r border-desk-edge bg-desk-bg/40 p-2">
        {list}
      </aside>
      <div className="min-w-0 flex-1">{detail}</div>
    </div>
  )
}
