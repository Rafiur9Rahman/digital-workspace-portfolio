import { APP_LIST } from '../data/apps'
import { useWindows } from '../store/windows'

export function Dock() {
  const { windows, openApp, minimize } = useWindows()

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center pb-3">
      <div className="pointer-events-auto flex items-end gap-1.5 rounded-2xl border border-desk-edge bg-desk-panel/80 px-2.5 py-2 backdrop-blur">
        {APP_LIST.map((app) => {
          const open = windows.find((w) => w.appId === app.id)
          return (
            <button
              key={app.id}
              onClick={() => {
                if (open && !open.minimized) minimize(open.id)
                else openApp(app.id) // opens, or re-focuses + un-minimizes if already open
              }}
              title={app.title}
              className="group relative flex h-11 w-11 items-center justify-center rounded-xl bg-desk-bg/70 text-lg transition hover:-translate-y-1 hover:bg-desk-edge"
            >
              <span>{app.icon}</span>
              {open && (
                <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-desk-accent" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
