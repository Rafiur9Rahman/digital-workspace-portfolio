import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/* The login form takes a username; Supabase Auth works on email, so we map
   "Rafiur9" -> "rafiur9@rafiur.workspace". Create the admin user in the
   Supabase dashboard with that exact email (see README). */
const EMAIL_DOMAIN = 'rafiur.workspace'
const toEmail = (username: string) =>
  username.includes('@')
    ? username.trim()
    : `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`

interface AuthState {
  user: User | null
  ready: boolean
  init: () => void
  signIn: (username: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

let initialised = false

export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,

  init: () => {
    if (initialised) return
    initialised = true

    if (!supabase) {
      set({ ready: true })
      return
    }

    void supabase.auth.getSession().then(({ data }) => {
      set({ user: data.session?.user ?? null, ready: true })
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null })
    })
  },

  signIn: async (username, password) => {
    if (!supabase) return { error: 'Login is not configured yet (see README).' }
    const { error } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password,
    })
    return error ? { error: 'Incorrect username or password.' } : {}
  },

  signOut: async () => {
    await supabase?.auth.signOut()
    set({ user: null })
  },
}))
