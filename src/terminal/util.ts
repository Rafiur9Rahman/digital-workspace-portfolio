/** Resolves after `ms`, or immediately when `signal` aborts. */
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve()
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}

/** "42 secs" / "3 mins" / "1 hr 4 mins" */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s} sec${s === 1 ? '' : 's'}`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min${m === 1 ? '' : 's'}`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h} hr${h === 1 ? '' : 's'}${rm ? ` ${rm} min${rm === 1 ? '' : 's'}` : ''}`
}
