# Supabase Backend Integration Plan for Claude Code

## Overview
This document provides step-by-step instructions for Claude Code to integrate the foosball tracking app with Supabase. The implementation will add **magic link authentication**, **private friend groups**, and **invite-only group access** with complete data isolation.

## Prerequisites (Human Setup Required)

### ✅ Supabase Project Setup
**The human must complete these steps before Claude can begin implementation:**

1. **Create Supabase Project**
   - [ ] Go to https://supabase.com and create new project
   - [ ] Choose project name and region
   - [ ] Wait for project provisioning to complete
   - [ ] Note down project URL and anon key from Settings > API

2. **Configure Authentication**
   - [ ] Navigate to Authentication > Settings in Supabase dashboard
   - [ ] Enable "Enable email confirmations" 
   - [ ] Disable "Enable email confirmations" (for magic links)
   - [ ] Enable "Enable phone confirmations" = OFF
   - [ ] Set "Site URL" to your domain (e.g., `https://yourapp.com`)
   - [ ] Add redirect URLs for development: `http://localhost:5173/**`

3. **Configure Magic Link Authentication**
   - [ ] Go to Authentication > Settings > Auth
   - [ ] Ensure "Enable signup" is ON
   - [ ] Set "Minimum password length" (not used but required)
   - [ ] In "Magic Link" section, ensure it's enabled

4. **Set Up Environment Variables**
   - [ ] Create `.env.local` file in project root
   - [ ] Add the following variables:
   ```
   VITE_SUPABASE_URL=your_project_url_here
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```
   - [ ] Add `.env.local` to `.gitignore` if not already there

5. **Email Configuration (Optional but Recommended)**
   - [ ] Go to Authentication > Settings > SMTP Settings
   - [ ] Configure custom SMTP or use Supabase default for now
   - [ ] Customize email templates in Authentication > Templates

### ✅ Domain/Hosting Setup (If Deploying)
**For production deployment:**
- [ ] Set up domain and hosting (Vercel, Netlify, etc.)
- [ ] Add production URL to Supabase redirect URLs
- [ ] Configure environment variables in hosting platform

## Implementation Phases (Claude Code Tasks)

### Phase 1: Install Dependencies and Configure Supabase Client
**Claude can implement this immediately after environment setup:**

#### ✅ Claude Tasks - Phase 1
- [ ] Install Supabase client: `npm install @supabase/supabase-js`
- [ ] Create `src/lib/supabase.ts` with client configuration
- [ ] Update type definitions for Supabase types
- [ ] Create environment variable validation
- [ ] Test Supabase connection in development

#### Implementation Checklist:
```typescript
// Claude should create: src/lib/supabase.ts
- [ ] Import createClient from @supabase/supabase-js
- [ ] Add environment variable validation
- [ ] Export configured supabase client
- [ ] Add TypeScript types for database schema
```

### Phase 2: Database Schema Creation
**Claude will provide SQL commands that human must run in Supabase SQL Editor:**

#### 🔄 Human Action Required
**Claude will output SQL commands. Human must:**
- [ ] Copy SQL commands from Claude's output
- [ ] Go to Supabase Dashboard > SQL Editor
- [ ] Paste and execute each SQL block in order
- [ ] Verify tables were created in Database > Tables

#### ✅ Claude Tasks - Phase 2
- [ ] Generate complete SQL schema for friend groups system
- [ ] Create Row Level Security (RLS) policies
- [ ] Create database functions for group operations
- [ ] Create database indexes for performance
- [ ] Provide verification queries to test setup

#### Schema Creation Checklist:
```sql
-- Claude will provide these SQL blocks:
- [ ] friend_groups table with invite codes
- [ ] group_memberships table with roles  
- [ ] Updated players table (group-scoped)
- [ ] Updated matches table (group-scoped)
- [ ] group_invitations table for invite management
- [ ] All RLS policies for data isolation
- [ ] Database functions (create_friend_group, join_group_by_invite_code, etc.)
- [ ] Performance indexes
```

### Phase 3: Authentication System Implementation
**Claude can fully implement this:**

#### ✅ Claude Tasks - Phase 3
- [ ] Create authentication hook (`src/hooks/useAuth.ts`)
- [ ] Create magic link login component (`src/components/AuthForm.tsx`)
- [ ] Create protected route wrapper (`src/components/ProtectedRoute.tsx`)
- [ ] Update App.tsx to handle authentication state
- [ ] Add loading states and error handling
- [ ] Style authentication UI to match existing design

#### Authentication Implementation Checklist:
```typescript
// Claude should create/update:
- [ ] useAuth hook with session management
- [ ] AuthForm component with email input and magic link sending
- [ ] ProtectedRoute wrapper component
- [ ] Authentication state management in App.tsx
- [ ] Error handling for auth failures
- [ ] Loading states during auth processes
```

### Phase 4: Group Management System
**Claude can fully implement this:**

#### ✅ Claude Tasks - Phase 4
- [ ] Create group service layer (`src/services/groupService.ts`)
- [ ] Create group selection UI (`src/components/GroupSelector.tsx`)
- [ ] Create group creation modal (`src/components/CreateGroupModal.tsx`)
- [ ] Create join group modal (`src/components/JoinGroupModal.tsx`)
- [ ] Add group switching functionality
- [ ] Update navigation to show current group
- [ ] Handle invite link routing and auto-joining

#### Group Management Checklist:
```typescript
// Claude should create:
- [ ] groupService with CRUD operations
- [ ] GroupSelector component for switching between groups
- [ ] CreateGroupModal with form validation
- [ ] JoinGroupModal with invite code input
- [ ] Group context provider for current group state
- [ ] Invite link handling in App.tsx
- [ ] Group navigation and breadcrumbs
```

### Phase 5: Data Layer Implementation (Group-aware)
**Claude can fully implement this:**

#### ✅ Claude Tasks - Phase 5
- [ ] Update `useGameLogic` hook to be group-aware
- [ ] Create group-scoped player service (`src/services/playersService.ts`)
- [ ] Create group-scoped match service (`src/services/matchesService.ts`)
- [ ] Update all components to use group context
- [ ] Add loading states and error handling
- [ ] Implement optimistic UI updates
- [ ] Remove local sample data and use Supabase

#### Data Layer Implementation Checklist:
```typescript
// Claude should update/create:
- [ ] useGameLogic hook with groupId parameter
- [ ] playersService with group-scoped queries
- [ ] matchesService with group-scoped queries
- [ ] Update PlayerRankings component for groups
- [ ] Update MatchHistory component for groups
- [ ] Update AddPlayerModal for group context
- [ ] Update RecordMatchForm for group context
- [ ] Error boundaries and fallback UI
- [ ] Replace sample data with empty state/onboarding
```

#### Important: Players Are Names/Avatars Only
**Claude should implement with this understanding:**
- [ ] Players are just names and avatars within groups
- [ ] No user account connection required for players
- [ ] Any group member can add any player name
- [ ] Players represent people who may or may not have app accounts
- [ ] Focus on simple name/avatar management within groups

### Phase 6: Real-time Features
**Claude can fully implement this:**

#### ✅ Claude Tasks - Phase 6
- [ ] Add real-time subscriptions for group players
- [ ] Add real-time subscriptions for group matches
- [ ] Implement connection management
- [ ] Add subscription cleanup on group changes
- [ ] Handle connection errors gracefully
- [ ] Optimize subscription performance

#### Real-time Implementation Checklist:
```typescript
// Claude should implement:
- [ ] Group-scoped real-time subscriptions
- [ ] Subscription lifecycle management
- [ ] Connection error handling
- [ ] Subscription cleanup on unmount
- [ ] Optimistic updates with real-time sync
- [ ] Performance optimization for multiple subscriptions
```

### Phase 7: Testing and Polish
**Claude can implement most of this:**

#### ✅ Claude Tasks - Phase 7
- [ ] Update existing tests for new authentication flow
- [ ] Add tests for group functionality
- [ ] Create integration tests for Supabase operations
- [ ] Add error handling and loading states
- [ ] Optimize performance and bundle size
- [ ] Update documentation and type definitions

#### 🔄 Human Testing Required
**Human should test:**
- [ ] Magic link email delivery and login flow
- [ ] Group creation and invite sharing
- [ ] Multi-user group interaction
- [ ] Data isolation between groups
- [ ] Mobile responsiveness
- [ ] Production deployment

## Implementation Commands for Claude

### Getting Started
```bash
# Claude should run these commands:
npm install @supabase/supabase-js
npm run test  # Ensure existing tests still pass
npm run build # Ensure build works before starting
```

### Phase-by-Phase Implementation
**Claude should implement in this exact order:**

1. **Phase 1**: "Implement Supabase client configuration and connection"
2. **Phase 2**: "Generate database schema SQL for human to execute"
3. **Phase 3**: "Implement magic link authentication system"
4. **Phase 4**: "Implement group management and invite system"
5. **Phase 5**: "Implement group-aware data layer with Supabase operations"
6. **Phase 6**: "Add real-time subscriptions for group data"
7. **Phase 7**: "Update tests and add error handling"

### Verification Steps
**After each phase, Claude should:**
- [ ] Run `npm run build` to ensure no build errors
- [ ] Run `npm run test` to ensure tests pass
- [ ] Run `npm run typecheck` to ensure TypeScript compliance
- [ ] Provide clear instructions for human verification

## Human Responsibilities During Implementation

### Before Claude Starts
- [ ] Complete all prerequisites (Supabase project, environment variables)
- [ ] Verify environment variables are loaded correctly
- [ ] Ensure development server runs: `npm run dev`

### During Database Schema Phase
- [ ] Execute SQL commands provided by Claude in Supabase dashboard
- [ ] Verify tables and policies were created correctly
- [ ] Report any SQL execution errors to Claude

### During Testing Phases
- [ ] Test authentication flow (magic link emails)
- [ ] Test group creation and joining
- [ ] Test invite link sharing
- [ ] Verify data isolation between groups
- [ ] Test on different devices/browsers

### Final Deployment
- [ ] Deploy to production hosting
- [ ] Update Supabase redirect URLs for production domain
- [ ] Test production authentication flow
- [ ] Monitor for any errors or issues

## Common Issues and Solutions

### Environment Variables Not Loading
**Human should check:**
- [ ] `.env.local` file exists in project root
- [ ] Variable names start with `VITE_`
- [ ] Restart development server after adding variables

### Authentication Not Working
**Human should verify:**
- [ ] Supabase auth settings are correct
- [ ] Email delivery is working (check spam folder)
- [ ] Redirect URLs include current domain

### Database Errors
**Human should check:**
- [ ] All SQL commands were executed successfully
- [ ] RLS policies are enabled on all tables
- [ ] Database functions were created without errors

## Success Criteria

### Phase Completion Indicators
**Claude implementation is successful when:**
- [ ] All TypeScript compilation errors are resolved
- [ ] All existing tests continue to pass
- [ ] New functionality works in development environment
- [ ] No console errors during normal operation
- [ ] Build process completes successfully

### Final Success Criteria
**Project is ready for production when:**
- [ ] Magic link authentication works end-to-end
- [ ] Users can create and join groups via invite links
- [ ] All foosball tracking functionality works within groups
- [ ] Data is completely isolated between groups
- [ ] Real-time updates work across group members
- [ ] Application is fully responsive and polished

This plan provides clear separation of concerns: **humans handle Supabase project setup and SQL execution**, while **Claude handles all TypeScript/React implementation**.

---

## Database Schema (For Human Execution)

**Claude will provide these SQL commands in Phase 2. The human must execute them in Supabase SQL Editor in this exact order:**

### Step 1: Create Friend Groups Table
```sql
-- Execute this first
CREATE TABLE friend_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  name text NOT NULL,
  description text,
  invite_code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'base64'),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  max_members integer DEFAULT 50 NOT NULL,
  CONSTRAINT name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 50)
);

-- Enable Row Level Security
ALTER TABLE friend_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_groups
CREATE POLICY "Users can access their groups" ON friend_groups
  FOR SELECT USING (
    id IN (
      SELECT group_id FROM group_memberships 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Owners can update groups" ON friend_groups
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Anyone can create groups" ON friend_groups
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners can delete groups" ON friend_groups
  FOR DELETE USING (owner_id = auth.uid());
```

### Step 2: Create Group Memberships Table
```sql
-- Execute this second
CREATE TABLE group_memberships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  group_id uuid REFERENCES friend_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(group_id, user_id),
  CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'member'))
);

-- Enable Row Level Security
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_memberships
CREATE POLICY "Users can see group memberships" ON group_memberships
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM group_memberships 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can manage memberships" ON group_memberships
  FOR ALL USING (
    group_id IN (
      SELECT group_id FROM group_memberships 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin') 
      AND is_active = true
    )
  );

CREATE POLICY "Users can join via invite" ON group_memberships
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave groups" ON group_memberships
  FOR UPDATE USING (user_id = auth.uid());
```

### Step 3: Create Players Table (Names/Avatars, No User Accounts)
```sql
-- Execute this third
-- Players are just names/avatars within groups, not tied to user accounts
CREATE TABLE players (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  name text NOT NULL,
  ranking integer DEFAULT 1200 NOT NULL,
  matches_played integer DEFAULT 0 NOT NULL,
  wins integer DEFAULT 0 NOT NULL,
  losses integer DEFAULT 0 NOT NULL,
  avatar text DEFAULT '👤'::text NOT NULL,
  department text DEFAULT 'Office'::text NOT NULL,
  group_id uuid REFERENCES friend_groups(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  CONSTRAINT ranking_bounds CHECK (ranking >= 800 AND ranking <= 2400),
  CONSTRAINT non_negative_stats CHECK (matches_played >= 0 AND wins >= 0 AND losses >= 0),
  UNIQUE(group_id, name) -- Unique names within each group
);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- RLS Policy for players
CREATE POLICY "Users can manage group players" ON players
  FOR ALL USING (
    group_id IN (
      SELECT group_id FROM group_memberships 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
```

### Step 4: Create Updated Matches Table
```sql
-- Execute this fourth
CREATE TABLE matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  group_id uuid REFERENCES friend_groups(id) ON DELETE CASCADE NOT NULL,
  team1_player1_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  team1_player2_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  team2_player1_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  team2_player2_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  team1_score integer NOT NULL,
  team2_score integer NOT NULL,
  match_date date DEFAULT CURRENT_DATE NOT NULL,
  match_time time DEFAULT CURRENT_TIME NOT NULL,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  CONSTRAINT valid_scores CHECK (team1_score >= 0 AND team2_score >= 0),
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
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- RLS Policy for matches
CREATE POLICY "Users can manage group matches" ON matches
  FOR ALL USING (
    group_id IN (
      SELECT group_id FROM group_memberships 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
```

### Step 5: Create Database Functions
```sql
-- Execute these functions fifth
CREATE OR REPLACE FUNCTION create_friend_group(
  p_name text,
  p_description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_group_id uuid;
  invite_code text;
BEGIN
  -- Create the group
  INSERT INTO friend_groups (name, description, owner_id, created_by)
  VALUES (p_name, p_description, auth.uid(), auth.uid())
  RETURNING id, invite_code INTO new_group_id, invite_code;

  -- Add creator as owner member
  INSERT INTO group_memberships (group_id, user_id, role, is_active)
  VALUES (new_group_id, auth.uid(), 'owner', true);

  RETURN json_build_object(
    'success', true,
    'group_id', new_group_id,
    'invite_code', invite_code,
    'name', p_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION join_group_by_invite_code(
  p_invite_code text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  group_record record;
  member_count integer;
  result json;
BEGIN
  -- Find the group by invite code
  SELECT id, name, max_members, is_active INTO group_record
  FROM friend_groups
  WHERE invite_code = p_invite_code AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM group_memberships 
    WHERE group_id = group_record.id AND user_id = p_user_id AND is_active = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member of this group');
  END IF;

  -- Check member limit
  SELECT COUNT(*) INTO member_count
  FROM group_memberships
  WHERE group_id = group_record.id AND is_active = true;

  IF member_count >= group_record.max_members THEN
    RETURN json_build_object('success', false, 'error', 'Group is at maximum capacity');
  END IF;

  -- Add user to group
  INSERT INTO group_memberships (group_id, user_id, role, is_active)
  VALUES (group_record.id, p_user_id, 'member', true);

  RETURN json_build_object(
    'success', true, 
    'group_id', group_record.id,
    'group_name', group_record.name
  );
END;
$$;
```

### Step 6: Create Performance Indexes
```sql
-- Execute these indexes last
CREATE INDEX idx_players_group_ranking ON players(group_id, ranking DESC);
CREATE INDEX idx_matches_group_date ON matches(group_id, match_date DESC);
CREATE INDEX idx_group_memberships_user ON group_memberships(user_id, is_active);
CREATE INDEX idx_group_memberships_group ON group_memberships(group_id, is_active);
CREATE INDEX idx_invitations_code ON friend_groups(invite_code);
```

### Verification Query
```sql
-- Run this to verify everything was created correctly
SELECT 
  'friend_groups' as table_name, 
  COUNT(*) as row_count 
FROM friend_groups
UNION ALL
SELECT 
  'group_memberships' as table_name, 
  COUNT(*) as row_count 
FROM group_memberships
UNION ALL
SELECT 
  'players' as table_name, 
  COUNT(*) as row_count 
FROM players
UNION ALL
SELECT 
  'matches' as table_name, 
  COUNT(*) as row_count 
FROM matches;
```

**After executing all SQL commands, human should verify:**
- [ ] All 4 tables appear in Database > Tables
- [ ] All tables show "RLS enabled" 
- [ ] Functions appear in Database > Functions
- [ ] Indexes appear in Database > Indexes
- [ ] Verification query returns 4 rows with 0 counts

---

## Ready for Claude Implementation

Once the human completes:
1. ✅ Supabase project setup
2. ✅ Environment variables configuration  
3. ✅ Database schema execution

**Claude can begin Phase 1 implementation immediately.**

### Quick Start Command for Claude:
```
"Please implement Phase 1: Supabase client configuration and connection. The human has completed all prerequisites and database setup."
```

---

## Key Implementation Notes for Claude

### Player Management Approach
- **Players are names/avatars only** - not tied to user accounts
- **Any group member** can add player names (e.g., "John", "Sarah", "Mike")
- **Players represent real people** who may or may not have app accounts
- **Simple name/avatar tracking** within each group's context
- **No authentication required** for players themselves

### Group-Based Data Isolation
- **All data scoped to groups** - no cross-group visibility
- **Invite-only access** - no public group discovery
- **Complete privacy** - users only see their groups' data
- **Real-time updates** within group boundaries only

### Authentication Flow
- **Magic links only** - no password complexity
- **Email-based signup/login** - minimal friction
- **Automatic group joining** via invite links
- **Protected routes** for authenticated users only

---

## Final Notes

This plan provides a complete roadmap for implementing a **secure, private, group-based foosball tracking system** with:

✅ **Magic link authentication** (passwordless)  
✅ **Private friend groups** (invite-only)  
✅ **Complete data isolation** (RLS enforced)  
✅ **Simple player management** (names/avatars only)  
✅ **Real-time updates** (group-scoped)  
✅ **Clear separation of concerns** (human setup vs Claude implementation)

**Ready for development!** 🚀
