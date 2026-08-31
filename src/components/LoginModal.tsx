import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../store/auth'
import { isSupabaseConfigured } from '../lib/supabase'

/** Rendered (and unmounted) by MenuBar inside an <AnimatePresence>. */
export function LoginModal({ onClose }: { onClose: () => void }) {
  const signIn = useAuth((s) => s.signIn)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await signIn(username, password)
    setBusy(false)
    if (res.error) {
      setError(res.error)
      return
    }
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[340px] rounded-2xl border border-desk-edge bg-desk-panel p-6 shadow-2xl"
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-desk-accent" />
          <h2 className="text-sm font-semibold tracking-wide text-desk-text">
            Admin sign in
          </h2>
        </div>
        <p className="mb-4 text-xs text-desk-muted">
          Sign in to manage the Images folder.
        </p>

        {!isSupabaseConfigured && (
          <p className="mb-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200/90">
            Login backend isn’t configured yet — see the README (Supabase setup).
          </p>
        )}

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-widest text-desk-muted">
              Username
            </span>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full rounded-lg border border-desk-edge bg-desk-bg px-3 py-2 text-sm outline-none focus:border-desk-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-widest text-desk-muted">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-desk-edge bg-desk-bg px-3 py-2 text-sm outline-none focus:border-desk-accent"
            />
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-desk-muted hover:text-desk-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !username || !password}
              className="rounded-lg bg-desk-accent px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
