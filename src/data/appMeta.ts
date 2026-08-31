/* React-free app metadata. Split out from apps.tsx so modules that only need
   ids / titles / icons (the terminal's `open` command, autocomplete, the file
   explorer) can import it without pulling in every app component — which would
   create an import cycle (apps.tsx → an app → back to apps). */

export type AppId =
  | 'about'
  | 'projects'
  | 'assistant'
  | 'terminal'
  | 'files'
  | 'resume'
  | 'photo'
  | 'contact'
  | 'images'
  | 'gba'

/** id → window title. The single source of truth for app titles. */
export const APP_TITLES: Record<AppId, string> = {
  assistant: 'AI Assistant',
  files: 'Files',
  projects: 'Projects',
  about: 'About Me',
  terminal: 'Terminal',
  resume: 'resume.pdf',
  photo: 'profile.jpg',
  contact: 'contact.txt',
  images: 'Images',
  gba: 'Game Boy Advance',
}

/** id → icon (emoji). Single source of truth. */
export const APP_ICONS: Record<AppId, string> = {
  assistant: '✨',
  files: '📂',
  projects: '🗂️',
  about: '👤',
  terminal: '⌨️',
  resume: '📄',
  photo: '🖼️',
  contact: '📝',
  images: '📁',
  gba: '🎮',
}

export const APP_IDS = Object.keys(APP_TITLES) as AppId[]
