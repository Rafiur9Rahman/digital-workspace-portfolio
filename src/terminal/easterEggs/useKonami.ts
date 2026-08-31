import { useEffect, useRef } from 'react'

export const KONAMI_SEQUENCE = [
  'arrowup',
  'arrowup',
  'arrowdown',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'arrowleft',
  'arrowright',
  'b',
  'a',
] as const

/** Stateful matcher - feed it keys, returns true on the key that completes the code. */
export function createKonamiMatcher(): (key: string) => boolean {
  let progress = 0
  return (key) => {
    const k = key.toLowerCase()
    if (k === KONAMI_SEQUENCE[progress]) {
      progress += 1
      if (progress === KONAMI_SEQUENCE.length) {
        progress = 0
        return true
      }
      return false
    }
    progress = k === KONAMI_SEQUENCE[0] ? 1 : 0
    return false
  }
}

/* Listens on window and never calls preventDefault, so it can't disturb typing,
   history navigation, or assistive tech. Active only while mounted (i.e. while
   the terminal window is open). */
export function useKonami(onUnlock: () => void) {
  const cbRef = useRef(onUnlock)
  useEffect(() => {
    cbRef.current = onUnlock
  })
  useEffect(() => {
    const match = createKonamiMatcher()
    const onKey = (e: KeyboardEvent) => {
      if (match(e.key)) cbRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
