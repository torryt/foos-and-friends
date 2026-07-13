import { expect, test } from '@playwright/test'

// Mock seed: the mock user is NOT a member of "Rival Office" (mock-group-2,
// public, approval policy, seeded with players Magnus and Judit) or "Secret
// Society" (mock-group-3, private). Group pages share one URL for members and
// non-members — non-members get the read-only view.
const PUBLIC_GROUP_URL = '/groups/mock-group-2'

test('a non-member sees the read-only group page', async ({ page }) => {
  await page.goto(PUBLIC_GROUP_URL)

  await expect(page.getByRole('heading', { name: 'Rival Office' })).toBeVisible()
  await expect(page.getByText('Read-only view')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Request to join' })).toBeVisible()
  // Leaderboard content from the public season stats
  await expect(page.getByRole('button', { name: 'View match history for Magnus' })).toBeVisible()
  // No write actions anywhere
  await expect(page.getByRole('button', { name: 'Add Match' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Add Player' })).toBeHidden()
})

test('public match history is read-only', async ({ page }) => {
  await page.goto(`${PUBLIC_GROUP_URL}/matches`)

  await expect(page.getByRole('heading', { name: 'Recent Games' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Record match' })).toBeHidden()
})

test('public player profile renders read-only', async ({ page }) => {
  await page.goto(PUBLIC_GROUP_URL)
  await page.getByRole('button', { name: 'View match history for Magnus' }).click()

  await expect(page.getByRole('heading', { name: 'Magnus' })).toBeVisible()
  await expect(page).toHaveURL(/\/groups\/mock-group-2\/players\//)
})

test('TV mode shows the stripped-down leaderboard', async ({ page }) => {
  await page.goto(`${PUBLIC_GROUP_URL}/tv`)

  await expect(page.getByRole('heading', { name: 'Rival Office' })).toBeVisible()
  await expect(page.getByText('updates automatically')).toBeVisible()
  // No chrome: no tabs, no join button
  await expect(page.getByRole('link', { name: 'Rankings' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Request to join' })).toBeHidden()
})

test('members get the TV leaderboard for their own group', async ({ page }) => {
  await page.goto('/groups/mock-group-1/tv')

  await expect(page.getByRole('heading', { name: 'Office Legends' })).toBeVisible()
  await expect(page.getByText('updates automatically')).toBeVisible()
})

test('requesting to join files a pending request', async ({ page }) => {
  await page.goto(PUBLIC_GROUP_URL)

  await page.getByRole('button', { name: 'Request to join' }).click()

  await expect(page.getByText('Request pending')).toBeVisible()
})

test('a private group shows only its name and a join request button', async ({ page }) => {
  await page.goto('/groups/mock-group-3')

  await expect(page.getByRole('heading', { name: 'Secret Society' })).toBeVisible()
  await expect(page.getByText('This group is private')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Request to join' })).toBeVisible()
  // No stats leak
  await expect(page.getByRole('link', { name: 'Match History' })).toBeHidden()
})

test('an unknown group id shows the not-found state', async ({ page }) => {
  await page.goto('/groups/not-a-real-group')

  await expect(page.getByRole('heading', { name: 'Group Not Found' })).toBeVisible()
})

test('the root URL redirects members to their default group', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/groups\/mock-group-1/)
  await expect(page.getByRole('heading', { name: 'Friend Rankings' })).toBeVisible()
})
