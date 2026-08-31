import type { ComponentType, LazyExoticComponent } from 'react'
import { APP_TITLES, type AppId } from './appMeta'
import { AboutApp } from '../apps/AboutApp'
import { ProjectsApp } from '../apps/ProjectsApp'
import { AssistantApp } from '../apps/AssistantApp'
import { TerminalApp } from '../apps/TerminalApp'
import { ResumeApp } from '../apps/ResumeApp'
import { PhotoApp } from '../apps/PhotoApp'
import { ContactApp } from '../apps/ContactApp'
import { ImagesApp } from '../apps/ImagesApp'
// Lazy — the emulator glue + its ~570KB self-hosted runtime load only on open.
import { GameBoyAdvanceAppLazy } from '../apps/GameBoyAdvanceApp.lazy'

export type { AppId }

export interface AppDef {
  id: AppId
  title: string
  icon: string
  component: ComponentType | LazyExoticComponent<ComponentType>
  defaultSize: { width: number; height: number }
}

export const APPS: Record<AppId, AppDef> = {
  assistant: {
    id: 'assistant',
    title: APP_TITLES.assistant,
    icon: '✨',
    component: AssistantApp,
    defaultSize: { width: 460, height: 520 },
  },
  projects: {
    id: 'projects',
    title: APP_TITLES.projects,
    icon: '🗂️',
    component: ProjectsApp,
    defaultSize: { width: 640, height: 460 },
  },
  about: {
    id: 'about',
    title: APP_TITLES.about,
    icon: '👤',
    component: AboutApp,
    defaultSize: { width: 560, height: 480 },
  },
  terminal: {
    id: 'terminal',
    title: APP_TITLES.terminal,
    icon: '▮',
    component: TerminalApp,
    defaultSize: { width: 680, height: 460 },
  },
  resume: {
    id: 'resume',
    title: APP_TITLES.resume,
    icon: '📄',
    component: ResumeApp,
    defaultSize: { width: 460, height: 540 },
  },
  photo: {
    id: 'photo',
    title: APP_TITLES.photo,
    icon: '🖼️',
    component: PhotoApp,
    defaultSize: { width: 360, height: 400 },
  },
  contact: {
    id: 'contact',
    title: APP_TITLES.contact,
    icon: '📝',
    component: ContactApp,
    defaultSize: { width: 380, height: 300 },
  },
  images: {
    id: 'images',
    title: APP_TITLES.images,
    icon: '🖼️',
    component: ImagesApp,
    defaultSize: { width: 640, height: 500 },
  },
  gba: {
    id: 'gba',
    title: APP_TITLES.gba,
    icon: '🎮',
    component: GameBoyAdvanceAppLazy,
    defaultSize: { width: 760, height: 620 },
  },
}

/* Apps shown in the dock (the desktop icons cover the rest). */
export const APP_LIST: AppDef[] = [
  APPS.assistant,
  APPS.projects,
  APPS.about,
  APPS.terminal,
]
