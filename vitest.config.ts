import { defineConfig } from 'vitest/config'

// Unit tests only — pure terminal logic + the window store. No DOM environment;
// localStorage is shimmed in src/test/setup.ts. Component / integration coverage
// for the emulator lives in a headless-browser script, not here.
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
  },
})
