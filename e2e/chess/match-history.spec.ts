import { expect, test } from '@playwright/test'
import { visibleText } from '../utils'

test('shows the seeded match history', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Match History' }).click()

  await expect(page.getByRole('heading', { name: 'Recent Games' })).toBeVisible()
  // Desktop cards announce results as "X wins!"; mobile rows show 1–0 / ½–½
  await expect(visibleText(page, /wins!|1\s*[–-]\s*0|½/)).toBeVisible()
})

test('opens a player profile from the rankings', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'View match history for Astrid' }).click()

  await expect(page).toHaveURL(/\/players\//)
  await expect(page.getByRole('heading', { name: 'Astrid', level: 1 })).toBeVisible()
  await expect(page.getByText(/ELO · Season 3/)).toBeVisible()
})
