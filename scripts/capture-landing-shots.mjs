// Regenerates the landing page screenshots and the og:image from the foosball
// app running in mock mode (VITE_MOCK_DATA=true — seeded fake data, no
// Supabase). Run from the repo root after UI changes:
//
//   pnpm shots:landing
//
// Output is committed to apps/landing/public/ so landing builds stay
// deterministic and CI never needs to boot the app.
import { spawn } from 'node:child_process'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'

const PORT = 4283
const BASE_URL = `http://localhost:${PORT}`
const OUT_DIR = path.resolve(import.meta.dirname, '../apps/landing/public')
const SHOTS_DIR = path.join(OUT_DIR, 'screenshots')

const waitForServer = async (url, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`)
}

const captureApp = async (browser, colorScheme) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme,
  })
  const page = await context.newPage()
  const shot = async (name) => {
    // The router devtools badge only exists because the dev server runs in
    // development mode — strip it so it never appears in marketing shots.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('.TanStackRouterDevtools')) el.remove()
    })
    // Snap any in-flight CSS transitions to their final state (e.g. the
    // selected tab's text-color transition) so shots are deterministic.
    await page.addStyleTag({
      content: '* { transition: none !important; animation: none !important; }',
    })
    await page.screenshot({ path: path.join(SHOTS_DIR, `${name}-${colorScheme}.png`) })
  }

  // Rankings (home)
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /View match history for/ }).first().waitFor()
  await shot('rankings')

  // Match history
  await page.getByRole('link', { name: 'Match History' }).click()
  await page.waitForLoadState('networkidle')
  await shot('matches')

  // Add Match — the "Who won?" score-entry step
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Add Match' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByRole('button', { name: 'Select Teams Manually' }).click()
  const pick = async (slot, player) => {
    await sheet.getByRole('button', { name: slot, exact: true }).first().click()
    await sheet.getByRole('button', { name: player }).click()
  }
  await pick('Select Attacker', 'Astrid')
  await pick('Select Defender', 'Birger')
  await pick('Select Attacker', 'Dagny')
  await pick('Select Defender', 'Einar')
  await sheet.getByRole('button', { name: 'Register Score' }).click()
  await sheet.getByText('Who won?').waitFor()
  await shot('add-match')

  // Player profile (top-ranked player), scrolled to show the rating chart
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /View match history for/ }).first().click()
  await page.getByText('Total Matches').waitFor()
  await page.waitForLoadState('networkidle')
  await shot('profile')

  await context.close()
}

const captureOgImage = async (browser) => {
  const favicon = await readFile(path.join(OUT_DIR, 'favicon.svg'), 'utf8')
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  await page.setContent(`<!doctype html>
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@700&display=swap"
          rel="stylesheet"
        />
        <style>
          * { margin: 0; box-sizing: border-box; }
          body {
            width: 1200px; height: 630px;
            display: flex; flex-direction: column; justify-content: center; gap: 28px;
            padding: 0 96px;
            background: linear-gradient(135deg, #f97316, #dc2626);
            font-family: 'Chakra Petch', system-ui, sans-serif; color: #fff;
          }
          .logo { display: flex; align-items: center; gap: 20px; }
          .logo svg { width: 72px; height: 72px; filter: drop-shadow(0 4px 12px rgb(0 0 0 / 0.25)); }
          .logo svg * { fill: #fff !important; }
          .name { font-size: 40px; font-weight: 700; }
          h1 { font-size: 76px; font-weight: 700; line-height: 1.1; letter-spacing: -0.02em; }
          p { font-size: 34px; font-family: system-ui, sans-serif; opacity: 0.9; }
        </style>
      </head>
      <body>
        <div class="logo">${favicon}<span class="name">Foos &amp; Friends</span></div>
        <h1>Your office foosball league,<br />minus the spreadsheet.</h1>
        <p>Matches · ELO rankings · Seasons — Play. Compete. Connect.</p>
      </body>
    </html>`)
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: path.join(OUT_DIR, 'og.png') })
  await context.close()
}

const server = spawn(
  'pnpm',
  ['--filter', '@foos/foosball', 'exec', 'vite', '--port', String(PORT), '--strictPort'],
  {
    env: { ...process.env, VITE_MOCK_DATA: 'true' },
    stdio: 'ignore',
    detached: true,
  },
)

try {
  await mkdir(SHOTS_DIR, { recursive: true })
  await waitForServer(BASE_URL)

  // Scoped font setup (Roboto + emoji fallback for `system-ui`) — see the
  // comment in landing-shots-fonts.conf.
  const browser = await chromium.launch({
    env: {
      ...process.env,
      FONTCONFIG_FILE: path.resolve(import.meta.dirname, 'landing-shots-fonts.conf'),
    },
  })
  await captureApp(browser, 'light')
  await captureApp(browser, 'dark')
  await captureOgImage(browser)
  await browser.close()

  console.log(`Wrote screenshots to ${SHOTS_DIR} and og.png to ${OUT_DIR}`)
} finally {
  // Kill the whole process group — vite spawns children
  process.kill(-server.pid, 'SIGTERM')
}
