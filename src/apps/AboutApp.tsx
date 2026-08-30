import { profile, skills } from '../data/content'

export function AboutApp() {
  return (
    <div className="p-5 text-sm leading-relaxed">
      <h2 className="text-lg font-semibold text-desk-text">{profile.name}</h2>
      <p className="text-desk-muted">{profile.title}</p>
      <p className="mt-3 text-desk-text">{profile.tagline}</p>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs text-desk-muted">
        <dt>Location</dt>
        <dd className="text-desk-text">{profile.location}</dd>
        <dt>Email</dt>
        <dd className="text-desk-text">{profile.email}</dd>
      </dl>

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-widest text-desk-muted">
        Skills
      </h3>
      <div className="mt-2 space-y-3">
        {Object.entries(skills).map(([group, items]) => (
          <div key={group}>
            <p className="text-xs text-desk-muted">{group}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {items.map((s) => (
                <span
                  key={s}
                  className="rounded-md border border-desk-edge bg-desk-bg/60 px-2 py-0.5 text-xs text-desk-text"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
