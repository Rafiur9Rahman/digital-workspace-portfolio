// Single source of truth. Every app (and later the real AI assistant) reads from here.

export const profile = {
  name: 'Rafiur Rahman',
  title: 'Consultant • Data • AI • Software',
  tagline: 'I build data and AI products end to end — from messy source systems to shipped features.',
  location: 'United Kingdom',
  email: 'rafiurrahman1234@icloud.com',
}

export interface Project {
  slug: string
  title: string
  summary: string
  role: string
  period: string
  tech: string[]
  categories: string[]
  difficulty: 1 | 2 | 3 | 4 | 5
  outcomes: string[]
}

export const projects: Project[] = [
  {
    slug: 'semantic-document-search',
    title: 'Semantic Document Search',
    summary:
      'Natural-language search over a large internal document store using embeddings and a vector index.',
    role: 'Lead developer',
    period: '2026',
    tech: ['Azure OpenAI', 'Python', 'pgvector', 'FastAPI'],
    categories: ['AI', 'Data'],
    difficulty: 5,
    outcomes: [
      'Cut document lookup time from minutes to seconds',
      'Adopted by 3 internal teams',
    ],
  },
  {
    slug: 'analytics-pipeline',
    title: 'Automated Analytics Pipeline',
    summary:
      'Replaced manual spreadsheet reporting with a scheduled pipeline and a live dashboard.',
    role: 'Data consultant',
    period: '2025',
    tech: ['dbt', 'Snowflake', 'Airflow', 'Power BI'],
    categories: ['Data'],
    difficulty: 3,
    outcomes: ['Saved ~10 analyst hours per week', 'Single source of truth for KPIs'],
  },
  {
    slug: 'this-portfolio',
    title: 'This Portfolio',
    summary:
      'An interactive "digital workspace" portfolio with a window manager, apps, and a portfolio AI.',
    role: 'Designer & developer',
    period: '2026',
    tech: ['React', 'TypeScript', 'Zustand', 'Framer Motion', 'Tailwind'],
    categories: ['Software', 'AI'],
    difficulty: 2,
    outcomes: ['The portfolio is itself a portfolio project'],
  },
]

export interface ActivityItem {
  when: string
  label: string
}

export const activity: ActivityItem[] = [
  { when: '17:31', label: 'Built semantic document search' },
  { when: '16:42', label: 'Experimented with Azure OpenAI' },
  { when: 'Yesterday', label: 'Shipped new portfolio feature' },
  { when: '2026', label: 'Completed AI certification' },
]

export const skills: Record<string, string[]> = {
  'Data': ['SQL', 'dbt', 'Snowflake', 'Airflow', 'Power BI'],
  'AI': ['Azure OpenAI', 'Embeddings / RAG', 'Prompt engineering', 'LangChain'],
  'Software': ['React', 'TypeScript', 'Python', 'FastAPI', 'Git'],
}

export interface ExperienceItem {
  company: string
  role: string
  period: string
  location?: string
  highlights: string[]
}

/* PLACEHOLDER — replace with real roles. Everything that shows work history
   (the `experience` terminal command, the CV command, the /experience folder in
   the terminal filesystem) reads from this array. */
export const experience: ExperienceItem[] = [
  {
    company: 'Placeholder Consulting',
    role: 'Data & AI Consultant',
    period: '2024 — Present',
    location: 'United Kingdom',
    highlights: [
      'Led delivery of a semantic document search platform adopted by several internal teams.',
      'Built automated analytics pipelines that replaced manual spreadsheet reporting.',
    ],
  },
  {
    company: 'Placeholder Software Co.',
    role: 'Software Engineer',
    period: '2022 — 2024',
    highlights: ['Shipped internal tools and data services used across the business.'],
  },
]

export interface Certification {
  name: string
  issuer: string
  year: string
  credentialUrl?: string
}

/* PLACEHOLDER — replace with real certifications. */
export const certifications: Certification[] = [
  { name: 'Placeholder AI Engineering Certificate', issuer: 'Placeholder Institute', year: '2026' },
  { name: 'Placeholder Cloud Data Certificate', issuer: 'Placeholder Cloud', year: '2025' },
]

/* External links. An empty string means "not published yet" — commands and apps
   handle that gracefully. `cv` is a path/URL to a PDF once one exists. */
export const links = {
  github: 'https://github.com/Rafiur9Rahman',
  linkedin: '',
  repo: 'https://github.com/Rafiur9Rahman/digital-workspace-portfolio',
  cv: '',
}
