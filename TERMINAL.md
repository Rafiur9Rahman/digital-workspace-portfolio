# Terminal

The **Terminal** app (`src/apps/TerminalApp.tsx`) is a real navigation layer for
the portfolio and a playground of hidden commands. Roughly 70% useful, 30% fun.

> ⚠️ **Maintainer reference — this file spoils every hidden command.**
> Visitors are meant to find those by experimenting.

---

## Architecture

```
src/terminal/
├── types.ts               CommandDef, CommandContext, CommandResult, OutputLine
├── registry.ts            Map<name → command>, alias resolution, visible/all lists
├── runner.ts              tokenizer, Levenshtein "did you mean", dispatch
├── autocomplete.ts        Tab completion (commands → app names → fs paths)
├── filesystem.ts          in-memory portfolio filesystem (read-only, no real disk)
├── achievements.ts        localStorage-backed achievements  (key: ws-terminal-v1)
├── useTerminalSession.ts  useReducer hook — the testable core; builds the context
├── commands/
│   ├── portfolio.ts       help, about, projects, skills, experience, certifications,
│   │                      contact, cv, github, whoami
│   ├── navigation.ts      open
│   ├── filesystem.ts      pwd, ls, cd, cat
│   └── system.ts          clear, date, echo, history, achievements, reboot, shutdown
└── easterEggs/
    ├── index.ts           matrix, coffee, 42, fortune, sudo, hack, rm, pokemon, party
    ├── data.ts            fortunes + the hack sequence
    ├── effects.tsx        <MatrixRain>, <PartyBurst>
    └── useKonami.ts       createKonamiMatcher() + the useKonami() hook
```

**Every command is `{ name, aliases?, summary, usage?, hidden?, run(ctx) }`.**
`run` is sync or async and returns a `CommandResult`:

```ts
type CommandResult =
  | void | string | string[]
  | { lines?: OutputLine[]; clear?: boolean; cwd?: string; effect?: 'matrix' | 'party' }
```

A bare `string` / `string[]` is shorthand for `output` lines. Command logic is
pure except for the explicit **context actions** — commands never touch React or
the DOM directly:

| context field | what it does |
|---|---|
| `args`, `raw` | parsed tokens / the raw line |
| `cwd`, `fs` | current dir + the read-only portfolio filesystem |
| `history` | commands run this session (incl. the current one) |
| `listCommands()` | every command, for `help` |
| `print(line)` | append a line now (async / streamed output) |
| `signal` | `AbortSignal`, aborts on unmount / `clear` |
| `reducedMotion` | skip animated buildup when the visitor prefers reduced motion |
| `openApp(id)` | open/focus a desktop window (`useWindows.openApp`) |
| `openUrl(url)` | `window.open` in a new tab |
| `reboot()` / `shutdown()` | drive `useWorkspace` — the real boot screen / a shutdown screen |
| `setCwd(path)` | move around the fake filesystem |
| `unlock(id)` | unlock an achievement |

### Adding a command

1. Add a `CommandDef` to the relevant file in `commands/` (or `easterEggs/index.ts`).
2. Export it from that module's array — the array is already wired into
   `registry.ts`.
3. `hidden: true` keeps it out of `help`, autocomplete and "did you mean".
4. Add a test in the matching `*.test.ts`.

### Output colours

Green (`text-green-400`) is **only** for success / status lines (`kind: 'system'`).
Everything else uses the normal desktop palette: `output` → text, `muted` →
dim, `error` → red, `accent` → blue (directory listings). The `matrix` egg is the
one deliberate exception.

---

## Line editing / keys

| key | action |
|---|---|
| `Enter` | run the line |
| `↑` / `↓` | previous / next command from history |
| `Tab` | autocomplete — command names, then `open <app>`, then `cd`/`ls`/`cat` paths. Multiple matches are listed. |
| `Ctrl+L` | clear the screen (same as `clear`) |
| `!!` | rerun the previous command |
| `Esc` | exit the `matrix` effect |
| click in the terminal | refocus the input (unless you're selecting text) |

A starter hint (`Try: help, projects, about`) shows on first open and disappears
after the first command.

---

## General commands (shown in `help`)

| command | aliases | what it does |
|---|---|---|
| `help` | | Lists every visible command with its summary. |
| `about` | | Name, title, tagline, location, email — from `content.ts`. |
| `projects` | | Every project: title, period, one-line summary, tech. |
| `skills` | | Skills grouped by area (Data / AI / Software). |
| `experience` | | Roles, dates, and highlights. |
| `certifications` | `certs` | Certifications with issuer + year. |
| `contact` | | Email, location, and any public links (GitHub / LinkedIn). |
| `cv` | `resume` | A condensed CV: top 3 projects by difficulty + skills. Points to `open cv` for the full document. |
| `github` | | Opens the GitHub profile in a new tab (from `content.ts` `links.github`). |
| `whoami` | | Prints `visitor`. |
| `clear` | `cls` | Clears the screen. |
| `date` | | Current date and time. |
| `echo <text>` | | Prints the text back, spacing preserved. |
| `history` | | Numbered list of commands run this session. |
| `pwd` | | Absolute path of the current directory in the fake filesystem. |
| `ls [path]` | `dir` | Lists a directory — directories first (blue, trailing `/`), then files. |
| `cd [path]` | | Change directory. No argument → `~` (root). Supports `.`, `..`, `~`, absolute and relative paths; `..` past the root clamps. The prompt updates: `visitor@rafiur:~/projects$`. |
| `cat <file>` | | Prints a file. Files that map to an app append `→ run open <app> to launch the app`. |
| `open <app>` | | Opens (or focuses, if already open) a real desktop window. |
| `achievements` | `ach` | Shows `unlocked / total`. Unlocked ones are ticked; locked ones show only their vague hint (`??? — Follow the white rabbit.`) as a breadcrumb. |

### `open` targets

Canonical app ids: `about`, `projects`, `assistant`, `terminal`, `resume`,
`photo`, `contact`, `images`, `gba`.

Friendly aliases: `cv`→resume, `pokemon`/`game`/`gameboy`→gba, `ai`→assistant,
`work`→projects, `me`→about.

`open` reuses `useWindows.openApp`, so an already-open app is focused/restored
rather than duplicated — exactly like clicking its dock/desktop icon.

---

## Fake filesystem

In-memory, read-only, **never touches the real disk**. File contents render
lazily from `content.ts`, so the tree always matches the portfolio data.

```
/
├── about.txt
├── contact.txt          → open contact
├── cv.pdf               → open resume
├── projects/
│   └── <slug>/
│       ├── readme.txt   (title, summary, role, period, difficulty)
│       ├── tech.txt
│       └── outcomes.txt
├── experience/<company>.txt
├── certifications/<name>.txt
├── skills/{data,ai,software}.txt
└── games/pokemon.gba     → open gba
```

---

## Hidden commands

Not shown in `help`, autocomplete, or "did you mean". Discover by experimenting.

| command | aliases | what it does | achievement |
|---|---|---|---|
| `matrix` | | Green "digital rain" on a canvas **inside the terminal only** (never the whole page). `Esc` or click exits. All animation frames / observers / listeners are cleaned up on exit. Under `prefers-reduced-motion` it shows a static panel instead. | **Wake Up, Neo** |
| `coffee` | `brew` | `Brewing developer fuel...` → an animated `[███░░] %` bar → `☕ Coffee ready. / Productivity +15%`. Reduced-motion skips to 100%. | |
| `42` | | *"The Answer to the Ultimate Question of Life, the Universe, and Everything."* + a towel joke. | **The Answer** |
| `fortune` | | One random developer fortune from a set of 14 in `easterEggs/data.ts`. No external API. | |
| `sudo` | | *"rafiur is not in the sudoers file. This incident will be reported."* | |
| `sudo hire rafiur` | | `Verifying credentials...` → `Access granted.` → **opens the real Contact app**. | **Root Access** |
| `hack` | | Fake sequence: `INITIALISING… / Scanning network… / Bypassing firewall… / …` → `ACCESS DENIED / Reason: you are viewing a portfolio website.` Purely visual — no network, nothing touched. | |
| `rm -rf /` | | (also matches `~`, `/*`, `-r -f`, `-fr`, …) `Deleting /projects… / /experience… / …` → `99%` → `Operation cancelled. / Nice try.` **Nothing is ever deleted or altered.** Any other `rm` → *"nice try — this exhibit is read-only."* | **Dangerous Individual** |
| `pokemon` | `pokémon` | Opens the real Game Boy Advance emulator. | |
| `party` | | Short confetti burst inside the terminal, auto-dismisses in ~2.4s. Renders nothing under `prefers-reduced-motion`. | |
| `reboot` | `restart` | Replays the **real** cinematic boot sequence (`BootScreen`), clearing open windows first. Not a re-implementation — it drives `useWorkspace`. | **Time Traveller** |
| `shutdown` | `poweroff` | Fake OS power-off screen ("It is now safe to close your browser"). **Never closes the tab.** Enter / click / the ⏻ button boots the workspace again. | |

### Konami code

Type **↑ ↑ ↓ ↓ ← → ← → B A** anywhere while the terminal is open. A `window`
keydown listener (mounted only with the terminal) that **never calls
`preventDefault`** — arrow keys still navigate history, `b`/`a` still type
normally. Fires the `party` effect + a line. → **The Old Ways**

---

## Achievements

Stored in `localStorage` under the namespaced key **`ws-terminal-v1`**
(`{ unlocked: { id: timestamp }, hiddenSeen: string[] }`). Reads degrade to
in-memory state if storage is unavailable (private mode); a corrupt value is
treated as empty.

| id | title | trigger |
|---|---|---|
| `wake-up-neo` | Wake Up, Neo | run `matrix` |
| `the-answer` | The Answer | run `42` |
| `root-access` | Root Access | `sudo hire rafiur` |
| `dangerous-individual` | Dangerous Individual | attempt `rm -rf /` |
| `time-traveller` | Time Traveller | run `reboot` |
| `konami-code` | The Old Ways | enter the Konami code |
| `curious-mind` | Curious Mind | discover **4** distinct hidden commands |

`hiddenSeen` records every hidden command the visitor has run (via `runner.ts`);
`noteHiddenDiscovery` unlocks `curious-mind` once it reaches
`CURIOUS_MIND_THRESHOLD` (4).

When any achievement unlocks during a session, a small toast slides in at the
top-right of the terminal and auto-dismisses (~3.8s). The toast is driven by a
before/after diff of `getProgress().unlocked` around each command in
`useTerminalSession`, so it catches unlocks from any path (a command's
`ctx.unlock`, the Konami handler, the `curious-mind` threshold). Run
`achievements` any time to see progress.

---

## Tests

`npm test` (Vitest). Terminal coverage:

| file | covers |
|---|---|
| `runner.test.ts` | tokenizer, `didYouMean`, dispatch + unknown-command handling |
| `registry.test.ts` | name / alias resolution, `visibleCommands` excludes hidden |
| `commands.test.ts` | every command's `run()` output, `open` aliases, fs commands, `achievements`, `reboot`/`shutdown` |
| `autocomplete.test.ts` | command / `open` / path completion, hidden never offered |
| `filesystem.test.ts` | path resolution, tree shape, lazy content, app links |
| `session.test.ts` | the reducer — history nav, cursor, clear, hint, cwd, toasts |
| `achievements.test.ts` | unlock-once, persistence, corrupt-store handling, `curious-mind` threshold |
| `easterEggs.test.ts` | every egg's behaviour + the Konami matcher |

Component rendering and the emulator are covered by a headless-browser script,
not unit tests.
