import type { SeedStage } from '../lib/types'
import { academicContentStage } from './academic-content'
import { bootstrapAdminStage } from './bootstrap-admin'
import {
  editorialContentStage,
  keylessContentStage,
  marketingContentStage,
  servicesContentStage,
  teamMembersStage,
} from './content'
import { departmentHeadsStage } from './department-heads'
import { departmentsStage } from './departments'
import { globalsStage } from './globals'
import { navigationAndPagesStage } from './navigation-and-pages'
import { optionalUsersStage } from './optional-users'
import { programsStage } from './programs'
import { rolesStage } from './roles'
import { taxonomyStage } from './taxonomy'

export const defaultSeedStages = [
  rolesStage,
  bootstrapAdminStage,
  taxonomyStage,
  optionalUsersStage,
  departmentsStage,
  programsStage,
  academicContentStage,
  departmentHeadsStage,
  teamMembersStage,
  editorialContentStage,
  servicesContentStage,
  marketingContentStage,
  keylessContentStage,
  navigationAndPagesStage,
  globalsStage,
] as const satisfies readonly SeedStage[]
