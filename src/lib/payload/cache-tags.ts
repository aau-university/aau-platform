import { cacheLife, cacheTag } from 'next/cache'

import { PUBLIC_CACHE_TAG } from './cache-tag-names'

export {
  collectionCacheTag,
  globalCacheTag,
  pageCacheTag,
  PUBLIC_CACHE_TAG,
} from './cache-tag-names'

export function applyPublicCacheTags(...tags: string[]): void {
  try {
    cacheLife('minutes')
    cacheTag(PUBLIC_CACHE_TAG, ...tags)
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      throw err
    }
  }
}
