import { useEffect, useRef, useState } from 'react'
import { loadLastRom, saveLastRom } from '../lib/gbaStorage'

/* Game Boy Advance — EmulatorJS (mGBA core), fully self-hosted from
   /emulatorjs (see scripts/setup-emulator.mjs). The ROM is read client-side and
   never uploaded. In-game saves + save states persist in EmulatorJS's own
   IndexedDB; this component additionally remembers the last ROM so it reopens
   into the same game. All local to this browser.

   emulator.min.js declares `class EmulatorJS` at global scope — loading it a
   second time throws "redeclaration of let EmulatorJS", which then cascades
   into "EJS_STORAGE is not a constructor" and "this.game.parentElement is
   null". So the runtime is loaded exactly once per page (loadEmulatorRuntime),
   and every boot constructs a fresh EmulatorJS instance directly instead of
   re-injecting the loader script. This survives React StrictMode's
   mount → unmount → mount without re-injecting anything. */

type Phase = 'idle' | 'booting' | 'running' | 'error'

const DATA_PATH = '/emulatorjs/data/'

/* Minimal shape of the EmulatorJS instance we touch. It has no public teardown
   method, so destroyEmulator() reaches into these. */
interface EJSInstance {
  on?: (event: string, cb: () => void) => void
  callEvent?: (event: string) => void
  gameManager?: { saveSaveFiles?: () => void } | null
  saveSaveInterval?: ReturnType<typeof setInterval> | null
  started?: boolean
}

type EJSConstructor = (new (selector: string, config: unknown) => EJSInstance) & {
  prototype: Record<string, unknown>
}

type EJSWindow = Window &
  Record<string, unknown> & {
    EmulatorJS?: EJSConstructor
    EJS_emulator?: EJSInstance
  }

/* RetroPad button index -> { keyboard key (EmulatorJS keyMap name), gamepad }.
   GBA has no X/Y. A=K, B=J, L=U, R=I, Start=Enter, Select=Backspace — none clash
   with WASD, which is mirrored onto the D-pad below. */
const GBA_CONTROLS: Record<number, { value: string; value2: string }> = {
  0: { value: 'j', value2: 'BUTTON_2' }, // B
  1: { value: '', value2: 'BUTTON_4' }, // (Y — n/a)
  2: { value: 'backspace', value2: 'SELECT' }, // Select
  3: { value: 'enter', value2: 'START' }, // Start
  4: { value: 'up arrow', value2: 'DPAD_UP' },
  5: { value: 'down arrow', value2: 'DPAD_DOWN' },
  6: { value: 'left arrow', value2: 'DPAD_LEFT' },
  7: { value: 'right arrow', value2: 'DPAD_RIGHT' },
  8: { value: 'k', value2: 'BUTTON_1' }, // A
  9: { value: '', value2: 'BUTTON_3' }, // (X — n/a)
  10: { value: 'u', value2: 'LEFT_TOP_SHOULDER' }, // L
  11: { value: 'i', value2: 'RIGHT_TOP_SHOULDER' }, // R
  12: { value: '', value2: 'LEFT_BOTTOM_SHOULDER' },
  13: { value: '', value2: 'RIGHT_BOTTOM_SHOULDER' },
  14: { value: '', value2: 'LEFT_STICK' },
  15: { value: '', value2: 'RIGHT_STICK' },
}

/* WASD -> arrow-key keyCodes. EmulatorJS matches keys by e.keyCode, so we can
   synthesise arrow events from WASD. */
const WASD_TO_ARROW: Record<string, number> = {
  KeyW: 38,
  KeyA: 37,
  KeyS: 40,
  KeyD: 39,
}

/* ---- module-level singletons (survive a StrictMode remount) ---------------- */

let runtimePromise: Promise<void> | null = null
let liveEmulator: EJSInstance | null = null

/* Load emulator.min.js + emulator.min.css once. Guarded three ways: the cached
   promise, an existing window.EmulatorJS, and a <script data-ejs-assets> marker
   (covers HMR, which resets the module but not the DOM). */
function loadEmulatorRuntime(): Promise<void> {
  if (runtimePromise) return runtimePromise
  runtimePromise = new Promise<void>((resolve, reject) => {
    const w = window as unknown as EJSWindow
    if (typeof w.EmulatorJS === 'function') {
      resolve()
      return
    }

    if (!document.querySelector('link[data-ejs-assets]')) {
      const css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = `${DATA_PATH}emulator.min.css`
      css.dataset.ejsAssets = '1'
      document.head.appendChild(css)
    }

    const done = () => resolve()
    const fail = () => {
      runtimePromise = null // let a later boot retry
      reject(new Error('emulator runtime failed to load'))
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-ejs-assets]',
    )
    if (existing) {
      existing.addEventListener('load', done)
      existing.addEventListener('error', fail)
      return
    }

    const script = document.createElement('script')
    script.src = `${DATA_PATH}emulator.min.js`
    script.dataset.ejsAssets = '1'
    script.addEventListener('load', done)
    script.addEventListener('error', () => {
      script.remove()
      fail()
    })
    document.head.appendChild(script)
  })
  return runtimePromise
}

/* EmulatorJS attaches a window "resize" listener bound to each instance and
   never removes it (no teardown method). Once an instance is torn down its host
   node is gone and the stock handleResize throws on `this.game.parentElement`.
   Patch the prototype once, before the first instance is constructed, so a
   detached instance bails instead. */
function patchHandleResize(): void {
  const proto = (window as unknown as EJSWindow).EmulatorJS?.prototype
  if (!proto || proto.__resizePatched) return
  const original = proto.handleResize
  if (typeof original !== 'function') return
  proto.handleResize = function patchedHandleResize(
    this: { game?: { parentElement?: unknown } | null },
    ...args: unknown[]
  ) {
    if (!this.game || !this.game.parentElement) return
    try {
      return (original as (...a: unknown[]) => unknown).apply(this, args)
    } catch {
      /* stale instance mid-teardown */
    }
  }
  proto.__resizePatched = true
}

/* Best-effort teardown of the running instance — EmulatorJS provides none.

   Note: we deliberately do NOT sweep `window.EJS_*` here. Those keys include
   EmulatorJS's own runtime classes (EJS_STORAGE, EJS_COMPRESSION, EJS_GAMEPAD,
   EJS_SHADERS, EJS_GameManager) which are defined once by emulator.min.js and
   must survive between boots — deleting them makes `new EJS_STORAGE()` throw
   "not a constructor" inside the next EmulatorJS constructor. We pass config as
   an object to `new EmulatorJS()`, so no EJS_* config globals are set anyway;
   the only one we own is `EJS_emulator`, cleared below. */
function destroyEmulator(): void {
  const inst = liveEmulator
  liveEmulator = null
  const w = window as unknown as EJSWindow
  if (w.EJS_emulator === inst) delete w.EJS_emulator
  if (!inst) return
  try {
    inst.gameManager?.saveSaveFiles?.() // flush SRAM to IndexedDB
  } catch {
    /* best effort */
  }
  try {
    inst.callEvent?.('exit')
  } catch {
    /* ignore */
  }
  try {
    if (inst.saveSaveInterval != null) clearInterval(inst.saveSaveInterval)
  } catch {
    /* ignore */
  }
  // Neutralises the leaked window listeners that early-return on `started`
  // (beforeunload, the autosave interval).
  inst.started = false
}

export function GameBoyAdvanceApp() {
  const hostRef = useRef<HTMLDivElement>(null)
  const blobUrlRef = useRef<string | null>(null)
  const aliveRef = useRef(true)
  const [phase, setPhase] = useState<Phase>('idle')
  const [romName, setRomName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Bumped on every boot() so a boot that loses the race (StrictMode's
  // mount → unmount → mount fires two) bails after its awaits instead of
  // constructing a second emulator on the same host.
  const bootEpochRef = useRef(0)

  function teardown() {
    destroyEmulator()
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    if (hostRef.current) hostRef.current.innerHTML = ''
  }

  async function boot(name: string, bytes: ArrayBuffer) {
    const epoch = ++bootEpochRef.current
    teardown()
    if (!aliveRef.current) return
    setError(null)
    setRomName(name)
    setPhase('booting')

    const url = URL.createObjectURL(
      new Blob([bytes], { type: 'application/octet-stream' }),
    )
    blobUrlRef.current = url

    try {
      await loadEmulatorRuntime()
    } catch {
      if (aliveRef.current && epoch === bootEpochRef.current) {
        setPhase('error')
        setError(
          'Could not load the emulator. Run `npm run setup:emulator` so /public/emulatorjs exists, then reload.',
        )
      }
      return
    }
    // A newer boot() started while the runtime was loading (StrictMode remount,
    // or the user picked another ROM) — let that one win.
    if (!aliveRef.current || epoch !== bootEpochRef.current) return

    const w = window as unknown as EJSWindow
    const EmulatorCtor = w.EmulatorJS
    const host = hostRef.current
    if (typeof EmulatorCtor !== 'function' || !host) {
      setPhase('error')
      setError('The emulator runtime did not load correctly. Check the console.')
      return
    }

    patchHandleResize()
    host.innerHTML = ''

    // Only ask for the threaded core when the page is actually cross-origin
    // isolated. With threads:true and no SharedArrayBuffer, EmulatorJS shows
    // "Error for site owner" instead of falling back to the single-threaded
    // mGBA build — so gate it.
    const isolated =
      typeof window.crossOriginIsolated === 'boolean' &&
      window.crossOriginIsolated

    const markRunning = () => {
      if (aliveRef.current && epoch === bootEpochRef.current) setPhase('running')
    }

    try {
      // The config keys EmulatorJS's loader.js would otherwise map from the
      // window.EJS_* globals — inlined so we never re-inject the loader.
      const emu = new EmulatorCtor('#gba-emulator-host', {
        gameUrl: url,
        dataPath: DATA_PATH,
        system: 'gba',
        gameName: name, // required for browser saves when the ROM is a blob
        gameId: 1,
        color: '#5b8cff',
        backgroundColor: '#0b1020',
        startOnLoad: true,
        threads: isolated,
        defaultControllers: { 0: GBA_CONTROLS, 1: {}, 2: {}, 3: {} },
        defaultOptions: {
          'save-state-location': 'browser',
          'save-save-interval': '30',
        },
      })
      emu.on?.('ready', markRunning)
      emu.on?.('start', markRunning)
      liveEmulator = emu
      w.EJS_emulator = emu
    } catch (err) {
      console.error('[gba] emulator failed to start', err)
      if (aliveRef.current && epoch === bootEpochRef.current) {
        setPhase('error')
        setError('The emulator failed to start. Check the browser console.')
      }
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const bytes = await file.arrayBuffer()
    const name = file.name.replace(/\.[^.]+$/, '') || 'game'
    void saveLastRom(name, bytes)
    void boot(name, bytes)
  }

  // Auto-load the last ROM when the app opens.
  useEffect(() => {
    aliveRef.current = true
    const timer = window.setTimeout(async () => {
      const last = await loadLastRom()
      if (aliveRef.current && last) void boot(last.name, last.bytes)
    }, 30)
    return () => {
      aliveRef.current = false
      clearTimeout(timer)
      teardown()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mirror WASD onto the D-pad, but only while the emulator is focused so WASD
  // stays free everywhere else.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const keyCode = WASD_TO_ARROW[e.code]
      if (keyCode === undefined || e.repeat) return
      const host = hostRef.current
      const active = document.activeElement
      if (!host || (active !== host && !host.contains(active))) return
      e.preventDefault()
      const synthetic = new KeyboardEvent(e.type, {
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(synthetic, 'keyCode', { get: () => keyCode })
      Object.defineProperty(synthetic, 'which', { get: () => keyCode })
      host.dispatchEvent(synthetic)
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('keyup', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('keyup', onKey, true)
    }
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-desk-edge px-4 py-2.5">
        <span className="text-sm font-medium text-desk-text">
          Game Boy Advance
        </span>
        {romName && (
          <span className="min-w-0 truncate text-xs text-desk-muted">
            {romName}
          </span>
        )}
        <label className="ml-auto shrink-0 cursor-pointer rounded-lg bg-desk-accent px-3 py-1.5 text-xs font-medium text-white hover:brightness-110">
          {romName ? 'Load different game' : 'Load game'}
          <input type="file" accept=".gba" hidden onChange={onFile} />
        </label>
      </div>

      <div className="relative min-h-0 flex-1 bg-black">
        <div id="gba-emulator-host" ref={hostRef} className="absolute inset-0" />

        {phase === 'idle' && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <p className="text-sm text-desk-text">Load a .gba ROM to play.</p>
              <p className="mt-1 text-xs text-desk-muted">
                The ROM is read in your browser — nothing is uploaded.
              </p>
            </div>
          </div>
        )}
        {phase === 'booting' && (
          <div className="absolute inset-0 grid place-items-center">
            <p className="text-sm text-desk-muted">Starting emulator…</p>
          </div>
        )}
        {phase === 'error' && error && (
          <div className="absolute inset-0 grid place-items-center p-6">
            <p className="max-w-sm text-center text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-desk-edge px-4 py-2 text-[11px] leading-relaxed text-desk-muted">
        <span className="font-mono text-desk-text/90">
          D-pad ←↑↓→ / WASD · A&nbsp;K · B&nbsp;J · L&nbsp;U · R&nbsp;I ·
          Start&nbsp;Enter · Select&nbsp;Backspace
        </span>
        <br />
        Remap in the emulator’s ⚙ menu → Control Settings. Game saves and save
        states are stored in this browser only.
      </div>
    </div>
  )
}
