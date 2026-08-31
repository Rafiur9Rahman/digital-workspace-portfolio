import type { ComponentType, LazyExoticComponent } from 'react'
import { APP_ICONS, APP_TITLES, type AppId } from './appMeta'
import { AboutApp } from '../apps/AboutApp'
import { ProjectsApp } from '../apps/ProjectsApp'
import { AssistantApp } from '../apps/AssistantApp'
import { TerminalApp } from '../apps/TerminalApp'
import { FilesApp } from '../apps/FilesApp'
import { ResumeApp } from '../apps/ResumeApp'
import { PhotoApp } from '../apps/PhotoApp'
import { ContactApp } from '../apps/ContactApp'
import { ImagesApp } from '../apps/ImagesApp'
// Lazy - the emulator glue + its ~570KB self-hosted runtime load only on open.
import { GameBoyAdvanceAppLazy } from '../apps/GameBoyAdvanceApp.lazy'

export type { AppId }

export interface AppDef {
  id: AppId
  title: string
  icon: string
  component: ComponentType | LazyExoticComponent<ComponentType>
  defaultSize: { width: number; height: number }
}

const meta = (
  id: AppId,
  component: AppDef['component'],
  defaultSize: AppDef['defaultSize'],
): AppDef => ({ id, title: APP_TITLES[id], icon: APP_ICONS[id], component, defaultSize })

export const APPS: Record<AppId, AppDef> = {
  assistant: meta('assistant', AssistantApp, { width: 460, height: 520 }),
  files: meta('files', FilesApp, { width: 560, height: 440 }),
  projects: meta('projects', ProjectsApp, { width: 640, height: 460 }),
  about: meta('about', AboutApp, { width: 560, height: 480 }),
  terminal: meta('terminal', TerminalApp, { width: 680, height: 460 }),
  resume: meta('resume', ResumeApp, { width: 460, height: 540 }),
  photo: meta('photo', PhotoApp, { width: 360, height: 400 }),
  contact: meta('contact', ContactApp, { width: 380, height: 300 }),
  images: meta('images', ImagesApp, { width: 640, height: 500 }),
  gba: meta('gba', GameBoyAdvanceAppLazy, { width: 760, height: 620 }),
}

/* Apps shown in the dock (the file explorer + desktop icons cover the rest). */
export const APP_LIST: AppDef[] = [
  APPS.assistant,
  APPS.files,
  APPS.projects,
  APPS.about,
  APPS.terminal,
]
