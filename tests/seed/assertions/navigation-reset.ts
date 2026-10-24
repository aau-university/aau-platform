import { expect } from 'vitest'
import type { Payload } from 'payload'

import { navigationMenuFixtures } from '@/seed/fixtures/cms'
import { expectFixtureLeaves } from './fixture-match'

export async function readNavigationMenuSnapshots(payload: Payload) {
  const [arabic, english] = await Promise.all([
    payload.find({
      collection: 'navigation-menus',
      depth: 0,
      fallbackLocale: false,
      limit: 0,
      locale: 'ar',
      overrideAccess: true,
      pagination: false,
    }),
    payload.find({
      collection: 'navigation-menus',
      depth: 0,
      fallbackLocale: false,
      limit: 0,
      locale: 'en',
      overrideAccess: true,
      pagination: false,
    }),
  ])
  return { arabic, english }
}

export type NavigationMenuSnapshots = Awaited<ReturnType<typeof readNavigationMenuSnapshots>>
export type NavigationMenuIdTopology = ReturnType<typeof navigationMenuIdTopology>

export function assertNavigationMenuFixtures(
  snapshots: NavigationMenuSnapshots,
  expectedIds?: NavigationMenuIdTopology,
): void {
  expect(snapshots.arabic.docs).toHaveLength(navigationMenuFixtures.length)
  expect(snapshots.english.docs).toHaveLength(navigationMenuFixtures.length)

  for (const fixture of navigationMenuFixtures) {
    const arabic = menuByKey(snapshots.arabic.docs, fixture.key)
    const english = menuByKey(snapshots.english.docs, fixture.key)
    expectFixtureLeaves(arabic, fixture.arabic, `navigation.${fixture.key}.ar`)
    expectFixtureLeaves(english, fixture.english, `navigation.${fixture.key}.en`)
    expect(arabic.id).toBe(english.id)
    expect(arabic.items?.map(({ id }) => id)).toEqual(english.items?.map(({ id }) => id))
    for (const [index, item] of (arabic.items ?? []).entries()) {
      expect(item.children?.map(({ id }) => id)).toEqual(
        english.items?.[index]?.children?.map(({ id }) => id),
      )
    }
  }

  if (expectedIds) expect(navigationMenuIdTopology(snapshots)).toEqual(expectedIds)
}

export async function corruptNavigationMenusForReset(payload: Payload) {
  const snapshots = await readNavigationMenuSnapshots(payload)
  const ids = navigationMenuIdTopology(snapshots)

  for (const fixture of navigationMenuFixtures) {
    const arabic = menuByKey(snapshots.arabic.docs, fixture.key)
    const english = menuByKey(snapshots.english.docs, fixture.key)
    await payload.update({
      collection: 'navigation-menus',
      context: { disableRevalidate: true },
      data: {
        isPublished: false,
        items: (arabic.items ?? []).map((item, index) => ({
          ...item,
          children: (item.children ?? []).map((child, childIndex) => ({
            ...child,
            description: `EDITOR AR DESCRIPTION ${fixture.key} ${index}.${childIndex}`,
            label: `EDITOR AR CHILD ${fixture.key} ${index}.${childIndex}`,
            openInNewTab: true,
            order: 700 + childIndex,
          })),
          group: 'editor-group',
          label: `EDITOR AR PARENT ${fixture.key} ${index}`,
          openInNewTab: true,
          order: 800 + index,
          showInMore: true,
        })),
      },
      fallbackLocale: false,
      id: arabic.id,
      locale: 'ar',
      overrideAccess: true,
    })
    await payload.update({
      collection: 'navigation-menus',
      context: { disableRevalidate: true },
      data: {
        items: (english.items ?? []).map((item, index) => ({
          children: (item.children ?? []).map((child, childIndex) => ({
            description: `EDITOR EN DESCRIPTION ${fixture.key} ${index}.${childIndex}`,
            id: child.id,
            label: `EDITOR EN CHILD ${fixture.key} ${index}.${childIndex}`,
          })),
          id: item.id,
          label: `EDITOR EN PARENT ${fixture.key} ${index}`,
        })),
      },
      fallbackLocale: false,
      id: english.id,
      locale: 'en',
      overrideAccess: true,
    })
  }

  return { ids }
}

export async function assertNavigationMenusReset(
  payload: Payload,
  expected: Awaited<ReturnType<typeof corruptNavigationMenusForReset>>,
): Promise<void> {
  assertNavigationMenuFixtures(await readNavigationMenuSnapshots(payload), expected.ids)
}

function navigationMenuIdTopology(snapshots: NavigationMenuSnapshots) {
  return navigationMenuFixtures.map((fixture) => {
    const menu = menuByKey(snapshots.arabic.docs, fixture.key)
    return {
      id: menu.id,
      items: (menu.items ?? []).map(({ children, id, url }) => ({
        children: (children ?? []).map(({ id: childId, url: childUrl }) => ({
          id: childId,
          url: childUrl,
        })),
        id,
        url,
      })),
      key: fixture.key,
    }
  })
}

function menuByKey<TDocument extends { key: string }>(
  docs: TDocument[],
  key: string,
): TDocument {
  const menu = docs.find((doc) => doc.key === key)
  if (!menu) throw new Error(`Missing navigation menu: ${key}`)
  return menu
}
