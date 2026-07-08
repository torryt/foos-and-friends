import { expect, test } from '@playwright/test'

test('shows the seeded match history', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Match History' }).click()

  await expect(page.getByRole('heading', { name: 'Recent Games' })).toBeVisible()
  await expect(page.getByText('Final Score').first()).toBeVisible()
  await expect(page.getByText('Completed').first()).toBeVisible()
})

test('filters match history by player', async ({ page }) => {
  await page.goto('/matches')
  await expect(page.getByRole('heading', { name: 'Recent Games' })).toBeVisible()

  await page.getByRole('button', { name: 'Filter by player' }).click()
  // The filter chips live in the flex-wrap panel; match rows also mention players
  await page.locator('.flex.flex-wrap').getByRole('button', { name: 'Astrid' }).click()

  await expect(page.getByRole('heading', { name: "Astrid's Games" })).toBeVisible()
  await expect(page.getByText('Final Score').first()).toBeVisible()
})
