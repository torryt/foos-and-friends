import type { Locator, Page } from '@playwright/test'

// Scoping interactions to the open dialog avoids matching page content behind it.
export const modal = (page: Page): Locator => page.getByRole('dialog')

// Newest match card in the MatchHistory list (matches are sorted newest first)
export const newestMatchCard = (page: Page): Locator =>
  page.locator('.grid.grid-cols-1 > div').first()
