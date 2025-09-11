# GitHub Actions Setup for Cloudflare Pages Deployment

This guide explains how to set up automated deployment to Cloudflare Pages using GitHub Actions when creating semver release tags.

## How It Works

The workflow (`.github/workflows/deploy.yml`) triggers on:
- Semver release tags: `v1.0.0`, `v2.1.3`, `v1.0.0-beta.1`, etc.
- Runs tests, type checking, and linting before deployment
- Builds the production app with environment variables
- Deploys to Cloudflare Pages
- Posts success/failure comments on the release

## Required Secrets

Add these secrets in GitHub repository settings (Settings → Secrets and variables → Actions):

### Cloudflare Credentials

1. **`CLOUDFLARE_API_TOKEN`**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
   - Click "Create Token"
   - Use "Custom token" template with these permissions:
     ```
     Account - Cloudflare Pages:Edit
     Zone - Page Rules:Edit
     Zone - Zone:Read
     ```
   - Include your account in "Account Resources"

2. **`CLOUDFLARE_ACCOUNT_ID`**
   - Found in Cloudflare dashboard → Right sidebar
   - Copy the Account ID value

### Supabase Environment Variables

3. **`VITE_SUPABASE_URL`**
   - Your Supabase project URL (e.g., `https://xxx.supabase.co`)

4. **`VITE_SUPABASE_ANON_KEY`**
   - Your Supabase anonymous/public key

## Cloudflare Pages Project Setup

1. **Create Cloudflare Pages Project**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages
   - Click "Create a project"
   - Choose "Connect to Git" → Select your repository
   - Use these build settings:
     ```
     Build command: npm run build
     Build output directory: dist
     Root directory: (leave empty)
     ```

2. **Important**: Use project name `foos-and-friends` (or update the workflow file)

## Usage

### Creating a Release

1. **Tag and push**:
   ```bash
   git tag 1.0.0
   git push origin 1.0.0
   ```

2. **Or create via GitHub UI**:
   - Go to Releases → "Create a new release"
   - Choose/create a tag like `1.0.0`
   - Add release notes
   - Click "Publish release"

3. **The workflow will automatically**:
   - Run all tests and checks
   - Build the production app
   - Deploy to Cloudflare Pages
   - Comment on the commit with deployment status

### Semver Tag Examples

✅ **Valid tags** (will trigger deployment):
- `1.0.0` - Major release
- `1.2.3` - Standard release
- `2.0.0` - Major release
- `1.10.5` - Minor and patch release

❌ **Invalid tags** (will NOT trigger):
- `1.0` - Missing patch version
- `v1.0.0` - Has 'v' prefix (not wanted)
- `1.0.0-beta.1` - Pre-release tags excluded
- `1.0.0-alpha.2` - Pre-release tags excluded
- `1.2.3-rc.1` - Pre-release tags excluded
- `release-1.0.0` - Wrong format

## Workflow Features

### Quality Gates
- **Tests**: All tests must pass (`npm run test:run`)
- **TypeScript**: Type checking must pass (`npm run typecheck`)
- **Linting**: Code must pass linting (`npm run lint`)
- **Build**: Production build must succeed

### Deployment
- **Production**: All semver tags deploy to production
- **Environment Variables**: Automatically injected from secrets
- **Notification**: Success/failure comments posted on commits

### Error Handling
- Failed deployments post error comments with workflow links
- Secrets missing or invalid will cause deployment failure
- Build or test failures prevent deployment

## Troubleshooting

### Common Issues

**"Invalid API token"**
- Check CLOUDFLARE_API_TOKEN has correct permissions
- Ensure token isn't expired
- Verify account ID matches your Cloudflare account

**"Project not found"**
- Ensure Cloudflare Pages project exists
- Check project name matches workflow (`foos-and-friends`)
- Verify account ID is correct

**"Environment variables missing"**
- Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to repository secrets
- Check secret names match exactly (case-sensitive)

**"Tests failing"**
- Run `npm run test:run` locally to debug
- Ensure all tests pass before creating release tag

### Debugging

1. **Check workflow logs**:
   - Go to Actions tab in GitHub repository
   - Click on the failed workflow run
   - Review each step's logs

2. **Test locally**:
   ```bash
   npm run test:run
   npm run typecheck  
   npm run lint
   npm run build
   ```

3. **Validate secrets**:
   - Test Cloudflare API token in their dashboard
   - Verify Supabase credentials work in development

## Security Notes

- API tokens have minimal required permissions
- Environment variables are only injected during build
- Secrets are encrypted and only accessible to workflow
- Production builds use same security as manual deployments

## Customization

### Change Project Name
Update `projectName` in `.github/workflows/deploy.yml`:
```yaml
projectName: your-project-name
```

### Add More Environments
Create additional jobs for staging/preview deployments:
```yaml
deploy-staging:
  # Deploy to staging on push to develop branch
  if: github.ref == 'refs/heads/develop'
```

### Custom Domain
Add custom domain configuration after initial setup:
```yaml
- name: Configure custom domain
  run: |
    # Add custom domain configuration
```

## Next Steps

1. Set up the required GitHub secrets
2. Create your first release tag: `1.0.0`
3. Watch the automated deployment
4. Configure custom domain (optional)
5. Set up monitoring/alerts for deployment failures