declare module 'next/cache' {
  export function cacheLife(profile: 'default' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'max'): void
  export function cacheTag(...tags: string[]): void
  export function revalidateTag(tag: string, profile: string | { expire?: number }): void
  export function revalidatePath(path: string, type?: 'page' | 'layout'): void
  export function unstable_cache<T extends Callback>(cb: T, keyParts?: string[], options?: {
    revalidate?: number | false
    tags?: string[]
  }): T
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Callback = (...args: any[]) => Promise<any>
}
