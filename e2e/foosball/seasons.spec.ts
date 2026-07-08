import { expect, test } from '@playwright/test'
import { modal } from '../utils'

test('switches to an archived season and back to live', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Friend Rankings' })).toBeVisible()

  // Season pill in the header opens the season sheet
  await page.getByRole('button', { name: 'Season 3 (live)' }).click()

  const sheet = modal(page)
  await expect(sheet.getByRole('heading', { name: 'Seasons' })).toBeVisible()
  await expect(sheet.getByText('LIVE', { exact: true })).toBeVisible()
  await expect(sheet.getByText('ENDED', { exact: true })).toHaveCount(2)

  await sheet.getByRole('button', { name: /Season 2/ }).click()

  // Archived state: banner shown, recording disabled, final standings
  await expect(page.getByText(/· ended/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Final Standings' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add Match' })).toBeHidden()

  await page.getByRole('button', { name: 'Back to live ›' }).click()
  await expect(page.getByRole('heading', { name: 'Friend Rankings' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add Match' })).toBeVisible()
})
