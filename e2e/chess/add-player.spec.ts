import { expect, test } from '@playwright/test'
import { modal } from '../utils'

test('adds a new player who appears in the rankings', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Player' }).click()

  const sheet = modal(page)
  await expect(sheet.getByRole('heading', { name: 'Add Player' })).toBeVisible()
  await sheet.getByPlaceholder("Enter player's name...").fill('Playwright Pete')
  await sheet.getByRole('button', { name: 'Add Player', exact: true }).click()

  await expect(
    page.getByRole('button', { name: 'View match history for Playwright Pete' }),
  ).toBeVisible()
})
