---
name: verify
description: How to run and verify UI changes in this repo end-to-end without Supabase credentials.
---

# Verifying UI changes

## Launch (no Supabase needed)

```bash
pnpm dev:foos:mock   # VITE_MOCK_DATA=true — in-memory DB, fake logged-in user
```

Seeds 10 players ("Office Legends" group) and a 60-match season. Match
registration works and updates rankings in memory. Chess has no
mock script yet — mock mode is wired up in foosball only
(`apps/foosball/src/lib/init.ts`, `useAuth.ts`).

Vite picks the next free port if 5173 is taken — read the port from the
dev server output, don't assume.

## Drive

Use the chrome-devtools MCP tools. For mobile verification (mobile-first
is a hard requirement here):

- `emulate` with viewport `390x844x3,mobile,touch` (iPhone-ish)
- `take_snapshot` for structure/assertions, `take_screenshot` for visuals
- Emoji avatars render as tofu in headless Chrome — cosmetic, ignore

Gotcha: if the MCP reports "browser is already running for
…/chrome-devtools-mcp/chrome-profile", an orphaned headless Chrome from a
previous session holds the profile lock — `pgrep -f chrome-devtools-mcp`
and kill it.

## Flows worth driving

Rankings page → "Add Match" reaches everything: 1v1/2v2 toggle, Pick
Teams Smartly, Select Teams Manually, score entry. Success toast +
reordered rankings confirm the write path.
