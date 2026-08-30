import { useEffect, useState } from 'react'

export function MenuBar() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="absolute inset-x-0 top-0 z-40 flex h-8 items-center gap-3 border-b border-desk-edge bg-desk-panel/70 px-3 text-xs text-desk-muted backdrop-blur">
      <span className="font-semibold text-desk-text">◆ Workspace</span>
      <span className="hidden sm:inline">Rafiur Rahman</span>
      <span className="ml-auto tabular-nums">
        {now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
        {'  '}
        {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}
