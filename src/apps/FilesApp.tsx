import { useWindows } from '../store/windows'
import { APP_ICONS, APP_TITLES, type AppId } from '../data/appMeta'

/* A Finder-style launcher. Every "file" and "folder" is a real desktop app —
   clicking one opens (or focuses) its window through the same window store the
   dock and desktop icons use. */
const SECTIONS: { label: string; ids: AppId[] }[] = [
  { label: 'Applications', ids: ['assistant', 'about', 'terminal', 'projects'] },
  { label: 'Files & Folders', ids: ['images', 'gba', 'resume', 'photo', 'contact'] },
]

const ITEM_COUNT = SECTIONS.reduce((n, s) => n + s.ids.length, 0)

export function FilesApp() {
  const openApp = useWindows((s) => s.openApp)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-desk-edge px-4 py-2.5 text-xs">
        <span className="text-[13px] leading-none">📂</span>
        <span className="font-medium text-desk-text">Workspace</span>
        <span className="ml-auto text-desk-muted">{ITEM_COUNT} items</span>
      </div>

      <div className="desk-scroll flex-1 overflow-auto p-4">
        {SECTIONS.map((section) => (
          <div key={section.label} className="mb-5 last:mb-0">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-desk-muted">
              {section.label}
            </p>
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))' }}
            >
              {section.ids.map((id) => (
                <button
                  key={id}
                  onClick={() => openApp(id)}
                  title={`Open ${APP_TITLES[id]}`}
                  className="flex flex-col items-center gap-1.5 rounded-lg px-2 py-3 text-center transition hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none"
                >
                  <span className="text-[34px] leading-none">{APP_ICONS[id]}</span>
                  <span className="text-[11px] leading-tight text-desk-text">
                    {APP_TITLES[id]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
