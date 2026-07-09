import { expect, test } from '@playwright/test'

test('shows the pitch and points every CTA at the app', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Foos & Friends/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('foosball league')

  // All sign-in/start CTAs resolve to a real URL, not the %APP_URL% placeholder
  const ctas = await page
    .getByRole('link', { name: /Start playing|Sign in/ })
    .evaluateAll((links) => links.map((a) => a.getAttribute('href')))
  expect(ctas.length).toBeGreaterThanOrEqual(3)
  for (const href of ctas) {
    expect(href).toMatch(/^https:\/\//)
  }
})

test('walks through the whole page without horizontal scroll', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Rankings that mean something' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
    'href',
    'https://github.com/torryt/foos-and-friends',
  )

  // Screenshots resolve (no broken <img> in the built page)
  for (const img of await page.locator('main img').all()) {
    await img.scrollIntoViewIfNeeded()
    await expect
      .poll(async () => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0)
  }

  // Mobile-first hard requirement: the page never scrolls sideways
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBe(0)
})
