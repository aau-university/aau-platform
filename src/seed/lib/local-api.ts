import type {
  CollectionSlug,
  GlobalSlug,
  PaginatedDocs,
  Payload,
  PayloadRequest,
  RequiredDataFromCollectionSlug,
  TypedLocale,
  Where,
} from 'payload'

import type { Config } from '@/payload-types'

type SeedDeepPartial<T> = T extends readonly (infer TItem)[]
  ? SeedDeepPartial<TItem>[]
  : T extends object
    ? { [TKey in keyof T]?: SeedDeepPartial<T[TKey]> }
    : T

export interface SeedFindArgs<TSlug extends CollectionSlug> {
  collection: TSlug
  depth?: number
  draft?: boolean
  limit?: number
  locale?: TypedLocale
  pagination?: boolean
  sort?: string | string[]
  showHiddenFields?: boolean
  where?: Where
}

export interface SeedCreateArgs<TSlug extends CollectionSlug> {
  collection: TSlug
  data: RequiredDataFromCollectionSlug<TSlug>
  locale?: TypedLocale
}

export interface SeedUpdateArgs<TSlug extends CollectionSlug> {
  collection: TSlug
  data: SeedDeepPartial<RequiredDataFromCollectionSlug<TSlug>>
  id: number | string
  locale?: TypedLocale
}

export interface SeedReplaceArgs<TSlug extends CollectionSlug> {
  collection: TSlug
  data: RequiredDataFromCollectionSlug<TSlug>
  id: number | string
  locale?: TypedLocale
}

export interface SeedFindGlobalArgs<TSlug extends GlobalSlug> {
  depth?: number
  draft?: boolean
  locale?: TypedLocale
  slug: TSlug
}

export type SeedFindAllLocalesArgs<TSlug extends CollectionSlug> = Omit<
  SeedFindArgs<TSlug>,
  'locale'
>

export type SeedFindGlobalAllLocalesArgs<TSlug extends GlobalSlug> = Omit<
  SeedFindGlobalArgs<TSlug>,
  'locale'
>

export interface SeedAllLocalesDocument {
  id: number | string
  [field: string]: unknown
}

export interface SeedUpdateGlobalArgs<TSlug extends GlobalSlug> {
  data: SeedDeepPartial<Omit<Config['globals'][TSlug], 'id'>>
  locale?: TypedLocale
  slug: TSlug
}

export interface SeedOperations {
  create<TSlug extends CollectionSlug>(
    args: SeedCreateArgs<TSlug>,
  ): Promise<Config['collections'][TSlug]>
  find<TSlug extends CollectionSlug>(
    args: SeedFindArgs<TSlug>,
  ): Promise<PaginatedDocs<Config['collections'][TSlug]>>
  findAllLocales<TSlug extends CollectionSlug>(
    args: SeedFindAllLocalesArgs<TSlug>,
  ): Promise<PaginatedDocs<SeedAllLocalesDocument>>
  findGlobal<TSlug extends GlobalSlug>(
    args: SeedFindGlobalArgs<TSlug>,
  ): Promise<Config['globals'][TSlug]>
  findGlobalAllLocales<TSlug extends GlobalSlug>(
    args: SeedFindGlobalAllLocalesArgs<TSlug>,
  ): Promise<SeedAllLocalesDocument>
  update<TSlug extends CollectionSlug>(
    args: SeedUpdateArgs<TSlug>,
  ): Promise<Config['collections'][TSlug]>
  update<TSlug extends CollectionSlug>(
    args: SeedReplaceArgs<TSlug>,
  ): Promise<Config['collections'][TSlug]>
  updateGlobal<TSlug extends GlobalSlug>(
    args: SeedUpdateGlobalArgs<TSlug>,
  ): Promise<Config['globals'][TSlug]>
}

export function createSeedOperations(payload: Payload, req: PayloadRequest): SeedOperations {
  const fixedOptions = {
    context: req.context,
    fallbackLocale: false as const,
    overrideAccess: true as const,
    req,
  }

  async function update<TSlug extends CollectionSlug>(
    args: SeedUpdateArgs<TSlug> | SeedReplaceArgs<TSlug>,
  ): Promise<Config['collections'][TSlug]> {
    const operation = payload.update as unknown as (
      options: (SeedUpdateArgs<TSlug> | SeedReplaceArgs<TSlug>) & typeof fixedOptions,
    ) => Promise<Config['collections'][TSlug]>
    return operation.call(payload, { ...args, ...fixedOptions })
  }

  async function updateGlobal<TSlug extends GlobalSlug>(
    args: SeedUpdateGlobalArgs<TSlug>,
  ): Promise<Config['globals'][TSlug]> {
    const operation = payload.updateGlobal as unknown as (
      options: SeedUpdateGlobalArgs<TSlug> & typeof fixedOptions,
    ) => Promise<Config['globals'][TSlug]>
    return operation.call(payload, { ...args, ...fixedOptions })
  }

  return {
    create: (args) => payload.create({ ...args, ...fixedOptions }),
    find: (args) => payload.find({ ...args, ...fixedOptions }),
    findAllLocales: async (args) =>
      (await payload.find({
        ...args,
        ...fixedOptions,
        locale: 'all',
      })) as unknown as PaginatedDocs<SeedAllLocalesDocument>,
    findGlobal: (args) => payload.findGlobal({ ...args, ...fixedOptions }),
    findGlobalAllLocales: async (args) =>
      (await payload.findGlobal({
        ...args,
        ...fixedOptions,
        locale: 'all',
      })) as unknown as SeedAllLocalesDocument,
    update,
    updateGlobal,
  }
}
