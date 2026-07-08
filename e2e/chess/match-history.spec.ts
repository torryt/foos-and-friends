import { expect, test } from '@playwright/test'

test('shows the seeded match history', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Match History' }).click()

  await expect(page.getByRole('heading', { name: 'Recent Games' })).toBeVisible()
  await expect(page.getByText('Completed').first()).toBeVisible()
  await expect(page.getByText(/wins!/).first()).toBeVisible()
})

test('opens a player profile from the rankings', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'View match history for Astrid' }).click()

  await expect(page).toHaveURL(/\/players\//)
  await expect(page.getByRole('heading', { name: 'Astrid', level: 1 })).toBeVisible()
  await expect(page.getByText(/ELO · Season 3/)).toBeVisible()
})
