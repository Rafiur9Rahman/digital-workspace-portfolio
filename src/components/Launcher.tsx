import { motion } from 'framer-motion'
import { profile, activity } from '../data/content'
import { useWindows } from '../store/windows'

export function Launcher() {
  const openApp = useWindows((s) => s.openApp)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
    >
      <div className="pointer-events-auto max-w-md">
        <h1 className="text-3xl font-semibold text-desk-text">{profile.name}</h1>
        <p className="mt-1 text-sm text-desk-muted">{profile.title}</p>

        <p className="mt-6 text-xs uppercase tracking-widest text-desk-muted">
          What would you like to explore?
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => openApp('assistant')}
            className="rounded-lg bg-desk-accent px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            Ask my AI
          </button>
          <button
            onClick={() => openApp('projects')}
            className="rounded-lg border border-desk-edge bg-desk-panel px-4 py-2 text-sm hover:bg-desk-edge"
          >
            View Projects
          </button>
          <button
            onClick={() => openApp('about')}
            className="rounded-lg border border-desk-edge bg-desk-panel px-4 py-2 text-sm hover:bg-desk-edge"
          >
            Open Workspace
          </button>
        </div>

        <div className="mt-8 rounded-xl border border-desk-edge bg-desk-panel/60 p-3 text-left">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-desk-muted">
            Activity
          </p>
          <ul className="space-y-1.5 text-xs">
            {activity.map((a) => (
              <li key={a.label} className="flex gap-3">
                <span className="w-16 shrink-0 tabular-nums text-desk-muted">
                  {a.when}
                </span>
                <span className="text-desk-text">{a.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  )
}
