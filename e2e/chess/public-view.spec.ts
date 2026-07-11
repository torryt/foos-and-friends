import { expect, test } from '@playwright/test'

// Chess mock seed mirrors foosball's: "Office Legends" public with token
// 'mock-public-token'.
const PUBLIC_URL = '/public/mock-public-token'

test('renders the public rankings page without auth', async ({ page }) => {
  await page.goto(PUBLIC_URL)

  await expect(page.getByRole('heading', { name: 'Office Legends' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Join' })).toHaveAttribute(
    'href',
    '/invite?code=MOCK01',
  )
  await expect(page.getByRole('button', { name: 'Add Match' })).toBeHidden()
})

test('TV mode renders the stripped-down leaderboard', async ({ page }) => {
  await page.goto(`${PUBLIC_URL}/tv`)

  await expect(page.getByRole('heading', { name: 'Office Legends' })).toBeVisible()
  await expect(page.getByText('updates automatically')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Join' })).toBeHidden()
})

test('an invalid token shows the not-available state', async ({ page }) => {
  await page.goto('/public/not-a-real-token')

  await expect(page.getByRole('heading', { name: 'Page Not Available' })).toBeVisible()
})
