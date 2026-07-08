import { defineConfig } from '@playwright/test'

// E2E tests run both apps in mock mode (VITE_MOCK_DATA=true): in-memory
// database, fake logged-in user, no Supabase needed. The mock DB reseeds on
// every page load, so tests are isolated by construction.
const FOOSBALL_PORT = 4273
const CHESS_PORT = 4275

// Mobile-first is a hard requirement for this repo, so the primary projects
// run in a mobile viewport (iPhone-ish, matching the verify workflow); a
// second pair of projects covers the desktop layout.
const mobileChrome = {
  browserName: 'chromium' as const,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
}

const desktopChrome = {
  browserName: 'chromium' as const,
  viewport: { width: 1280, height: 720 },
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'foosball',
      testDir: './e2e/foosball',
      use: { ...mobileChrome, baseURL: `http://localhost:${FOOSBALL_PORT}` },
    },
    {
      name: 'chess',
      testDir: './e2e/chess',
      use: { ...mobileChrome, baseURL: `http://localhost:${CHESS_PORT}` },
    },
    {
      name: 'foosball-desktop',
      testDir: './e2e/foosball',
      use: { ...desktopChrome, baseURL: `http://localhost:${FOOSBALL_PORT}` },
    },
    {
      name: 'chess-desktop',
      testDir: './e2e/chess',
      use: { ...desktopChrome, baseURL: `http://localhost:${CHESS_PORT}` },
    },
  ],
  webServer: [
    {
      command: `pnpm --filter @foos/foosball exec vite --port ${FOOSBALL_PORT} --strictPort`,
      env: { VITE_MOCK_DATA: 'true' },
      url: `http://localhost:${FOOSBALL_PORT}`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `pnpm --filter @foos/chess exec vite --port ${CHESS_PORT} --strictPort`,
      env: { VITE_MOCK_DATA: 'true' },
      url: `http://localhost:${CHESS_PORT}`,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
