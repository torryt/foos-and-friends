import { expect, type Locator, type Page, test } from '@playwright/test'
import { modal, newestMatchCard, visibleText } from '../utils'

const startMatch = async (page: Page, white: string, black: string): Promise<Locator> => {
  await page.getByRole('button', { name: 'Add Match' }).click()

  const sheet = modal(page)
  await expect(sheet.getByRole('heading', { name: 'Add Match' })).toBeVisible()
  await sheet.getByRole('button', { name: 'Select Players' }).click()

  // White slot, then Black slot (empty slots read "Select Player")
  await sheet.getByRole('button', { name: 'Select Player', exact: true }).first().click()
  await expect(sheet.getByRole('heading', { name: 'Select White' })).toBeVisible()
  await sheet.getByRole('button', { name: white }).click()

  await sheet.getByRole('button', { name: 'Select Player', exact: true }).click()
  await expect(sheet.getByRole('heading', { name: 'Select Black' })).toBeVisible()
  await sheet.getByRole('button', { name: black }).click()

  await sheet.getByRole('button', { name: 'Continue' }).click()
  await expect(sheet.getByRole('heading', { name: 'Result?' })).toBeVisible()
  return sheet
}

test('registers a decisive 1v1 match', async ({ page }) => {
  await page.goto('/')
  const sheet = await startMatch(page, 'Astrid', 'Birger')

  await sheet.getByRole('button', { name: /Astrid \(White/ }).click()
  await sheet.getByRole('button', { name: 'Register Match' }).click()

  await expect(page.getByText('Match added successfully!')).toBeVisible()

  await page.getByRole('link', { name: 'Match History' }).click()
  // Desktop card announces the winner; the mobile row shows the 1–0 score
  await expect(visibleText(newestMatchCard(page), /Astrid wins!|1\s*[–-]\s*0/)).toBeVisible()
  await expect(visibleText(newestMatchCard(page), 'Astrid')).toBeVisible()
})

test('registers a draw', async ({ page }) => {
  await page.goto('/')
  const sheet = await startMatch(page, 'Dagny', 'Einar')

  await sheet.getByRole('button', { name: /Draw/ }).click()
  await sheet.getByRole('button', { name: 'Register Match' }).click()

  await expect(page.getByText('Match added successfully!')).toBeVisible()

  await page.getByRole('link', { name: 'Match History' }).click()
  await expect(visibleText(newestMatchCard(page), /½\s*[–-]\s*½/)).toBeVisible()
  await expect(visibleText(newestMatchCard(page), 'Dagny')).toBeVisible()
})
