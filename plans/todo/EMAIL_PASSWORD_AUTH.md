# Email/Password Authentication Plan

**Date**: 2026-07-04 (rewritten; supersedes the January 2025 draft, which targeted the pre-monorepo layout and a separate-username design)
**Status**: Planned
**Issue**: [#26](https://github.com/torryt/foos-and-friends/issues/26)
**Effort**: ~1–2 days of implementation + manual Supabase configuration

## Decisions (made 2026-07-04)

- **Identifier is email**, not a separate username. Supabase `signInWithPassword` authenticates by email; no new tables, RPC functions, or uniqueness handling needed. The old plan's `is_username_available` / `get_user_by_username` design is dropped.
- **Magic link stays** as an alternative login method. Existing users keep working with zero migration; password is an *additional* login type (this is exactly what issue #26 asks for). An existing magic-link user gains a password either via the settings page (while logged in) or via the "forgot password" flow.
- **Implemented in `packages/shared`**, consumed by both `apps/foosball` and `apps/chess`. Both apps currently duplicate the same magic-link `useAuth`/`AuthForm`; this feature moves auth into shared and both apps adopt it.
- **Old code**: PR #28 / branches `claude/issue-26-20250925-045{4,6}` are 78 commits behind main and predate the monorepo — **do not merge**. Use as reference only (useAuth method shapes, `reset-password.tsx` route, `PasswordSettings` component). Close PR #28 when this ships.
- **Mock mode**: main currently has `isMockMode`/`MOCK_USER` for local dev. Keep it working (stub the new methods to succeed), but don't build elaborate mock credential storage — that was explicitly rejected in issue #26.

## Scope

1. **Registration** — sign up with email + password (+ confirm password), email verification via Supabase confirm-signup email.
2. **Login** — sign in with email + password; magic link remains available; "Forgot password?" link.
3. **Password recovery** — request reset email → redirect back to app → set new password.
4. **User settings page** — new route with: account info (email), set/change password, theme picker (relocated or duplicated from header dropdown), sign out. **Decision (2026-07-04): the settings page never takes a password directly.** The set/change password button sends a reset email (`resetPasswordForEmail`) and tells the user to check their inbox; actual password entry happens on `/reset-password` with a fresh recovery session. Rationale: `updateUser({ password })` on a long-lived session would let anyone with the open session silently change the password — routing through email forces fresh proof of ownership, and the same flow doubles as "add a password" for existing magic-link users.

Out of scope (future): change-email flow, social login, 2FA, account deletion.

## Architecture

Current state (per exploration 2026-07-04):

- Auth lives per-app: `apps/{foosball,chess}/src/hooks/useAuth.ts` (magic link via `signInWithOtp`) and `components/AuthForm.tsx`, gated by `components/ProtectedRoute.tsx`.
- Supabase client: `packages/shared/src/lib/supabase.ts` (`persistSession`, `detectSessionInUrl` already on).
- Routing: TanStack Router file-based routes in `apps/*/src/routes/`.
- Email templates already exist in `email-templates/` (`password-reset.html`, `confirm-sign-up.html`, `magic-link.html`) — wired manually in the Supabase dashboard.
- SMTP: Brevo, already configured for magic links (see `plans/done/HOSTING_SMTP_PLAN.md`).
- Auth users vs. players: players are group-scoped named entities, **not** linked to auth accounts — nothing player-related changes here.

Target: shared auth module in `packages/shared/src/auth/` exporting the hook + form components; apps keep thin route/wiring files.

### New/changed auth API (shared `useAuth`)

```ts
signInWithMagicLink(email)                 // existing
signInWithPassword(email, password)        // supabase.auth.signInWithPassword
signUp(email, password)                    // supabase.auth.signUp → confirmation email
resetPassword(email)                       // supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` })
updatePassword(newPassword)                // supabase.auth.updateUser({ password }) — ONLY called from /reset-password (recovery session)
signOut()                                  // existing
```

The reset flow: Supabase emails a link → user lands on `/reset-password` with a recovery session (`onAuthStateChange` fires `PASSWORD_RECOVERY`) → page shows new-password form → `updateUser({ password })`.

### Password rules

Match Supabase's configured minimum (default 6; recommend raising to 8 in the dashboard and mirroring in client validation). Confirm-password field on signup and reset. No complexity zoo — leaked-password protection can be toggled in Supabase instead.

---

## Action items

Track progress by checking these off. Items marked **🧑 MANUAL** require a human (Supabase dashboard / email inbox / production checks) and cannot be done by an agent with repo access alone.

### Phase 0 — Supabase configuration (🧑 MANUAL, do first)

- [ ] 🧑 Supabase dashboard → **Authentication → Sign In / Providers → Email**: ensure **Email + password** sign-in is enabled (magic link/OTP stays enabled). Set minimum password length (recommend 8) and enable leaked-password protection if on a plan that supports it.
- [ ] 🧑 **Authentication → Email Templates**: paste `email-templates/password-reset.html` into *Reset Password* and `email-templates/confirm-sign-up.html` into *Confirm signup* (magic-link template should already be in place). Verify `{{ .ConfirmationURL }}` placeholders survive the paste.
- [ ] 🧑 **Authentication → URL Configuration**: add redirect URLs for the reset flow to the allowlist — `http://localhost:5173/reset-password` (both apps' dev ports) and the production URLs (`https://<prod-domain>/reset-password` for foosball and chess).
- [ ] 🧑 Confirm whether **"Confirm email"** is required on signup (recommended: yes). Note the choice here — it changes the post-signup UX (Phase 3).
- [ ] 🧑 Sanity-check Brevo SMTP still sends (trigger a magic link) and that the free-tier daily quota (300/day) is fine for added reset/confirmation volume.

### Phase 1 — Shared auth module (`packages/shared`)

- [x] Create `packages/shared/src/auth/useAuth.ts`: port the existing (identical) app-level hooks, add `signInWithPassword`, `signUp`, `resetPassword`, `updatePassword`. Keep mock-mode as trivial success stubs. Reference: `origin/claude/issue-26-20250925-0506:src/hooks/useAuth.ts`.
- [x] Surface friendly error mapping (invalid credentials, email not confirmed, rate limited, weak password).
- [x] Export from shared package index; add unit tests for the new methods (mock supabase client), matching existing test conventions.
- [x] Migrate `apps/foosball` and `apps/chess` to import `useAuth` from shared; delete the per-app duplicates. Verify no behavior change for magic link.

### Phase 2 — Login + registration UI

- [x] Build shared `AuthForm` with three modes — **Sign in** (email+password, "Forgot password?" link, magic-link alternative), **Sign up** (email, password, confirm password), and **Magic link**. Reference the old branch's mode-switcher UX; restyle with the current `--th-*` theme variables (the old branch predates theming).
- [x] Password visibility toggle, inline validation (min length, match), submit-state handling.
- [x] Post-signup screen: "check your email to confirm" (if email confirmation is on).
- [x] Adopt in both apps' `ProtectedRoute`; remove per-app `AuthForm` duplicates.
- [x] Preserve the foosball invite flow: `/invite?code=...` must still work when the user signs **up** with a password instead of a magic link (invite code must survive the round trip / be re-read after auth).

### Phase 3 — Password recovery

- [x] "Forgot password?" view inside `AuthForm`: email input → `resetPassword(email)` → neutral confirmation message (same message whether or not the account exists, to avoid enumeration).
- [x] New route `apps/foosball/src/routes/reset-password.tsx` (and chess equivalent), thin wrapper around a shared `ResetPasswordPage` component: listens for the `PASSWORD_RECOVERY` event / recovery session, shows new-password + confirm form, calls `updatePassword`, redirects to `/` on success. Handle expired/invalid link state. Reference: `origin/claude/issue-26-20250925-0506:src/routes/reset-password.tsx`.
- [x] Ensure `ProtectedRoute` doesn't hijack `/reset-password` (a recovery session is authenticated — the page must render the reset form, not the app).

### Phase 4 — User settings page

- [x] Shared `UserSettings` page component: account section (email, read-only for now), **password section** — a single "Set password" / "Change password" button that calls `resetPassword(user.email)` and shows "check your inbox" (no password inputs on this page; see Scope decision), theme picker, sign out.
- [x] Since the settings page pre-fills the logged-in user's own email, enumeration is not a concern here — the button can confirm plainly that the email was sent, and should be rate-limited client-side (disable after send, Supabase also rate-limits server-side).
- [x] New route `settings.tsx` in both apps (TanStack file-based; `routeTree.gen` regenerates).
- [x] Add "Settings" entry to the profile dropdown in `apps/*/src/components/Header.tsx` (between ThemePicker and Sign Out; close dropdown on navigate — see commit `4d9e8dd` for the pattern).
- [x] Decide whether ThemePicker moves out of the dropdown into settings or lives in both (default: both).

### Phase 5 — QA & wrap-up

- [x] Lint, typecheck, unit tests, production build for both apps (`pnpm` workspace scripts).
- [ ] 🧑 **Manual E2E in a real browser against real Supabase** (agents can't read your inbox):
  - [ ] 🧑 Sign up with a new email → receive confirmation email → confirm → land in app.
  - [ ] 🧑 Sign out → sign in with email+password.
  - [ ] 🧑 Forgot password → receive reset email → link opens `/reset-password` → set new password → sign in with it.
  - [ ] 🧑 Existing magic-link user: log in via magic link → settings → "Set password" → receive reset email → set password on `/reset-password` → sign out → log in with password.
  - [ ] 🧑 Change password from settings works the same way (email round trip), and the old password stops working afterwards.
  - [ ] 🧑 Magic-link login still works end to end.
  - [ ] 🧑 Repeat the signup + reset smoke test on **production** after deploy (redirect URLs differ).
- [ ] 🧑 Close PR #28 with a comment pointing at the new implementation; delete `claude/issue-26-*` branches.
- [ ] Close issue #26 (auto-close via "Closes #26" in the PR).
- [ ] Move this plan to `plans/done/`.

---

## Risks / gotchas

- **Reset link handling**: `detectSessionInUrl: true` means the recovery token is consumed on page load — the `/reset-password` route must exist in *both* apps and be in the Supabase redirect allowlist, or users get dumped on `/` logged in with no way to set a password.
- **Account enumeration**: keep the reset-request response identical for existing and unknown emails. Note that Supabase signup responses can reveal existing accounts depending on config; acceptable for this app's threat model.
- **Existing users**: no migration needed — a magic-link user simply has no password until they set one. Attempting password login before that yields "invalid credentials"; the recovery flow doubles as "set your first password".
- **Chess app drift**: both apps' auth code is currently near-identical but separate; the shared refactor is the main source of unexpected breakage — verify chess just as carefully as foosball.
- **Brevo quota**: confirmation + reset emails add volume on the 300/day free tier; fine at current scale, worth a glance if signups spike.
