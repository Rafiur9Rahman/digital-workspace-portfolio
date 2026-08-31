import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True once VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set (see README). */
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null

export const IMAGES_BUCKET = 'images'
