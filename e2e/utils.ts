import type { Locator, Page } from '@playwright/test'

// Scoping interactions to the open dialog avoids matching page content behind it.
export const modal = (page: Page): Locator => page.getByRole('dialog')

// Newest match card in the MatchHistory list (matches are sorted newest first)
export const newestMatchCard = (page: Page): Locator =>
  page.locator('.grid.grid-cols-1 > div').first()

// Each match renders both a mobile row and a desktop card; the viewport hides
// one of them. Filter to whichever layout is actually shown.
export const visibleText = (scope: Page | Locator, text: string | RegExp): Locator =>
  scope.getByText(text).filter({ visible: true }).first()

// Score separator differs by layout: "10 - 4" (desktop card) vs "10–4" (mobile row)
export const scoreText = (score1: number | string, score2: number | string): RegExp =>
  new RegExp(`${score1}\\s*[–-]\\s*${score2}`)
