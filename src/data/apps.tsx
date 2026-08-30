import type { ComponentType } from 'react'
import { AboutApp } from '../apps/AboutApp'
import { ProjectsApp } from '../apps/ProjectsApp'
import { AssistantApp } from '../apps/AssistantApp'
import { TerminalApp } from '../apps/TerminalApp'

export type AppId = 'about' | 'projects' | 'assistant' | 'terminal'

export interface AppDef {
  id: AppId
  title: string
  icon: string
  component: ComponentType
  defaultSize: { width: number; height: number }
}

export const APPS: Record<AppId, AppDef> = {
  assistant: {
    id: 'assistant',
    title: 'AI Assistant',
    icon: '✨',
    component: AssistantApp,
    defaultSize: { width: 460, height: 520 },
  },
  projects: {
    id: 'projects',
    title: 'Projects',
    icon: '🗂️',
    component: ProjectsApp,
    defaultSize: { width: 640, height: 460 },
  },
  about: {
    id: 'about',
    title: 'About Me',
    icon: '👤',
    component: AboutApp,
    defaultSize: { width: 560, height: 480 },
  },
  terminal: {
    id: 'terminal',
    title: 'Terminal',
    icon: '▮',
    component: TerminalApp,
    defaultSize: { width: 600, height: 380 },
  },
}

export const APP_LIST: AppDef[] = [
  APPS.assistant,
  APPS.projects,
  APPS.about,
  APPS.terminal,
]
