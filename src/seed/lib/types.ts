import type { CollectionSlug, Payload, PayloadRequest } from 'payload'

import type { User } from '@/payload-types'

import type { SeedCreateArgs, SeedOperations } from './local-api'

export const seedResetTargets = [
  'team-members',
  'news',
  'events',
  'blog-posts',
  'faqs',
  'announcements',
  'centers',
  'projects',
  'research-publications',
  'campus-life',
  'offers',
  'partners',
  'navigation-menus',
  'pages',
  'site-settings',
  'about-page',
  'contact-settings',
  'smart-chat-settings',
  'navbar-settings',
  'footer-settings',
  'analytics-settings',
] as const

export type SeedResetTarget = (typeof seedResetTargets)[number]

export interface SeedCounts {
  conflict: number
  created: number
  skipped: number
  updated: number
}

export interface SeedOperationContext {
  operations: SeedOperations
  req: PayloadRequest
}

export interface SeedStageContext extends SeedOperationContext {
  createBootstrapUser: (args: Omit<SeedCreateArgs<'users'>, 'collection'>) => Promise<User>
  payload: Payload
  state: SeedRunState
}

export interface SeedRunState {
  bootstrapAdmin?: User
  created: Map<CollectionSlug, Set<number | string>>
  initializeGlobals: boolean
  resetTarget?: SeedResetTarget
}

export interface SeedStage {
  allowBootstrapUser?: boolean
  name: string
  resetTargets?: readonly SeedResetTarget[]
  run: (context: SeedStageContext) => Promise<SeedCounts>
}

export interface SeedStageSuccess extends SeedCounts {
  name: string
  status: 'success'
}

export interface SeedStageFailure extends SeedCounts {
  error: unknown
  name: string
  status: 'failed'
}

export type SeedStageResult = SeedStageFailure | SeedStageSuccess

export interface SeedRunResult extends SeedCounts {
  stages: SeedStageSuccess[]
}

export function emptySeedCounts(): SeedCounts {
  return { conflict: 0, created: 0, skipped: 0, updated: 0 }
}
