import { expect, test } from '@playwright/test'

// Mock seed: group "Office Legends" (chess) with 10 players and 3 seasons.
const SEEDED_PLAYERS = [
  'Astrid',
  'Birger',
  'Dagny',
  'Einar',
  'Gudrun',
  'Halvor',
  'Ingeborg',
  'Leif',
  'Oddvar',
  'Solveig',
]

test('shows the seeded season rankings', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Friend Rankings' })).toBeVisible()

  for (const name of SEEDED_PLAYERS) {
    await expect(
      page.getByRole('button', { name: `View match history for ${name}` }),
    ).toBeVisible()
  }
})

test('toggles between season and all-time scope', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Friend Rankings' })).toBeVisible()

  await page.getByRole('button', { name: 'Season 3' }).click()
  await page.getByRole('option', { name: /All time/ }).click()
  await expect(page.getByRole('heading', { name: 'All-Time Rankings' })).toBeVisible()

  await page.getByRole('button', { name: 'All time' }).click()
  await page.getByRole('option', { name: /Season 3/ }).click()
  await expect(page.getByRole('heading', { name: 'Friend Rankings' })).toBeVisible()
})

test('does not scroll horizontally', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Friend Rankings' })).toBeVisible()

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBe(0)
})
