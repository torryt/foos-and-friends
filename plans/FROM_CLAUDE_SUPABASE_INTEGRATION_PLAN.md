# Foos & Friends - Supabase Hosted Deployment Plan

**Project:** Social foosball tracking app with 2v2 matches and ELO rankings  
**Stack:** Vite + React + TanStack Router + Supabase (EU Hosted)  
**Target:** MVP deployment in 1-2 days  
**Budget:** ~€25/month  

---

## 📋 Project Overview

### **Application Features**
- 🏓 2v2 foosball match recording
- 🏆 International ELO ranking system (800-2400)
- 👥 Friend groups with invite codes (isolated organizations)
- 📱 Mobile-first responsive design
- 🔐 Magic link authentication (no passwords)
- 🇪🇺 GDPR compliant with EU data residency
- ⚡ Real-time updates and notifications

### **Technical Requirements**
- Frontend hosting with CDN
- PostgreSQL database with real-time subscriptions
- Authentication with magic links
- File storage (future: avatars, photos)
- EU data residency for GDPR compliance
- SSL/TLS encryption
- Automated backups

---

## 🎯 Phase 1: Foundation Setup (Day 1)

### **1.1 Supabase Project Creation (30 minutes)**

**Steps:**
1. **Create Supabase Account**
   - Visit [supabase.com](https://supabase.com)
   - Sign up with GitHub/Google
   - Verify email address

2. **Create New Project**
   - Project name: `foos-and-friends-prod`
   - Database password: Generate secure password (save in password manager)
   - **Region: EU Central (Frankfurt)** ⚠️ Critical for GDPR
   - Organization: Create new or use existing

3. **Configure Project Settings**
   - Navigate to Settings → General
   - Update project name and description
   - Note down project reference ID

4. **Obtain API Credentials**
   - Go to Settings → API
   - Copy and securely store:
     - Project URL: `https://[project-ref].supabase.co`
     - Anon/Public key: `eyJhbGc...` (for frontend)
     - Service role key: `eyJhbGc...` (for admin operations)

### **1.2 Database Schema Setup (45 minutes)**

**Method A: SQL Editor (Recommended for beginners)**
1. Navigate to SQL Editor in Supabase dashboard
2. Create new query
3. Copy and execute the complete schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table (friend groups)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  gdpr_consent_given BOOLEAN DEFAULT FALSE,
  gdpr_consent_date TIMESTAMPTZ,
  allow_email_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Players table (foosball players within organizations)
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  ranking INTEGER DEFAULT 1200 CHECK (ranking >= 800 AND ranking <= 2400),
  matches_played INTEGER DEFAULT 0 CHECK (matches_played >= 0),
  wins INTEGER DEFAULT 0 CHECK (wins >= 0),
  losses INTEGER DEFAULT 0 CHECK (losses >= 0),
  avatar TEXT DEFAULT '👤',
  department TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches table (2v2 foosball games)
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team1_player1_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team1_player2_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team2_player1_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team2_player2_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  score1 INTEGER NOT NULL CHECK (score1 >= 0),
  score2 INTEGER NOT NULL CHECK (score2 >= 0),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT different_players CHECK (
    team1_player1_id != team1_player2_id AND
    team1_player1_id != team2_player1_id AND
    team1_player1_id != team2_player2_id AND
    team1_player2_id != team2_player1_id AND
    team1_player2_id != team2_player2_id AND
    team2_player1_id != team2_player2_id
  )
);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data isolation
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (
    id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view same org users" ON public.users
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR id = auth.uid()
  );

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can manage same org players" ON players
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage same org matches" ON matches
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX idx_users_organization_id ON public.users(organization_id);
CREATE INDEX idx_players_organization_id ON players(organization_id);
CREATE INDEX idx_players_ranking ON players(ranking DESC);
CREATE INDEX idx_matches_organization_id ON matches(organization_id);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);

-- Function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

4. Execute the query and verify all tables are created
5. Check Authentication → Settings → enable email confirmations

### **1.3 Authentication Setup (15 minutes)**

1. **Configure Auth Settings**
   - Navigate to Authentication → Settings
   - Site URL: `https://foos-and-friends.netlify.app` (update later)
   - Enable email confirmations: Yes
   - Email change confirmations: Yes

2. **Configure Email Templates**
   - Go to Authentication → Email Templates
   - Customize "Magic Link" template:
     ```html
     <h2>Welcome to Foos & Friends! 🏓</h2>
     <p>Click the link below to sign in:</p>
     <p><a href="{{ .ConfirmationURL }}">Sign in to Foos & Friends</a></p>
     <p>This link expires in 1 hour.</p>
     ```

3. **Configure SMTP (Optional but recommended)**
   - Navigate to Authentication → Settings → SMTP Settings
   - Use custom SMTP provider (Gmail, SendGrid, etc.)
   - Or use default Supabase SMTP (limited)

---

## 🚀 Phase 2: Development Environment (Day 1)

### **2.1 Local Development Setup (45 minutes)**

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/foos-and-friends.git
   cd foos-and-friends
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_APP_NAME=Foos & Friends
   VITE_ENVIRONMENT=development
   ```

4. **Test Local Development**
   ```bash
   npm run dev
   ```
   - Visit `http://localhost:5173`
   - Test authentication flow
   - Create test organization
   - Add test players and matches

### **2.2 Frontend Deployment Setup (30 minutes)**

**Option A: Netlify (Recommended)**

1. **Connect Repository**
   - Visit [netlify.com](https://netlify.com)
   - New site from Git
   - Connect GitHub repository
   - Configure build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`

2. **Environment Variables**
   - Site settings → Environment variables
   - Add:
     ```
     VITE_SUPABASE_URL=https://your-project-ref.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```

3. **Custom Domain (Optional)**
   - Purchase domain (e.g., `foosandfriends.com`)
   - Configure DNS in Netlify
   - Enable HTTPS (automatic)

**Option B: Vercel Alternative**
- Similar process with Vercel
- Import from GitHub
- Configure environment variables
- Deploy

---

## 🔧 Phase 3: Production Configuration (Day 2)

### **3.1 Security Hardening (30 minutes)**

1. **Update RLS Policies**
   - Review all Row Level Security policies
   - Test with different user accounts
   - Ensure data isolation between organizations

2. **Configure Auth Redirects**
   - Update site URL in Supabase Auth settings
   - Add production domain to allowed redirect URLs
   - Test magic link flow in production

3. **Environment Security**
   - Rotate API keys if needed
   - Verify anon key permissions (read-only through RLS)
   - Never expose service role key in frontend

### **3.2 Performance Optimization (45 minutes)**

1. **Database Indexes**
   - Monitor query performance in Supabase dashboard
   - Add additional indexes if needed:
     ```sql
     -- Add indexes for common queries
     CREATE INDEX IF NOT EXISTS idx_matches_team_players 
     ON matches(team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id);
     
     CREATE INDEX IF NOT EXISTS idx_players_wins_ratio 
     ON players((wins::float / GREATEST(matches_played, 1)));
     ```

2. **Real-time Subscriptions**
   - Enable real-time for tables:
     ```sql
     -- Enable realtime
     ALTER PUBLICATION supabase_realtime ADD TABLE players;
     ALTER PUBLICATION supabase_realtime ADD TABLE matches;
     ```

3. **Frontend Optimization**
   - Enable Vite build optimizations
   - Configure CDN caching headers
   - Optimize bundle size

### **3.3 Monitoring Setup (15 minutes)**

1. **Supabase Monitoring**
   - Enable usage alerts in Supabase dashboard
   - Set up email notifications for errors
   - Monitor database performance

2. **Frontend Monitoring**
   - Add error boundary components
   - Configure Netlify analytics (optional)
   - Set up Sentry for error tracking (optional)

---

## 🧪 Phase 4: Testing & Validation (Day 2)

### **4.1 Feature Testing (60 minutes)**

**Test Scenarios:**
1. **User Registration & Authentication**
   - ✅ Sign up with email
   - ✅ Receive and click magic link
   - ✅ Automatic profile creation
   - ✅ Sign out and sign back in

2. **Organization Management**
   - ✅ Create new organization
   - ✅ Generate invite code
   - ✅ Join organization with invite code
   - ✅ Data isolation between organizations

3. **Player Management**
   - ✅ Add new players
   - ✅ View rankings
   - ✅ Players visible only within organization

4. **Match Recording**
   - ✅ Record 2v2 matches
   - ✅ ELO calculation updates
   - ✅ Win/loss statistics
   - ✅ Match history display

5. **Real-time Updates**
   - ✅ Rankings update live
   - ✅ New matches appear for all users
   - ✅ Multiple browser sessions sync

### **4.2 GDPR Compliance Testing (30 minutes)**

1. **Data Residency**
   - ✅ Verify data stored in EU (Frankfurt)
   - ✅ Test from different EU countries
   - ✅ Confirm latency < 100ms within EU

2. **Privacy Controls**
   - ✅ User can view their data
   - ✅ User can delete their account
   - ✅ Data deletion cascades properly
   - ✅ Consent tracking works

### **4.3 Mobile Testing (30 minutes)**

1. **Responsive Design**
   - ✅ iPhone 12/13/14 compatibility
   - ✅ Android device compatibility
   - ✅ Touch targets > 44px
   - ✅ Mobile navigation works

2. **Performance**
   - ✅ Page load < 3 seconds on 3G
   - ✅ Smooth scrolling and interactions
   - ✅ Offline-first features (optional)

---

## 📊 Phase 5: Launch Preparation (Day 2)

### **5.1 Content & Documentation (45 minutes)**

1. **User Onboarding**
   - Create welcome screens
   - Add tooltips for first-time users
   - Write help documentation

2. **Legal Pages**
   - Privacy Policy (GDPR compliant)
   - Terms of Service
   - Cookie Policy

3. **Marketing Materials**
   - App screenshots for social media
   - Feature list for promotion
   - Invite templates for users

### **5.2 Backup & Recovery Plan (30 minutes)**

1. **Database Backups**
   - Supabase provides automatic daily backups
   - Test backup restoration process
   - Document recovery procedures

2. **Configuration Backup**
   - Export database schema
   - Save all environment variables
   - Document deployment process

### **5.3 Launch Checklist (15 minutes)**

**Pre-Launch Verification:**
- [ ] All features working in production
- [ ] SSL certificate active
- [ ] Custom domain configured (if applicable)
- [ ] Email delivery working
- [ ] Error monitoring active
- [ ] Performance acceptable
- [ ] GDPR compliance verified
- [ ] Mobile experience tested
- [ ] Backup plan documented

---

## 💰 Cost Breakdown

### **Monthly Costs**
| Service | Plan | Cost |
|---------|------|------|
| **Supabase Pro** | PostgreSQL + Auth + Storage + API | **€25/month** |
| **Netlify Pro** | CDN + Build + Domain | **€19/month** |
| **Domain** | `.com` registration | **€1/month** |
| **Email Service** | SendGrid/Mailgun (optional) | **€5/month** |
| **Total** | | **€50/month** |

### **One-time Costs**
- Domain registration: €10/year
- SSL certificate: Free (Let's Encrypt via Netlify)
- Setup time: ~8-12 hours

### **Free Tier Option (Development)**
- Supabase: Free (2 projects, 500MB DB)
- Netlify: Free (100GB bandwidth)
- Domain: Use Netlify subdomain
- **Total: €0/month**

---

## 🚀 Go-Live Strategy

### **Soft Launch (Week 1)**
1. **Invite 5-10 close friends**
2. **Create 1-2 test organizations**
3. **Record 10-20 test matches**
4. **Gather feedback and fix issues**
5. **Monitor performance and costs**

### **Public Launch (Week 2-3)**
1. **Share on social media**
2. **Post in foosball communities**
3. **Office/workplace promotion**
4. **Gather user feedback**
5. **Plan feature roadmap**

### **Growth Phase (Month 2+)**
1. **Add requested features**
2. **Optimize performance**
3. **Scale infrastructure if needed**
4. **Consider monetization options**

---

## 🛠️ Post-Launch Maintenance

### **Weekly Tasks (30 minutes)**
- Monitor Supabase usage metrics
- Check error logs and fix issues
- Review user feedback
- Update dependencies

### **Monthly Tasks (2 hours)**
- Database performance review
- Security updates
- Backup verification
- Cost optimization review
- Feature planning

### **Quarterly Tasks (4 hours)**
- Major dependency updates
- Security audit
- Performance optimization
- User survey and roadmap planning

---

## 📞 Support & Resources

### **Documentation**
- [Supabase Docs](https://supabase.com/docs)
- [TanStack Router Docs](https://tanstack.com/router)
- [Vite Docs](https://vitejs.dev/)

### **Community Support**
- Supabase Discord
- GitHub Issues
- Stack Overflow

### **Emergency Contacts**
- Supabase Support (Pro plan includes email support)
- Netlify Support
- Domain registrar support

---

## ✅ Success Metrics

### **Technical KPIs**
- Page load time < 2 seconds
- 99.9% uptime
- Zero data loss
- < 100ms database query time

### **Business KPIs**
- 50+ active users by month 3
- 500+ matches recorded by month 6
- 10+ organizations created
- 4.5+ star user rating

### **GDPR Compliance KPIs**
- Zero privacy complaints
- 100% EU data residency
- Consent tracking at 100%
- Data deletion requests handled < 48 hours

---

**🎯 Ready to launch Foos & Friends and build the ultimate social foosball community!**