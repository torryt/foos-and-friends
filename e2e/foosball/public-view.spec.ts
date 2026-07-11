import { expect, test } from '@playwright/test'

// The mock seed marks "Office Legends" as public with token
// 'mock-public-token'. Public pages are unauthenticated by design — clear
// any stored auth to prove the logged-out path works.
const PUBLIC_URL = '/public/mock-public-token'

test('renders the public rankings page without auth', async ({ page }) => {
  await page.goto(PUBLIC_URL)

  await expect(page.getByRole('heading', { name: 'Office Legends' })).toBeVisible()
  await expect(page.getByText('Read-only view')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Join' })).toHaveAttribute(
    'href',
    '/invite?code=MOCK01',
  )
  // Leaderboard content from the public season stats
  await expect(
    page.getByRole('button', { name: 'View match history for Birger' }),
  ).toBeVisible()
  // No write actions anywhere
  await expect(page.getByRole('button', { name: 'Add Match' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Add Player' })).toBeHidden()
})

test('public match history is read-only', async ({ page }) => {
  await page.goto(`${PUBLIC_URL}/matches`)

  await expect(page.getByRole('heading', { name: 'Recent Games' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Record match' })).toBeHidden()
})

test('public player profile renders read-only', async ({ page }) => {
  await page.goto(PUBLIC_URL)
  await page.getByRole('button', { name: 'View match history for Birger' }).click()

  await expect(page.getByRole('heading', { name: 'Birger' })).toBeVisible()
  await expect(page).toHaveURL(/\/public\/mock-public-token\/players\//)
})

test('TV mode shows the stripped-down leaderboard', async ({ page }) => {
  await page.goto(`${PUBLIC_URL}/tv`)

  await expect(page.getByRole('heading', { name: 'Office Legends' })).toBeVisible()
  await expect(page.getByText('updates automatically')).toBeVisible()
  // No chrome: no tabs, no join button
  await expect(page.getByRole('link', { name: 'Rankings' })).toBeHidden()
  await expect(page.getByRole('link', { name: 'Join' })).toBeHidden()
})

test('an invalid token shows the not-available state', async ({ page }) => {
  await page.goto('/public/not-a-real-token')

  await expect(page.getByRole('heading', { name: 'Page Not Available' })).toBeVisible()
})
