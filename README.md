# Rafiur Rahman — Digital Workspace

An interactive portfolio that behaves like a futuristic desktop OS. Visitors explore
experience by opening "apps" (windows) rather than scrolling a page.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS (v3)
- Zustand — window manager state
- Framer Motion — window drag / open / close animation

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build to dist/
npm run lint
```

## What exists (basic version)

- **Cinematic boot sequence** (`src/components/BootScreen.tsx`) — segmented "data
  block" progress bars, non-linear overall progress, rolling monospace status
  messages, `ALL SYSTEMS READY` → `WELCOME TO MY WORKSPACE` beat, polished
  scale/blur/fade hand-off to the homepage. ~5s (tune `SCRIPT_MS` / `SYSTEMS_MS` /
  `WELCOME_MS`), plays on every load, respects `prefers-reduced-motion`.
- **Desktop shell** — menu bar with clock, dock, radial-gradient wallpaper
- **Window manager** (`src/store/windows.ts`) — open/close/focus/minimize/maximize,
  z-ordering, drag with constraints, double-click title bar to maximize
- **Launcher** — hero (name, tagline, action buttons) + activity feed, shown when no
  window is open
- **Four placeholder apps** in `src/apps/`:
  - `AboutApp` — profile + skills
  - `ProjectsApp` — file-explorer layout, projects as case files
  - `AssistantApp` — chat UI with a **local keyword-matching stand-in** for the real
    portfolio AI (answer + "view case study" button)
  - `TerminalApp` — command parser (`help`, `projects`, `skills`, `contact`, `clear`)

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
