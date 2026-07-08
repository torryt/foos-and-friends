import { expect, test } from '@playwright/test'

test('opens a player profile from the rankings', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'View match history for Astrid' }).click()

  await expect(page).toHaveURL(/\/players\//)
  await expect(page.getByRole('heading', { name: 'Astrid', level: 1 })).toBeVisible()
  await expect(page.getByText(/ELO · Season 3/)).toBeVisible()
  await expect(page.getByText(/all-time/)).toBeVisible()
  await expect(page.getByText('Total Matches')).toBeVisible()
})
