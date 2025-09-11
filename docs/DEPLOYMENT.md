# Deployment Guide

## Quick Start (Phase 1: Free Hosting)

### 1. Deploy to Cloudflare Pages

1. **Connect Repository**
   - Go to [Cloudflare Pages](https://pages.cloudflare.com/)
   - Click "Connect to Git" → Select your repository
   
2. **Configure Build Settings**
   ```
   Build command: npm run build
   Build output directory: dist
   Root directory: (leave blank)
   ```

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