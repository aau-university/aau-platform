import type { SeedResetTarget, SeedStage } from '../../lib/types'
import { seedNavigationMenus } from './navigation'
import { seedPages } from './pages'

const resetTargets = ['navigation-menus', 'pages'] as const satisfies readonly SeedResetTarget[]

export const navigationAndPagesStage: SeedStage = {
  name: 'navigation-and-pages',
  resetTargets,
  run: async ({ operations, state }) => {
    if (state.resetTarget === 'navigation-menus') return seedNavigationMenus(operations, state)
    if (state.resetTarget === 'pages') return seedPages(operations, state)

    const navigation = await seedNavigationMenus(operations, state)
    const pages = await seedPages(operations, state)
    return {
      conflict: navigation.conflict + pages.conflict,
      created: navigation.created + pages.created,
      skipped: navigation.skipped + pages.skipped,
      updated: navigation.updated + pages.updated,
    }
  },
}

export { validateNavigationFixtures, validateNavigationRows } from './navigation'
export { validatePageTopology } from './pages'
