import type { DataFromGlobalSlug, GlobalSlug } from 'payload'

type Builtin = bigint | boolean | Date | null | number | RegExp | string | symbol | undefined

export type FixtureDeepPartial<T> = T extends Builtin
  ? T
  : T extends ReadonlyArray<infer Item>
    ? Array<FixtureDeepPartial<Item>>
    : T extends object
      ? { [Key in keyof T]?: FixtureDeepPartial<T[Key]> }
      : T

export type GlobalFixtureData<TSlug extends GlobalSlug> = FixtureDeepPartial<
  Omit<DataFromGlobalSlug<TSlug>, 'createdAt' | 'id' | 'updatedAt'>
>

type ResolveSection<TResolve> = TResolve extends undefined
  ? { resolve?: never }
  : { resolve: TResolve }

export type LocalizedGlobalFixture<
  TSlug extends GlobalSlug,
  TResolve = undefined,
> = ResolveSection<TResolve> & {
  shared: GlobalFixtureData<TSlug>
  ar: GlobalFixtureData<TSlug>
  en: GlobalFixtureData<TSlug>
}

export type SharedGlobalFixture<
  TSlug extends GlobalSlug,
  TResolve = undefined,
> = ResolveSection<TResolve> & {
  shared: GlobalFixtureData<TSlug>
}
