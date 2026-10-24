import * as migration_20260809_020424_baseline from './20260809_020424_baseline'
import * as migration_20260815_025241_one_study_plan_per_program from './20260815_025241_one_study_plan_per_program'

export const migrations = [
  {
    up: migration_20260809_020424_baseline.up,
    down: migration_20260809_020424_baseline.down,
    name: '20260809_020424_baseline',
  },
  {
    up: migration_20260815_025241_one_study_plan_per_program.up,
    down: migration_20260815_025241_one_study_plan_per_program.down,
    name: '20260815_025241_one_study_plan_per_program',
  },
]
