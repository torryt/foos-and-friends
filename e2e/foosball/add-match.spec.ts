import { expect, type Locator, test } from '@playwright/test'
import { modal, newestMatchCard } from '../utils'

const pickPlayer = async (sheet: Locator, slotName: string, playerName: string) => {
  await sheet.getByRole('button', { name: slotName, exact: true }).first().click()
  await sheet.getByRole('button', { name: playerName }).click()
}

test('registers a 2v2 match with manually selected teams', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Match' }).click()

  const sheet = modal(page)
  await expect(sheet.getByRole('heading', { name: 'Add Match' })).toBeVisible()
  await sheet.getByRole('button', { name: 'Select Teams Manually' }).click()

  // Team 1, then Team 2 fill the remaining empty slots
  await pickPlayer(sheet, 'Select Attacker', 'Astrid')
  await pickPlayer(sheet, 'Select Defender', 'Birger')
  await pickPlayer(sheet, 'Select Attacker', 'Dagny')
  await pickPlayer(sheet, 'Select Defender', 'Einar')

  await sheet.getByRole('button', { name: 'Register Score' }).click()

  // Score entry: pick winner, then the loser's score
  await expect(sheet.getByText('Who won?')).toBeVisible()
  await sheet.getByRole('button', { name: /Team 1/ }).click()
  await sheet.getByRole('button', { name: '7', exact: true }).click()
  await sheet.getByRole('button', { name: 'Register 10 – 7' }).click()

  await expect(page.getByText('Match added successfully!')).toBeVisible()

  // The new match is the newest entry in match history
  await page.getByRole('link', { name: 'Match History' }).click()
  await expect(newestMatchCard(page).getByText('10 - 7')).toBeVisible()
  await expect(newestMatchCard(page).getByText('Astrid')).toBeVisible()
})

test('registers a 1v1 match', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Match' }).click()

  const sheet = modal(page)
  await sheet.getByRole('button', { name: '1v1', exact: true }).click()
  await sheet.getByRole('button', { name: 'Select Players' }).click()

  await pickPlayer(sheet, 'Select Player', 'Gudrun')
  await pickPlayer(sheet, 'Select Player', 'Halvor')

  await sheet.getByRole('button', { name: 'Register Score' }).click()

  // 1v1 score entry uses two number inputs (one per player)
  await expect(sheet.getByRole('heading', { name: 'Enter Score' })).toBeVisible()
  await sheet.getByRole('spinbutton').first().fill('10')
  await sheet.getByRole('spinbutton').last().fill('4')
  await sheet.getByRole('button', { name: 'Register Score' }).click()

  await expect(page.getByText('Match added successfully!')).toBeVisible()

  await page.getByRole('link', { name: 'Match History' }).click()
  await expect(newestMatchCard(page).getByText('10 - 4')).toBeVisible()
  await expect(newestMatchCard(page).getByText(/Gudrun wins!/)).toBeVisible()
})

test('registers a match via Pick Teams Smartly', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add Match' }).click()

  const sheet = modal(page)
  await sheet.getByRole('button', { name: 'Pick Teams Smartly' }).click()

  // Mode step
  await sheet.getByRole('button', { name: /^Balanced/ }).click()

  // Player pool step
  await expect(sheet.getByText('Player Pool (0)')).toBeVisible()
  await sheet.getByRole('button', { name: 'Select All' }).click()
  await expect(sheet.getByText('Player Pool (12)')).toBeVisible()
  await sheet.getByRole('button', { name: 'Generate Balanced Teams' }).click()

  // Result step
  await expect(sheet.getByText('Teams Generated')).toBeVisible()
  await sheet.getByRole('button', { name: 'Register Score' }).click()

  await expect(sheet.getByText('Who won?')).toBeVisible()
  await sheet.getByRole('button', { name: /Team 2/ }).click()
  await sheet.getByRole('button', { name: '3', exact: true }).click()
  await sheet.getByRole('button', { name: 'Register 3 – 10' }).click()

  await expect(page.getByText('Match added successfully!')).toBeVisible()
})
