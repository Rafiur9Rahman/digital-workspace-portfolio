import { profile } from '../data/content'

export function ContactApp() {
  return (
    <div className="space-y-4 p-5 text-sm">
      <h2 className="text-base font-semibold text-desk-text">Get in touch</h2>

      <dl className="space-y-3">
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-desk-muted">
            Email
          </dt>
          <dd className="mt-0.5">
            <a
              href={`mailto:${profile.email}`}
              className="text-desk-accent hover:underline"
            >
              {profile.email}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-desk-muted">
            Location
          </dt>
          <dd className="mt-0.5 text-desk-text">{profile.location}</dd>
        </div>
      </dl>

      <p className="text-xs text-desk-muted">LinkedIn and GitHub links coming soon.</p>
    </div>
  )
}
