# Deployment Guide

## Quick Start (Phase 1: Free Hosting)

### 1. Deploy to Cloudflare Pages

Each app is deployed as a separate Cloudflare Pages project.

#### Foosball App
1. **Create Cloudflare Pages project** for foosball
2. **Configure Build Settings**
   ```
   Build command: pnpm install && pnpm build:foos
   Build output directory: apps/foosball/dist
   Root directory: (leave blank)
   ```

#### Chess App
1. **Create Cloudflare Pages project** for chess
2. **Configure Build Settings**
   ```
   Build command: pnpm install && pnpm build:chess
   Build output directory: apps/chess/dist
   Root directory: (leave blank)
   ```

#### Landing Page
1. **Create Cloudflare Pages project** for the public landing page
2. **Configure Build Settings**
   ```
   Build command: pnpm install && pnpm build:landing
   Build output directory: apps/landing/dist
   Root directory: (leave blank)
   ```
3. **Add Environment Variables**
   ```
   VITE_FOOS_APP_URL=https://<your-foosball-app-url>
   ```
   This is where every "Start playing" / "Sign in" link points. No Supabase
   credentials needed — the landing page is fully static.
4. **Domains**: put the landing page on the root domain (e.g. `foosandfriends.example`)
   and the apps on subdomains (e.g. `foos.` / `chess.`). If you move the foosball
   app to a subdomain, add the new URL to Supabase Auth → URL Configuration →
   Redirect URLs so magic links keep working.

   Screenshots on the page are generated, committed files — refresh them with
   `pnpm shots:landing` after UI changes (see `scripts/capture-landing-shots.mjs`).

#### For each app project:

3. **Add Environment Variables**
   - Navigate to Settings → Environment variables
   - Add your Supabase credentials:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Deploy**
   - Click "Save and Deploy"
   - Your app will be available at `https://your-project.pages.dev`

### 2. Configure SMTP with Brevo

1. **Sign up for Brevo**
   - Go to [Brevo.com](https://www.brevo.com/)
   - Create a free account (300 emails/day)

2. **Get SMTP Credentials**
   - Navigate to SMTP & API → SMTP
   - Note down your SMTP credentials:
     ```
     SMTP Server: smtp-relay.brevo.com
     Port: 587
     Username: your-brevo-email
     Password: your-smtp-key
     ```

3. **Configure Supabase Auth**
   - In Supabase dashboard: Authentication → Settings
   - Enable "Enable custom SMTP"
   - Enter Brevo SMTP settings:
     ```
     SMTP Host: smtp-relay.brevo.com
     SMTP Port: 587
     SMTP User: your-brevo-email
     SMTP Pass: your-smtp-key
     SMTP Sender Name: Foos & Friends
     SMTP Sender Email: noreply@yourdomain.com
     ```

### 3. Deploy the join-request email function

Auth emails go out over Brevo's **SMTP relay** (above). The "your join request was
accepted" email instead goes out over Brevo's **transactional API**, from the
`send-join-approved-email` edge function. It needs its own key.

1. **Create an API key** — in Brevo: SMTP & API → API Keys → Generate. This is a
   different credential from the SMTP key.

2. **Set the function secrets** (never in `.env.local` — these are server-side only):
   ```bash
   supabase secrets set \
     BREVO_API_KEY=your-brevo-api-key \
     BREVO_SENDER_EMAIL=no-reply@foosandfriends.com \
     BREVO_SENDER_NAME="Foos & Friends" \
     APP_URL_FOOSBALL=https://app.foosandfriends.com \
     APP_URL_CHESS=https://chess-and-friends.pages.dev
   ```
   The sender address must be a verified sender in Brevo or sends will 4xx.
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected
   by the platform — do not set them yourself.

3. **Deploy**
   ```bash
   supabase functions deploy send-join-approved-email
   ```

The function is invoked by the client immediately after `approve_join_request`
succeeds. It re-checks the caller's owner/admin role and that the request really is
approved before mailing, so it can't be used to spam arbitrary users. If it fails,
the approval still stands — the member is in, they just don't get the email, and the
failure is logged in the function logs.

## Future: Adding Service Layer (Phase 2)

When you need custom API endpoints or background services:

### Option A: Railway (Recommended for DX)

1. **Connect Repository**
   - Go to [Railway.com](https://railway.com/)
   - Connect your GitHub repository

2. **Deploy Backend Service**
   ```bash
   # Create a new service for your API
   # Railway auto-detects Node.js/Python/etc.
   npm install express
   # Add your API routes
   ```

3. **Environment Variables**
   - Add database connections, API keys via Railway dashboard

### Option B: Render (EU Regions Available)

1. **Create Web Service**
   - Go to [Render.com](https://render.com/)
   - New → Web Service
   - Connect repository

2. **Configure Service**
   ```
   Build Command: npm install
   Start Command: npm start
   ```

3. **Set Environment Variables**
   - Add in Render dashboard

## Cost Breakdown

### Phase 1 (Current)
- **Cloudflare Pages**: Free
- **Supabase**: Free tier (up to 50k auth users)
- **Brevo SMTP**: Free (300 emails/day)
- **Total**: €0/month

### Phase 2 (With Service Layer)
- **Cloudflare Pages**: Free (continue)
- **Railway/Render**: €5-7/month
- **Supabase**: Free tier (continue)
- **Brevo**: Free tier (continue)
- **Total**: €5-7/month

## Custom Domain Setup (Optional)

### Cloudflare Pages Domain
1. In Cloudflare Pages dashboard: Custom domains
2. Add your domain
3. Update DNS records as instructed

### SMTP Domain (Optional)
1. In Brevo: Senders & IP → Domains
2. Add and verify your domain
3. Update SMTP sender to use your domain

## Monitoring & Analytics

- **Cloudflare**: Built-in analytics in Pages dashboard
- **Supabase**: Database and auth metrics in dashboard
- **Brevo**: Email delivery statistics and bounce tracking

## Troubleshooting

### Build Failures
- Check build logs in Cloudflare Pages dashboard
- Ensure all environment variables are set
- Verify `dist` folder is being generated

### Email Issues
- Test SMTP settings in Brevo dashboard
- Check Supabase Auth logs for email errors
- Verify domain reputation with Brevo support

### Performance
- Use Cloudflare Pages analytics to monitor Core Web Vitals
- Enable Cloudflare caching rules for optimal performance