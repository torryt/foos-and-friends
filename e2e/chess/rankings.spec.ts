import { expect, test } from '@playwright/test'

// Mock seed: group "Office Legends" (chess) with 12 players and 3 seasons.
// Solveig sits out Season 3; Torstein and Ragnhild never play, so all three
// are hidden in the default Season 3 view until revealed.
const ACTIVE_PLAYERS = [
  'Astrid',
  'Birger',
  'Dagny',
  'Einar',
  'Gudrun',
  'Halvor',
  'Ingeborg',
  'Leif',
  'Oddvar',
]
const HIDDEN_PLAYERS = ['Solveig', 'Torstein', 'Ragnhild']

test('shows the seeded season rankings', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Friend Rankings' })).toBeVisible()

  for (const name of ACTIVE_PLAYERS) {
    await expect(
      page.getByRole('button', { name: `View match history for ${name}` }),
    ).toBeVisible()
  }
})

test('hides players without games until revealed', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Friend Rankings' })).toBeVisible()

  for (const name of HIDDEN_PLAYERS) {
    await expect(
      page.getByRole('button', { name: `View match history for ${name}` }),
    ).toBeHidden()
  }

  await page.getByRole('button', { name: 'Show 3 players without games' }).click()

  for (const name of HIDDEN_PLAYERS) {
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
