import { APP_LIST, APPS } from '../data/apps'
import { useWindows } from '../store/windows'

export function Dock() {
  const windows = useWindows((s) => s.windows)
  const openApp = useWindows((s) => s.openApp)
  const minimize = useWindows((s) => s.minimize)
  const restore = useWindows((s) => s.restore)

  const minimized = windows.filter((w) => w.minimized)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center pb-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-desk-edge bg-desk-panel/80 px-4 py-2.5 shadow-lg shadow-black/40 backdrop-blur-xl">
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
            <span className="mx-1 h-10 w-px bg-desk-edge" />
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
      className="group relative flex h-14 w-14 items-center justify-center rounded-xl transition-colors hover:bg-white/5"
    >
      <span className="pointer-events-none absolute -top-10 whitespace-nowrap rounded-lg border border-desk-edge bg-desk-panel px-2.5 py-1 text-[11px] text-desk-text opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
        {label}
      </span>
      <span
        className={`text-[30px] leading-none transition-transform duration-150 ease-out group-hover:-translate-y-1.5 group-hover:scale-110 ${
          dim ? 'opacity-55 saturate-50' : ''
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
