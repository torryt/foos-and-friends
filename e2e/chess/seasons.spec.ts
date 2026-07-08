import { expect, test } from '@playwright/test'

test('switches to an archived season and back to live', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Friend Rankings' })).toBeVisible()

  await page.getByRole('button', { name: 'Season 3' }).click()
  const picker = page.getByRole('listbox', { name: 'Ranking scope' })
  await expect(picker.getByText('LIVE', { exact: true })).toBeVisible()
  await expect(picker.getByRole('option')).toHaveCount(4) // all time + 3 seasons

  await picker.getByRole('option', { name: /Season 2/ }).click()

  await expect(page.getByText(/· ended/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Final Standings' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add Match' })).toBeHidden()

  await page.getByRole('button', { name: 'Back to live ›' }).click()
  await expect(page.getByRole('heading', { name: 'Friend Rankings' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add Match' })).toBeVisible()
})
