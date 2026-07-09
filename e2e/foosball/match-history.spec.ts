import { expect, test } from '@playwright/test'
import { scoreText, visibleText } from '../utils'

test('shows the seeded match history', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Match History' }).click()

  await expect(page.getByRole('heading', { name: 'Recent Games' })).toBeVisible()
  // A match score is shown in both the mobile row and desktop card layouts
  await expect(visibleText(page, scoreText('\\d+', '\\d+'))).toBeVisible()
})

test('filters match history by player', async ({ page }) => {
  await page.goto('/matches')
  await expect(page.getByRole('heading', { name: 'Recent Games' })).toBeVisible()

  await page.getByRole('button', { name: 'Filter by player' }).click()
  // The filter chips live in the flex-wrap panel; match rows also mention players
  await page.locator('.flex.flex-wrap').getByRole('button', { name: 'Astrid' }).click()

  await expect(page.getByRole('heading', { name: "Astrid's Games" })).toBeVisible()
  await expect(visibleText(page, scoreText('\\d+', '\\d+'))).toBeVisible()
})
