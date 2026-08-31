import { profile } from '../data/content'

const initials = profile.name
  .split(' ')
  .map((w) => w[0])
  .join('')

export function PhotoApp() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-5">
      <div className="relative aspect-square w-full max-w-[280px] overflow-hidden rounded-xl border border-desk-edge">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,#3b5bdb,#141a2f_72%)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl font-semibold tracking-tight text-white/90">
            {initials}
          </span>
        </div>
      </div>
      <p className="font-mono text-[11px] text-desk-muted">
        profile.jpg · 1600 × 1600
      </p>
    </div>
  )
}
