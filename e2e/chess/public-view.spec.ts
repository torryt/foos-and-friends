import { expect, test } from '@playwright/test'

// Chess mock seed mirrors foosball's: the mock user is NOT a member of
// "Rival Office" (mock-group-2, public) or "Secret Society" (mock-group-3,
// private). Non-members get the read-only view at the same group URL.
const PUBLIC_GROUP_URL = '/groups/mock-group-2'

test('a non-member sees the read-only group page', async ({ page }) => {
  await page.goto(PUBLIC_GROUP_URL)

  await expect(page.getByRole('heading', { name: 'Rival Office' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Request to join' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add Match' })).toBeHidden()
})

test('TV mode renders the stripped-down leaderboard', async ({ page }) => {
  await page.goto(`${PUBLIC_GROUP_URL}/tv`)

  await expect(page.getByRole('heading', { name: 'Rival Office' })).toBeVisible()
  await expect(page.getByText('updates automatically')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Request to join' })).toBeHidden()
})

test('a private group shows only its name and a join request button', async ({ page }) => {
  await page.goto('/groups/mock-group-3')

  await expect(page.getByRole('heading', { name: 'Secret Society' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Request to join' })).toBeVisible()
})

test('an unknown group id shows the not-found state', async ({ page }) => {
  await page.goto('/groups/not-a-real-group')

  await expect(page.getByRole('heading', { name: 'Group Not Found' })).toBeVisible()
})
