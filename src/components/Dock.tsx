import { APP_LIST, APPS } from '../data/apps'
import { useWindows } from '../store/windows'

export function Dock() {
  const windows = useWindows((s) => s.windows)
  const openApp = useWindows((s) => s.openApp)
  const minimize = useWindows((s) => s.minimize)
  const restore = useWindows((s) => s.restore)

  const minimized = windows.filter((w) => w.minimized)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center pb-3.5">
      <div
        className="pointer-events-auto flex items-end gap-1.5 rounded-2xl border-x border-b border-black/50 border-t-white/25 px-2.5 pb-2 pt-2.5 backdrop-blur-2xl"
        style={{
          background:
            'linear-gradient(to bottom, rgba(38,49,80,0.82), rgba(13,19,37,0.9))',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 3px rgba(0,0,0,0.5), 0 22px 48px -14px rgba(0,0,0,0.85)',
        }}
      >
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
            <span className="mx-1 mb-1 h-10 w-px self-center bg-gradient-to-b from-transparent via-white/20 to-transparent" />
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
      className="group relative flex h-12 w-12 items-end justify-center pb-1"
    >
      <span className="pointer-events-none absolute -top-10 whitespace-nowrap rounded-lg border border-white/10 bg-desk-panel px-2.5 py-1 text-[11px] text-desk-text opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
        {label}
      </span>
      <span
        className={`text-[28px] leading-none drop-shadow-[0_4px_5px_rgba(0,0,0,0.55)] transition-transform duration-200 ease-out group-hover:-translate-y-2.5 group-hover:scale-125 group-active:translate-y-0 group-active:scale-100 ${
          dim ? 'opacity-55 saturate-50' : ''
        }`}
      >
        {icon}
      </span>
      {running && (
        <span
          className={`absolute bottom-0 h-1 w-1 rounded-full ${
            dim ? 'bg-desk-muted' : 'bg-desk-accent shadow-[0_0_6px_rgba(91,140,255,0.9)]'
          }`}
        />
      )}
    </button>
  )
}
