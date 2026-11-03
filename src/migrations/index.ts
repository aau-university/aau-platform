import * as migration_20260809_020424_baseline from './20260809_020424_baseline'
import * as migration_20260815_025241_one_study_plan_per_program from './20260815_025241_one_study_plan_per_program'
import * as migration_20261103_172221_payload_3_90_security_upgrade from './20261103_172221_payload_3_90_security_upgrade'

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
  {
    up: migration_20261103_172221_payload_3_90_security_upgrade.up,
    down: migration_20261103_172221_payload_3_90_security_upgrade.down,
    name: '20261103_172221_payload_3_90_security_upgrade',
  },
]
