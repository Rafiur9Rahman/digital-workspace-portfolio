import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '../store/auth'
import { LoginModal } from './LoginModal'

export function MenuBar() {
  const [now, setNow] = useState(() => new Date())
  const [showLogin, setShowLogin] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const user = useAuth((s) => s.user)
  const signOut = useAuth((s) => s.signOut)
  const isAdmin = Boolean(user)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!showMenu) return
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setShowMenu(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [showMenu])

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-40 flex h-[calc(2rem+env(safe-area-inset-top))] items-center gap-3 border-b border-desk-edge bg-desk-panel/70 px-3 pt-[env(safe-area-inset-top)] text-xs text-desk-muted backdrop-blur">
        <span className="font-semibold text-desk-text">◆ Workspace</span>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => (isAdmin ? setShowMenu((v) => !v) : setShowLogin(true))}
            className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-white/5 hover:text-desk-text"
            title={isAdmin ? 'Signed in as admin' : 'Sign in'}
          >
            {isAdmin && <span className="h-1.5 w-1.5 rounded-full bg-desk-accent" />}
            <span>Rafiur Rahman</span>
          </button>

          {isAdmin && showMenu && (
            <div className="absolute left-0 top-7 w-40 rounded-lg border border-desk-edge bg-desk-panel py-1 shadow-xl">
              <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-desk-muted">
                Admin mode
              </div>
              <button
                onClick={() => {
                  setShowMenu(false)
                  void signOut()
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-desk-text hover:bg-white/5"
              >
                Sign out
              </button>
            </div>
          )}
        </div>

        <span className="ml-auto tabular-nums">
          {now.toLocaleDateString(undefined, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}
          {'  '}
          {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <AnimatePresence>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </AnimatePresence>
    </>
  )
}
