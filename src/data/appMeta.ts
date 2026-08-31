/* React-free app metadata. Split out from apps.tsx so modules that only need
   ids/titles (the terminal's `open` command, autocomplete, the filesystem) can
   import it without pulling in every app component — which would create an
   import cycle (apps.tsx → TerminalApp → terminal registry → back to apps). */

export type AppId =
  | 'about'
  | 'projects'
  | 'assistant'
  | 'terminal'
  | 'resume'
  | 'photo'
  | 'contact'
  | 'images'
  | 'gba'

/** id → window title. The single source of truth for app titles. */
export const APP_TITLES: Record<AppId, string> = {
  assistant: 'AI Assistant',
  projects: 'Projects',
  about: 'About Me',
  terminal: 'Terminal',
  resume: 'resume.pdf',
  photo: 'profile.jpg',
  contact: 'contact.txt',
  images: 'Images',
  gba: 'Game Boy Advance',
}

export const APP_IDS = Object.keys(APP_TITLES) as AppId[]
