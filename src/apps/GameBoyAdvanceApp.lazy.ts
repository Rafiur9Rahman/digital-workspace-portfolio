import { lazy } from 'react'

/* Lazy boundary in its own module so the emulator glue stays out of the initial
   bundle (it becomes its own chunk) and app registry HMR isn't disturbed. */
export const GameBoyAdvanceAppLazy = lazy(() =>
  import('./GameBoyAdvanceApp').then((m) => ({ default: m.GameBoyAdvanceApp })),
)
