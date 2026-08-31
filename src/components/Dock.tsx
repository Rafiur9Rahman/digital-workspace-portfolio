import { APP_LIST, APPS } from '../data/apps'
import { useWindows } from '../store/windows'
import { useIsMobile } from '../lib/useIsMobile'

export function Dock() {
  const windows = useWindows((s) => s.windows)
  const openApp = useWindows((s) => s.openApp)
  const minimize = useWindows((s) => s.minimize)
  const restore = useWindows((s) => s.restore)
  const mobile = useIsMobile()

  const minimized = windows.filter((w) => w.minimized)

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center ${
        mobile ? 'px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))]' : 'pb-4'
      }`}
    >
      <div
        className={`dock-scroll pointer-events-auto flex items-center rounded-2xl border border-desk-edge bg-desk-panel/80 shadow-lg shadow-black/40 backdrop-blur-xl ${
          mobile
            ? 'max-w-full gap-1 overflow-x-auto px-2 py-1.5'
            : 'gap-3 px-4 py-2.5'
        }`}
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
              mobile={mobile}
              onClick={() => {
                if (win && !win.minimized) minimize(win.id)
                else openApp(app.id)
              }}
            />
          )
        })}

        {minimized.length > 0 && (
          <>
            <span
              className={`w-px shrink-0 bg-desk-edge ${mobile ? 'mx-0.5 h-7' : 'mx-1 h-10'}`}
            />
            {minimized.map((win) => (
              <DockButton
                key={win.id}
                icon={APPS[win.appId].icon}
                label={win.title}
                running
                dim
                mobile={mobile}
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
  mobile,
  onClick,
}: {
  icon: string
  label: string
  running: boolean
  dim?: boolean
  mobile?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`group relative flex shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-white/5 ${
        mobile ? 'h-11 w-11' : 'h-14 w-14'
      }`}
    >
      {!mobile && (
        <span className="pointer-events-none absolute -top-10 whitespace-nowrap rounded-lg border border-desk-edge bg-desk-panel px-2.5 py-1 text-[11px] text-desk-text opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
          {label}
        </span>
      )}
      <span
        className={`leading-none transition-transform duration-150 ease-out ${
          mobile
            ? 'text-[26px]'
            : 'text-[30px] group-hover:-translate-y-1.5 group-hover:scale-110'
        } ${dim ? 'opacity-55 saturate-50' : ''}`}
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
