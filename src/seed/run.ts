import { getPayload } from 'payload'
import config from '@payload-config'

import { runSeed } from './run-seed'

export async function runSeedCli(): Promise<void> {
  const payload = await getPayload({ config })

  try {
    const result = await runSeed(payload)
    payload.logger.info({
      conflict: result.conflict,
      created: result.created,
      msg: 'Seed completed',
      skipped: result.skipped,
      updated: result.updated,
    })
  } finally {
    await payload.destroy()
  }
}

await runSeedCli()
