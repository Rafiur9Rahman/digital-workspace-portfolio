import { useEffect, useState } from 'react'

/* Single source of truth for "are we on a phone-sized screen". Matches the
   640px line the window manager and desktop icons already use. Apps render
   without props, so they read this instead of a deskW value. */

const QUERY = '(max-width: 639px)'

function read(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(QUERY).matches
}

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(read)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(QUERY)
    const onChange = () => setMobile(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return mobile
}
