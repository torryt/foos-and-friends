# GitHub Actions CI/CD Setup

This guide explains the GitHub Actions workflows used in the Foos & Friends monorepo.

## Workflows

### 1. PR Checks (`.github/workflows/pr-checks.yml`)

Runs quality checks automatically on every pull request (opened, synchronized, or reopened).

**What it does:**
1. Checks out the code
2. Sets up pnpm 9 and Node.js 22
3. Installs dependencies with `pnpm install --frozen-lockfile`
4. Runs linting (`pnpm lint`)
5. Runs all tests (`pnpm test:run`)
6. Runs type checking (`pnpm typecheck`)
7. Builds all apps (`pnpm build`) — this builds foosball, padel, and chess apps

**All checks must pass before a PR can be merged.**

### 2. Claude Code (`.github/workflows/claude.yml`)

Enables Claude Code AI assistant on issues and pull requests. Triggered when a collaborator mentions `@claude` in:
- Issue comments
- PR review comments
- PR reviews

**Allowed tools:** `pnpm`, `npx`, `git` via bash.

## Required Secrets

Add these secrets in GitHub repository settings (Settings → Secrets and variables → Actions):

### For PR Checks
No additional secrets required — quality checks run without Supabase credentials.

### For Claude Code
- **`CLAUDE_CODE_OAUTH_TOKEN`** — OAuth token for the Claude Code GitHub Action
- **`VITE_SUPABASE_URL`** — Supabase project URL (for builds that need env vars)
- **`VITE_SUPABASE_ANON_KEY`** — Supabase anonymous/public key

## Deployment

Deployment is handled via **Cloudflare Pages** connected directly to the repository, not through GitHub Actions. Each app (foosball, padel, chess) is a separate Cloudflare Pages project with its own build configuration. See [DEPLOYMENT.md](./DEPLOYMENT.md) for details.

### Cloudflare Credentials (for Cloudflare Pages dashboard, not GitHub Actions)

1. **`CLOUDFLARE_API_TOKEN`**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
   - Click "Create Token"
   - Use "Custom token" template with these permissions:
     ```
     Account - Cloudflare Pages:Edit
     Zone - Page Rules:Edit
     Zone - Zone:Read
     ```

2. **`CLOUDFLARE_ACCOUNT_ID`**
   - Found in Cloudflare dashboard → Right sidebar

## Local Quality Checks

Run the same checks locally before pushing:

```bash
pnpm lint          # Biome linting
pnpm test:run      # All tests (Vitest)
pnpm typecheck     # TypeScript type checking
pnpm build         # Build all apps (foosball, padel, chess)
```

## Troubleshooting

### Common Issues

**"Tests failing"**
- Run `pnpm test:run` locally to debug
- Ensure all tests pass before opening a PR

**"Type check failing"**
- Run `pnpm typecheck` locally
- Fix any TypeScript errors in the reported files

**"Lint failing"**
- Run `pnpm lint` locally to see issues
- Run `pnpm lint:fix` to auto-fix where possible

**"Build failing"**
- Run `pnpm build` locally
- Check that environment variables are set if needed
- Each app builds independently: `pnpm build:foosball`, `pnpm build:padel`, `pnpm build:chess`

### Debugging

1. **Check workflow logs**:
   - Go to the Actions tab in the GitHub repository
   - Click on the failed workflow run
   - Review each step's logs

2. **Test locally** (same commands as CI):
   ```bash
   pnpm install --frozen-lockfile
   pnpm lint
   pnpm test:run
   pnpm typecheck
   pnpm build
   ```

## Security Notes

- Secrets are encrypted and only accessible to workflows
- Claude Code only runs for repository owners, collaborators, and members
- PR checks run without secrets (pure quality gates)
- Supabase credentials are only provided to Claude Code for builds
