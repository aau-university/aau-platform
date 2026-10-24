import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { createPreviewFixtures, deletePreviewFixtures } from '../helpers/previewFixtures'
import {
  createPublicRoutesFixtures,
  deletePublicRoutesFixtures,
} from '../helpers/publicRoutesFixtures'

export default async function globalSetup() {
  const payload = await getPayload({ config })
  try {
    await createPreviewFixtures(payload)
    await createPublicRoutesFixtures(payload)
  } catch (error) {
    try {
      await deletePublicRoutesFixtures(payload)
      await deletePreviewFixtures(payload)
    } finally {
      await payload.destroy()
    }
    throw error
  }

  return async () => {
    try {
      await deletePublicRoutesFixtures(payload)
    } finally {
      try {
        await deletePreviewFixtures(payload)
      } finally {
        await payload.destroy()
      }
    }
  }
}
