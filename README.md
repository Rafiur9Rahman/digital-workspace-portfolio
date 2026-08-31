# Rafiur Rahman — Digital Workspace

An interactive portfolio that behaves like a futuristic desktop OS. Visitors explore
experience by opening "apps" (windows) rather than scrolling a page.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS (v3)
- Zustand — window manager + auth state
- Framer Motion — window / icon drag, open / close animation
- Supabase — admin auth + image storage (optional; see below)
- EmulatorJS + mGBA — the Game Boy Advance app, self-hosted (see below)

## Run

```bash
npm install
cp .env.example .env.local   # optional — only needed for login + Images folder
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build to dist/
npm run lint
```

The site runs fine without Supabase — the login modal and Images folder just show
a "not configured" message.

## Supabase setup (admin login + Images folder)

The **Images** desktop folder lists images from a Supabase Storage bucket. Anyone
can view them; only the signed-in admin can upload or delete. Sign in by clicking
**"Rafiur Rahman"** in the menu bar.

1. **Create a project** at [supabase.com](https://supabase.com) (free tier).

2. **`.env.local`** — copy from `.env.example` and fill in:
   - `VITE_SUPABASE_URL` — Project Settings → API → Project URL
   - `VITE_SUPABASE_ANON_KEY` — Project Settings → API → `anon` `public` key

3. **Storage bucket** — Storage → New bucket → name `images`, **Public: on**.

4. **Policies** — SQL Editor → run:

   ```sql
   create policy "public read images"
     on storage.objects for select
     using ( bucket_id = 'images' );

   create policy "admin upload images"
     on storage.objects for insert to authenticated
     with check ( bucket_id = 'images' );

   create policy "admin delete images"
     on storage.objects for delete to authenticated
     using ( bucket_id = 'images' );
   ```

5. **Admin user** — Authentication → Users → Add user:
   - Email: `rafiur9@rafiur.workspace`  (the login form maps username `Rafiur9`
     → this email; change the domain in `src/store/auth.ts` if you like)
   - Password: your choice
   - Tick **Auto Confirm User**

6. **Lock it down** — Authentication → Providers → Email → turn **off**
   "Enable sign-ups" so nobody else can register. (Passwords are hashed by
   Supabase; the anon key in the bundle is safe — RLS is what protects writes.)

## What exists (basic version)

- **Cinematic boot sequence** (`src/components/BootScreen.tsx`) — segmented "data
  block" progress bars, non-linear overall progress, rolling monospace status
  messages, `ALL SYSTEMS READY` → `WELCOME TO MY WORKSPACE` beat, polished
  scale/blur/fade hand-off to the homepage. ~5s (tune `SCRIPT_MS` / `SYSTEMS_MS` /
  `WELCOME_MS`), plays on every load, respects `prefers-reduced-motion`.
- **Desktop shell** — menu bar with clock, dock, radial-gradient wallpaper, centred
  nameplate (`src/components/Launcher.tsx`)
- **Desktop icons** (`src/components/DesktopIcons.tsx`) — scattered around the
  desktop, **draggable**, positions remembered in `localStorage` (`ws-icons-v1`).
  Double-click to open. Falls back to fixed columns under 640px. Includes an
  oversized **Images** folder.
- **Admin login** (`src/components/LoginModal.tsx`, `src/store/auth.ts`) — click
  "Rafiur Rahman" in the menu bar. Real Supabase Auth; when signed in, a dot shows
  by the name and the Images folder gains upload/delete.
- **Window manager** (`src/store/windows.ts`) — open/close/focus/minimize/maximize,
  z-ordering, drag with constraints, double-click title bar to maximize
- **Apps** in `src/apps/` (dock shows the first four; the rest open from desktop icons):
  - `AboutApp` — profile + skills
  - `ProjectsApp` — file-explorer layout, projects as case files
  - `AssistantApp` — chat UI with a **local keyword-matching stand-in** for the real
    portfolio AI (answer + "view case study" button)
  - `TerminalApp` — a real navigation layer: a command registry (`help`, `about`,
    `projects`, `open <app>`, `cd`/`ls`/`cat` over an in-memory portfolio
    filesystem, …) plus hidden easter-egg commands. History, Tab-complete,
    did-you-mean. **See [TERMINAL.md](TERMINAL.md) for the full command list,
    architecture, and the easter eggs.**
  - `ResumeApp` — one-page CV from `content.ts` + "request full CV" mailto
  - `PhotoApp` — placeholder portrait (monogram)
  - `ContactApp` — email + location
  - `ImagesApp` — Supabase-backed image gallery; admin-only upload/delete
  - `GameBoyAdvanceApp` — see below

## Game Boy Advance app

`src/apps/GameBoyAdvanceApp.tsx` runs [EmulatorJS](https://emulatorjs.org) with the
mGBA core. Fully self-hosted — no CDN at runtime.

- **Setup** — `scripts/setup-emulator.mjs` vendors EmulatorJS + the mGBA core from
  `node_modules` into `public/emulatorjs/` (~6 MB, gitignored). It runs
  automatically via `predev` / `prebuild`, or manually with `npm run setup:emulator`.
  `package.json` `overrides` pins `@emulatorjs/cores` → just `@emulatorjs/core-mgba`
  so `npm install` doesn't pull all ~47 cores (~300 MB).
- **Loading a game** — file picker for `.gba` files, read client-side; nothing is
  uploaded. Lazy-loaded (`GameBoyAdvanceApp.lazy.ts` + `<Suspense>` in `Window.tsx`)
  so it's a separate ~5 KB chunk and the emulator runtime only loads on open.
- **Saving** — in-game saves (SRAM, via EmulatorJS's `autoPersist` IDBFS) and save
  states (`EJS_defaultOptions['save-state-location'] = 'browser'`) go to IndexedDB.
  The last ROM is stored in IndexedDB too (`src/lib/gbaStorage.ts`, db `gba-app`),
  so reopening the app auto-loads it. **All per-browser / local.** "Load different
  game" swaps ROMs.
- **Controls** — D-pad on arrow keys **and** WASD (WASD is bridged to arrow
  keyCodes). Buttons: `A=K B=J L=U R=I Start=Enter Select=Backspace` (no clash with
  WASD; GBA has no X/Y). Shown in the app footer; remap via the emulator's ⚙ menu →
  Control Settings.
- **Headers** — the threaded mGBA core wants `SharedArrayBuffer`, which needs the
  page to be cross-origin isolated. `vite.config.ts` (`server` + `preview`) and
  `vercel.json` set:

  ```
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  ```

  `require-corp` (not `credentialless`) because Safari/iOS only support
  `require-corp`. The one cross-origin subresource is the Supabase Storage images,
  loaded with `crossorigin="anonymous"` (Supabase sends `Access-Control-Allow-Origin: *`),
  so they satisfy COEP. If the page isn't isolated (headers missing on the host),
  `GameBoyAdvanceApp` only requests `threads` when `crossOriginIsolated` is true,
  so it degrades to the single-threaded core instead of erroring.

  **Any production host must send both headers.** Vercel: `vercel.json` (already
  here). Netlify: a `_headers` file or `netlify.toml`. Cloudflare Pages: a
  `_headers` file. Nginx/Apache/Caddy: an `add_header` / `Header set` rule.
  **GitHub Pages cannot set headers at all** — it won't work there; use one of the
  above, or a Cloudflare Worker / `<meta>`-less service-worker shim in front of it.

### Test it

```bash
npm run dev
# open the "Game Boy Advance" desktop icon → Load game → pick a .gba homebrew ROM
```

No ROM in the repo (and don't commit one). A throwaway test ROM:

```bash
node - <<'EOF'
const { writeFileSync } = require('node:fs')
const rom = Buffer.alloc(0x100, 0)
const w = (o, v) => rom.writeUInt32LE(v >>> 0, o)
w(0x00, 0xEA00002E); rom[0xB2] = 0x96
let c = 0; for (let i = 0xA0; i <= 0xBC; i++) c = (c - rom[i]) & 0xff
rom[0xBD] = (c - 0x19) & 0xff
let p = 0xC0
for (const i of [0xE3A00404,0xE3A01406,0xE3A02C04,0xE3822003,0xE5802000,
  0xE3E03000,0xE3A04C4B,0xE4813004,0xE2544001,0x1AFFFFFC,0xEAFFFFFE]) { w(p, i); p += 4 }
writeFileSync('test.gba', rom)
EOF
# load test.gba — it fills the screen white (proves the mGBA core runs).
```

For a real game, any public-domain GBA homebrew works (e.g. from gbadev.org).

## Content

All app content lives in `src/data/content.ts` — one source of truth that every app
(and later the real AI assistant) reads from. Edit that file to change projects,
skills, activity feed, and profile.

## Next steps (see conversation plan)

- Real AI assistant: replace `answer()` in `AssistantApp.tsx` with a call to a
  backend route (`/api/ask`) using Claude or Azure OpenAI + structured output
- Route-per-app so windows are deep-linkable and SEO-friendly (likely a Next.js move)
- Mobile layout: stacked full-screen apps instead of floating windows
- Impact dashboard, "How I built this" mode, Recruiter mode
- Real project case studies as MDX
