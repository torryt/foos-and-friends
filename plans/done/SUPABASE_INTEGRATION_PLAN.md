# Supabase Backend Integration Plan for Claude Code

## Overview
This document provides step-by-step instructions for Claude Code to integrate the foosball tracking app with Supabase. The implementation will add **magic link authentication**, **private friend groups**, and **invite-only group access** with complete data isolation.

## Prerequisites (Human Setup Required)

### ✅ Supabase Project Setup
**The human must complete these steps before Claude can begin implementation:**

1. **Create Supabase Project**
   - [x] Go to https://supabase.com and create new project
   - [x] Choose project name and region
   - [x] Wait for project provisioning to complete
   - [x] Note down project URL and anon key from Settings > API

2. **Configure Authentication**
   - [x] Navigate to Authentication > Settings in Supabase dashboard
   - [ ] Enable "Enable email confirmations" 
   - [ ] Disable "Enable email confirmations" (for magic links)
   - [x] Enable "Enable phone confirmations" = OFF
   - [x] Set "Site URL" to your domain (e.g., `https://yourapp.com`)
   - [x] Add redirect URLs for development: `http://localhost:5173/**`

3. **Configure Magic Link Authentication**
   - [x] Go to Authentication > Settings > Auth
   - [x] Ensure "Enable signup" is ON
   - [x] Set "Minimum password length" (not used but required)
   - [x] In "Magic Link" section, ensure it's enabled

4. **Set Up Environment Variables**
   - [x] Create `.env.local` file in project root
   - [x] Add the following variables:
   ```
   VITE_SUPABASE_URL=your_project_url_here
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```
   - [x] Add `.env.local` to `.gitignore` if not already there

5. **Email Configuration (Optional but Recommended)**
   - [ ] Go to Authentication > Settings > SMTP Settings
   - [ ] Configure custom SMTP or use Supabase default for now
   - [ ] Customize email templates in Authentication > Templates



### ✅ Domain/Hosting Setup (If Deploying)
**For production deployment:**
- [ ] Set up domain and hosting (Vercel, Netlify, etc.)
- [ ] Add production URL to Supabase redirect URLs
- [ ] Configure environment variables in hosting platform


**COMMENT FROM HUMAN:**
- I will proceed without custom SMTP for now and use Supabase default email service. I will also not deploy it for now, just run locally.
- Must maintain ability to run fully mocked version of the app for development without Supabase connection

## Mock Mode Requirements
**Critical**: The app must continue to work in mock mode when:
- No `.env.local` file exists
- Environment variables are missing
- Supabase is unreachable
- Database setup is incomplete

Mock mode should provide:
- Local sample data (existing functionality)
- No authentication required
- All features work offline
- Seamless fallback from Supabase mode

## Implementation Phases (Claude Code Tasks)

### Phase 1: Install Dependencies and Configure Supabase Client
**Claude can implement this immediately after environment setup:**

#### ✅ Claude Tasks - Phase 1
- [x] Install Supabase client: `npm install @supabase/supabase-js`
- [x] Create `src/lib/supabase.ts` with client configuration
- [x] Update type definitions for Supabase types
- [x] Create environment variable validation
- [x] Test Supabase connection in development
- [x] Add mock mode functionality to maintain local development without Supabase

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

#### ✅ Human Action Completed
**Claude provided SQL commands. Human has:**
- [x] Copy SQL commands from Claude's output
- [x] Go to Supabase Dashboard > SQL Editor
- [x] Paste and execute each SQL block in order
- [x] Verify tables were created in Database > Tables
- [x] **DATABASE SETUP COMPLETE**

#### ✅ Claude Tasks - Phase 2
- [x] Generate complete SQL schema for friend groups system
- [x] Create Row Level Security (RLS) policies
- [x] Create database functions for group operations
- [x] Create database indexes for performance
- [x] Provide verification queries to test setup
- [x] Fix SQL dependency issues between tables

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
- [x] Create authentication hook (`src/hooks/useAuth.ts`)
- [x] Create magic link login component (`src/components/AuthForm.tsx`)
- [x] Create protected route wrapper (`src/components/ProtectedRoute.tsx`)
- [x] Update App.tsx to handle authentication state
- [x] Add loading states and error handling
- [x] Style authentication UI to match existing design

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
- [x] Create group service layer (`src/services/groupService.ts`)
- [x] Create group selection UI (`src/components/GroupSelector.tsx`)
- [x] Create group creation modal (`src/components/CreateGroupModal.tsx`)
- [x] Create join group modal (`src/components/JoinGroupModal.tsx`)
- [x] Add group switching functionality
- [x] Update navigation to show current group
- [x] Create group context provider (`src/contexts/GroupContext.tsx`)
- [x] Handle invite link routing and auto-joining

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
- [x] Update `useGameLogic` hook to be group-aware
- [x] Create group-scoped player service (`src/services/playersService.ts`)
- [x] Create group-scoped match service (`src/services/matchesService.ts`)
- [x] Update all components to use group context
- [x] Add loading states and error handling
- [x] Implement optimistic UI updates
- [x] Remove local sample data and use Supabase

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


### Phase 6: Testing and Polish
**Claude can implement most of this:**

#### ✅ Claude Tasks - Phase 6
- [x] Update existing tests for new authentication flow
- [x] Add tests for group functionality  
- [x] Create integration tests for Supabase operations
- [x] Add error handling and loading states
- [x] Optimize performance and bundle size
- [x] Update documentation and type definitions

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
6. **Phase 6**: "Update tests and add error handling"

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

**SQL scripts are located in the `database/` folder. Execute them in the exact order specified in `database/README.md`:**

### Database Setup Instructions:
1. **Navigate to the `database/` folder** in this project
2. **Follow the execution order** in `database/README.md` 
3. **Execute each `.sql` file** in Supabase SQL Editor
4. **Run verification queries** to ensure setup is complete

### Migration Strategy:
- **New database changes** are added as numbered migration files (e.g., `09_migration_name.sql`)
- **All migrations are incremental** and can be applied to existing databases
- **Migration order is critical** - follow the numbering sequence

See the `database/` folder for all SQL scripts. The folder contains:
- Complete database schema setup scripts (01-08)
- Execution instructions in `README.md`
- Migration strategy for future changes

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
