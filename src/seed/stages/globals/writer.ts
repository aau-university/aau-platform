import type { GlobalSlug } from 'payload'

import { graftLocalizedRowIds, type RowIdGraftSchema } from '../../lib/localized-row-ids'
import { splitGlobalSnapshot } from '../../lib/localized-global-snapshot'
import type {
  SeedAllLocalesDocument,
  SeedOperations,
  SeedUpdateGlobalArgs,
} from '../../lib/local-api'

type GlobalData<TSlug extends GlobalSlug> = SeedUpdateGlobalArgs<TSlug>['data']
type LocalizedGlobalSlug =
  | 'site-settings'
  | 'about-page'
  | 'contact-settings'
  | 'footer-settings'

export async function writeSharedGlobal<TSlug extends GlobalSlug>({
  data,
  operations,
  slug,
}: {
  data: GlobalData<TSlug>
  operations: SeedOperations
  slug: TSlug
}): Promise<void> {
  await operations.updateGlobal({ data, slug })
}

export async function writeLocalizedGlobal<TSlug extends LocalizedGlobalSlug>({
  arabic,
  english,
  operations,
  rowSchema,
  slug,
  snapshot,
}: {
  arabic: GlobalData<TSlug>
  english: GlobalData<TSlug>
  operations: SeedOperations
  rowSchema?: RowIdGraftSchema
  slug: TSlug
  snapshot: SeedAllLocalesDocument
}): Promise<void> {
  const split = splitGlobalSnapshot(slug, snapshot, arabic, english)
  if (rowSchema) validateExistingRows(split.arabic, split.english, arabic, english, rowSchema)

  const arabicData = rowSchema
    ? graftRowsOrAllowEmpty(split.arabic, arabic, rowSchema)
    : arabic
  const updatedArabic = await operations.updateGlobal({ data: arabicData, locale: 'ar', slug })
  const englishData = rowSchema
    ? graftLocalizedRowIds(updatedArabic, english, rowSchema)
    : english
  await operations.updateGlobal({ data: englishData, locale: 'en', slug })
}

function validateExistingRows<TSlug extends GlobalSlug>(
  arabicSnapshot: SeedAllLocalesDocument,
  englishSnapshot: SeedAllLocalesDocument,
  arabic: GlobalData<TSlug>,
  english: GlobalData<TSlug>,
  schema: RowIdGraftSchema,
): void {
  graftRowsOrAllowEmpty(arabicSnapshot, arabic, schema)
  graftRowsOrAllowEmpty(englishSnapshot, english, schema)
}

function graftRowsOrAllowEmpty<TTarget extends object>(
  snapshot: SeedAllLocalesDocument,
  target: TTarget,
  schema: RowIdGraftSchema,
): TTarget {
  const hasExistingRows = Object.keys(schema).some((field) => {
    const value = snapshot[field]
    return Array.isArray(value) && value.length > 0
  })
  return hasExistingRows ? graftLocalizedRowIds(snapshot, target, schema) : target
}
