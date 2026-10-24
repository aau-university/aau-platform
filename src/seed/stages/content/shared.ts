import type { SeedResetTarget } from '../../lib/types'

export function shouldSeed(
  resetTarget: SeedResetTarget | undefined,
  collection: SeedResetTarget,
): boolean {
  return resetTarget === undefined || resetTarget === collection
}
