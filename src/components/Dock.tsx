import { APP_LIST, APPS } from '../data/apps'
import { useWindows } from '../store/windows'

export function Dock() {
  const windows = useWindows((s) => s.windows)
  const openApp = useWindows((s) => s.openApp)
  const minimize = useWindows((s) => s.minimize)
  const restore = useWindows((s) => s.restore)

  const minimized = windows.filter((w) => w.minimized)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center pb-3">
      <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-white/10 bg-desk-panel/70 p-2 shadow-[0_16px_44px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        {APP_LIST.map((app) => {
          const win = windows.find((w) => w.appId === app.id)
          return (
            <DockButton
              key={app.id}
              icon={app.icon}
              label={app.title}
              running={Boolean(win)}
              dim={win?.minimized}
              onClick={() => {
                if (win && !win.minimized) minimize(win.id)
                else openApp(app.id)
              }}
            />
          )
        })}

        {minimized.length > 0 && (
          <>
            <span className="mx-1.5 h-9 w-px bg-white/10" />
            {minimized.map((win) => (
              <DockButton
                key={win.id}
                icon={APPS[win.appId].icon}
                label={win.title}
                running
                dim
                onClick={() => restore(win.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function DockButton({
  icon,
  label,
  running,
  dim,
  onClick,
}: {
  icon: string
  label: string
  running: boolean
  dim?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="group relative flex h-12 w-12 items-center justify-center rounded-xl transition-colors hover:bg-white/5"
    >
      <span className="pointer-events-none absolute -top-9 whitespace-nowrap rounded-md border border-white/10 bg-desk-panel px-2 py-1 text-[11px] text-desk-text opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
        {label}
      </span>
      <span
        className={`text-2xl leading-none transition-transform duration-150 group-hover:-translate-y-1 group-hover:scale-110 ${
          dim ? 'opacity-60' : ''
        }`}
      >
        {icon}
      </span>
      {running && (
        <span
          className={`absolute bottom-1 h-1 w-1 rounded-full ${
            dim ? 'bg-desk-muted' : 'bg-desk-accent'
          }`}
        />
      )}
    </button>
  )
}
