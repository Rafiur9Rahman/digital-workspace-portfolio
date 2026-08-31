import { profile, projects, skills } from '../data/content'

export function ResumeApp() {
  return (
    <div className="space-y-5 p-6 text-sm">
      <header className="border-b border-desk-edge pb-3">
        <h2 className="text-lg font-semibold text-desk-text">{profile.name}</h2>
        <p className="text-xs text-desk-muted">{profile.title}</p>
        <p className="mt-2 text-desk-text">{profile.tagline}</p>
      </header>

      <section>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-desk-muted">
          Skills
        </h3>
        <div className="space-y-1">
          {Object.entries(skills).map(([group, items]) => (
            <p key={group} className="text-xs">
              <span className="text-desk-muted">{group}: </span>
              <span className="text-desk-text">{items.join(', ')}</span>
            </p>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-desk-muted">
          Selected projects
        </h3>
        <ul className="space-y-2">
          {projects.map((p) => (
            <li key={p.slug}>
              <p className="text-desk-text">
                {p.title}{' '}
                <span className="text-desk-muted">· {p.period}</span>
              </p>
              <p className="text-xs text-desk-muted">{p.summary}</p>
            </li>
          ))}
        </ul>
      </section>

      <a
        href={`mailto:${profile.email}?subject=CV%20request`}
        className="inline-block rounded-lg bg-desk-accent px-3 py-1.5 text-xs font-medium text-white hover:brightness-110"
      >
        Request full CV (PDF)
      </a>
    </div>
  )
}
