/**
 * Vendors EmulatorJS + the mGBA (GBA) core into public/emulatorjs/ so the
 * emulator is fully self-hosted — no CDN at runtime.
 *
 * Runs automatically before `npm run dev` / `npm run build` (predev / prebuild),
 * and manually via `npm run setup:emulator`. Idempotent: a version marker means
 * it's a no-op after the first run until the package is upgraded.
 *
 * public/emulatorjs/ is gitignored — it's reproduced from node_modules here, so
 * it also gets rebuilt on Vercel (prebuild).
 */
import {
  existsSync,
  mkdirSync,
  cpSync,
  rmSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from 'node:fs'
import { join, dirname } from 'node:path'

const ROOT = process.cwd()
const SRC_DATA = join(ROOT, 'node_modules/@emulatorjs/emulatorjs/data')
const SRC_CORE = join(ROOT, 'node_modules/@emulatorjs/core-mgba')
const PUB = join(ROOT, 'public/emulatorjs')
const OUT = join(PUB, 'data')
const MARKER = join(PUB, '.version')

if (!existsSync(SRC_DATA) || !existsSync(SRC_CORE)) {
  // Don't fail the build — the GBA app surfaces a friendly error instead.
  console.warn(
    '[setup-emulator] @emulatorjs packages not found in node_modules — run `npm install`. Skipping.',
  )
  process.exit(0)
}

const version = JSON.parse(
  readFileSync(join(SRC_DATA, 'version.json'), 'utf8'),
).version

if (existsSync(MARKER) && readFileSync(MARKER, 'utf8').trim() === version) {
  process.exit(0) // already vendored for this version
}

rmSync(PUB, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

// 1. The whole data folder (loader.js, emulator.css, src/, compression/,
//    localization/, version.json).
cpSync(SRC_DATA, OUT, { recursive: true })

// 2. loader.js loads `emulator.min.js` / `emulator.min.css`. The npm package
//    only ships the unminified src, so concatenate it (the same list + order
//    loader.js would otherwise request one-by-one). Avoids console errors and a
//    fallback to the CDN.
const SCRIPTS = [
  'emulator.js',
  'nipplejs.js',
  'shaders.js',
  'storage.js',
  'gamepad.js',
  'GameManager.js',
  'socket.io.min.js',
  'compression.js',
]
const bundle = SCRIPTS.map((f) =>
  readFileSync(join(SRC_DATA, 'src', f), 'utf8'),
).join('\n;\n')
writeFileSync(join(OUT, 'emulator.min.js'), bundle)
writeFileSync(
  join(OUT, 'emulator.min.css'),
  readFileSync(join(SRC_DATA, 'emulator.css')),
)

// 3. The mGBA core data files + report (the loader fetches these from
//    <data>/cores/ at runtime).
mkdirSync(join(OUT, 'cores/reports'), { recursive: true })
for (const f of readdirSync(SRC_CORE)) {
  if (f.endsWith('-wasm.data')) {
    cpSync(join(SRC_CORE, f), join(OUT, 'cores', f))
  }
}
cpSync(
  join(SRC_CORE, 'reports/mgba.json'),
  join(OUT, 'cores/reports/mgba.json'),
)

mkdirSync(dirname(MARKER), { recursive: true })
writeFileSync(MARKER, version)
console.log(
  `[setup-emulator] EmulatorJS ${version} + mGBA core vendored to public/emulatorjs/`,
)
