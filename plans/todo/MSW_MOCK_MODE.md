# MSW Mock Mode Architecture Plan

**Date**: January 2025  
**Status**: TODO  
**Focus**: Detach mock logic from app using MSW for HTTP request interception

## Executive Summary

Replace the current inline mock mode system with Mock Service Worker (MSW) to create a completely detached mock architecture. This approach will use real HTTP requests intercepted by MSW, with the mock server maintaining its own state and replicating Supabase's behavior patterns.

## Current Problem Analysis

### Current Mock Implementation Issues
- **Tightly Coupled**: Mock logic is embedded throughout the application code
- **Maintenance Overhead**: Every service method needs mock branching logic
- **Testing Complexity**: Hard to test real HTTP flows in development
- **Code Pollution**: `isMockMode` checks scattered across components and hooks
- **State Inconsistency**: Mock state doesn't persist across page reloads
- **Authentication Simulation**: Fake auth flows don't match real Supabase patterns

### Files Currently Affected by Mock Logic
```
src/lib/supabase.ts - Mock detection and fallback client
src/hooks/useAuth.ts - Mock user simulation and auth methods
src/services/ - All service files have mock branching
src/contexts/GroupContext.tsx - Mock group management
src/components/AuthForm.tsx - Mock authentication UI
```

## Proposed MSW Architecture

### Core Concept
- **Environment Variable**: `VITE_DISABLE_AUTH=true` disables Supabase entirely
- **MSW Interceptor**: Catches all HTTP requests to Supabase endpoints
- **Mock Supabase Server**: Maintains state and replicates Supabase API behavior
- **Real HTTP Flows**: Application code remains unchanged, uses actual HTTP requests
- **Persistent State**: Mock data persists in localStorage between sessions

### Architecture Overview

```
┌─────────────────┐    Real HTTP     ┌─────────────────┐
│   React App     │ ──────────────→  │   MSW Handler   │
│                 │                  │                 │
│ - useAuth       │                  │ - Auth Routes   │
│ - Services      │                  │ - Database API  │
│ - Components    │    (intercepted) │ - Realtime      │
└─────────────────┘                  └─────────────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │  Mock Database  │
                                     │                 │
                                     │ - localStorage  │
                                     │ - State mgmt    │
                                     │ - RLS logic     │
                                     └─────────────────┘
```

## Technical Implementation

### Phase 1: Environment Setup and MSW Integration (2-3 hours)

#### 1.1 Dependencies and Configuration
```bash
npm install --save-dev msw
```

#### 1.2 Environment Variable Setup
```env
# .env.local
VITE_DISABLE_AUTH=true  # Enables MSW mock mode
```

#### 1.3 MSW Setup Files
```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
```

#### 1.4 Conditional MSW Initialization
```typescript
// src/main.tsx
async function enableMocking() {
  if (import.meta.env.VITE_DISABLE_AUTH !== 'true') {
    return
  }

  const { worker } = await import('./mocks/browser')
  return worker.start({
    onUnhandledRequest: 'bypass',
  })
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
})
```

### Phase 2: Mock Database State Management (3-4 hours)

#### 2.1 Mock Database Schema
```typescript
// src/mocks/database/schema.ts
export interface MockDatabase {
  users: MockUser[]
  sessions: MockSession[]
  friend_groups: MockFriendGroup[]
  group_memberships: MockGroupMembership[]
  players: MockPlayer[]
  matches: MockMatch[]
}

export interface MockUser {
  id: string
  email: string
  email_confirmed_at: string | null
  created_at: string
  updated_at: string
}

export interface MockSession {
  access_token: string
  refresh_token: string
  user_id: string
  expires_at: number
}
```

#### 2.2 Persistent State Manager
```typescript
// src/mocks/database/state.ts
class MockDatabaseState {
  private static STORAGE_KEY = 'msw-mock-database'
  
  private db: MockDatabase

  constructor() {
    this.db = this.loadFromStorage() || this.createInitialData()
  }

  private loadFromStorage(): MockDatabase | null {
    const stored = localStorage.getItem(MockDatabaseState.STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  }

  private saveToStorage(): void {
    localStorage.setItem(
      MockDatabaseState.STORAGE_KEY, 
      JSON.stringify(this.db)
    )
  }

  // CRUD operations that mirror Supabase patterns
  getUsers() { return this.db.users }
  getUserById(id: string) { return this.db.users.find(u => u.id === id) }
  
  // Auto-save after mutations
  createUser(userData: Partial<MockUser>): MockUser {
    const user = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...userData
    } as MockUser
    
    this.db.users.push(user)
    this.saveToStorage()
    return user
  }
}

export const mockDb = new MockDatabaseState()
```

#### 2.3 Row Level Security Simulation
```typescript
// src/mocks/database/rls.ts
export class RLSEngine {
  static filterByUserAccess<T extends { user_id?: string }>(
    records: T[], 
    currentUserId: string | null
  ): T[] {
    if (!currentUserId) return []
    return records.filter(record => record.user_id === currentUserId)
  }

  static filterByGroupAccess(
    records: any[], 
    currentUserId: string | null,
    groupId: string
  ) {
    if (!currentUserId) return []
    
    // Check if user is member of the group
    const membership = mockDb.getGroupMemberships()
      .find(m => m.user_id === currentUserId && m.group_id === groupId)
    
    return membership ? records.filter(r => r.group_id === groupId) : []
  }
}
```

### Phase 3: Supabase API Handlers (4-5 hours)

#### 3.1 Authentication Endpoints
```typescript
// src/mocks/handlers/auth.ts
import { http, HttpResponse } from 'msw'
import { mockDb } from '../database/state'

export const authHandlers = [
  // Magic link sign in
  http.post('*/auth/v1/otp', async ({ request }) => {
    const body = await request.json()
    const { email } = body as { email: string }
    
    // Simulate email sending
    console.log(`Mock: Magic link sent to ${email}`)
    
    // Auto-create user and session for immediate login in mock mode
    let user = mockDb.getUserByEmail(email)
    if (!user) {
      user = mockDb.createUser({
        email,
        email_confirmed_at: new Date().toISOString()
      })
    }
    
    const session = mockDb.createSession(user.id)
    
    return HttpResponse.json({ 
      user, 
      session,
      error: null 
    })
  }),

  // Get current session
  http.get('*/auth/v1/user', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return HttpResponse.json({ user: null, error: null })
    }
    
    const session = mockDb.getSessionByToken(token)
    if (!session) {
      return HttpResponse.json({ user: null, error: { message: 'Invalid token' } })
    }
    
    const user = mockDb.getUserById(session.user_id)
    return HttpResponse.json({ user, error: null })
  }),

  // Sign out
  http.post('*/auth/v1/logout', () => {
    // In real implementation, would invalidate the token
    return HttpResponse.json({ error: null })
  })
]
```

#### 3.2 Database REST API Handlers
```typescript
// src/mocks/handlers/database.ts
import { http, HttpResponse } from 'msw'
import { mockDb } from '../database/state'
import { RLSEngine } from '../database/rls'

export const databaseHandlers = [
  // Get friend groups
  http.get('*/rest/v1/friend_groups', ({ request }) => {
    const userId = getCurrentUserFromRequest(request)
    if (!userId) {
      return HttpResponse.json({ data: [], error: null })
    }
    
    // Apply RLS: only groups where user is a member
    const userGroups = mockDb.getFriendGroups()
      .filter(group => {
        const membership = mockDb.getGroupMemberships()
          .find(m => m.user_id === userId && m.group_id === group.id)
        return !!membership
      })
    
    return HttpResponse.json({ data: userGroups, error: null })
  }),

  // Create friend group
  http.post('*/rest/v1/friend_groups', async ({ request }) => {
    const userId = getCurrentUserFromRequest(request)
    if (!userId) {
      return HttpResponse.json({ data: null, error: { message: 'Unauthorized' } })
    }
    
    const body = await request.json()
    const group = mockDb.createFriendGroup({
      ...body,
      owner_id: userId,
      invite_code: generateInviteCode()
    })
    
    // Auto-create membership for owner
    mockDb.createGroupMembership({
      user_id: userId,
      group_id: group.id,
      role: 'owner'
    })
    
    return HttpResponse.json({ data: group, error: null })
  }),

  // Get players for a group
  http.get('*/rest/v1/players', ({ request }) => {
    const userId = getCurrentUserFromRequest(request)
    const url = new URL(request.url)
    const groupId = url.searchParams.get('group_id')
    
    if (!userId || !groupId) {
      return HttpResponse.json({ data: [], error: null })
    }
    
    const players = RLSEngine.filterByGroupAccess(
      mockDb.getPlayers(),
      userId,
      groupId
    )
    
    return HttpResponse.json({ data: players, error: null })
  })
]

function getCurrentUserFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (!token) return null
  
  const session = mockDb.getSessionByToken(token)
  return session?.user_id || null
}
```

#### 3.3 Realtime Simulation
```typescript
// src/mocks/handlers/realtime.ts
export const realtimeHandlers = [
  // WebSocket connection
  http.get('*/realtime/v1/*', () => {
    // Mock successful WebSocket handshake
    return new HttpResponse(null, { status: 101 })
  })
]

// Mock realtime subscriptions in the client
export class MockRealtimeClient {
  private subscriptions = new Map<string, Function[]>()
  
  channel(topic: string) {
    return {
      on: (event: string, callback: Function) => {
        const key = `${topic}:${event}`
        if (!this.subscriptions.has(key)) {
          this.subscriptions.set(key, [])
        }
        this.subscriptions.get(key)!.push(callback)
        return this
      },
      subscribe: () => {
        console.log(`Mock: Subscribed to ${topic}`)
        return Promise.resolve({ status: 'SUBSCRIBED' })
      }
    }
  }
  
  // Simulate real-time events
  simulateEvent(topic: string, event: string, payload: any) {
    const key = `${topic}:${event}`
    const callbacks = this.subscriptions.get(key) || []
    callbacks.forEach(callback => callback(payload))
  }
}
```

### Phase 4: Cleanup Application Code (2-3 hours)

#### 4.1 Simplify Supabase Client
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Remove all mock detection logic
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-key'

export const supabase = createClient(supabaseUrl, supabaseKey)

// MSW will intercept these requests when VITE_DISABLE_AUTH=true
export const isSupabaseAvailable = () => true
```

#### 4.2 Remove Mock Logic from Services
```typescript
// src/services/playerService.ts
import { supabase } from '@/lib/supabase'

export const playerService = {
  async getPlayers(groupId: string) {
    // Remove all isMockMode branching
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('group_id', groupId)
      .order('rating', { ascending: false })
    
    if (error) throw error
    return data
  },

  async createPlayer(playerData: Omit<Player, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('players')
      .insert(playerData)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}
```

#### 4.3 Simplify Authentication Hook
```typescript
// src/hooks/useAuth.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Remove all mock mode logic - MSW handles it
export const useAuth = () => {
  const [authState, setAuthState] = useState({
    user: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    // Single code path - MSW intercepts when in mock mode
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        setAuthState({ user: null, loading: false, error: error.message })
        return
      }

      setAuthState({
        user: session?.user ? mapToAuthUser(session.user) : null,
        loading: false,
        error: null
      })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setAuthState({
          user: session?.user ? mapToAuthUser(session.user) : null,
          loading: false,
          error: null
        })
      }
    )

    getSession()

    return () => subscription.unsubscribe()
  }, [])

  // Remove all mock branching logic
  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    
    return error ? { success: false, error: error.message } : { success: true }
  }

  return {
    ...authState,
    isAuthenticated: !!authState.user,
    signInWithMagicLink,
    signOut: () => supabase.auth.signOut()
  }
}
```

### Phase 5: Enhanced Mock Experience (1-2 hours)

#### 5.1 Mock Data Seeding
```typescript
// src/mocks/database/seedData.ts
export function createInitialMockData(): MockDatabase {
  const demoUser: MockUser = {
    id: 'demo-user-id',
    email: 'demo@foosandfriends.com',
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const demoGroup: MockFriendGroup = {
    id: 'demo-group-id',
    name: 'Demo Office',
    owner_id: demoUser.id,
    invite_code: 'DEMO123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // Rich sample data with realistic players and match history
  const samplePlayers: MockPlayer[] = [
    {
      id: 'player-1',
      name: 'Alice Champion',
      rating: 1650,
      wins: 25,
      losses: 15,
      group_id: demoGroup.id,
      user_id: demoUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    // ... more realistic sample data
  ]

  return {
    users: [demoUser],
    sessions: [],
    friend_groups: [demoGroup],
    group_memberships: [{
      id: 'membership-1',
      user_id: demoUser.id,
      group_id: demoGroup.id,
      role: 'owner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }],
    players: samplePlayers,
    matches: [] // Could include sample match history
  }
}
```

#### 5.2 Development Tools Integration
```typescript
// src/mocks/devtools.ts
export function setupMockDevTools() {
  if (import.meta.env.DEV) {
    // Add to window for debugging
    (window as any).__mockDb = mockDb
    
    // Console commands for developers
    console.log('🎮 Mock Mode Active!')
    console.log('Available commands:')
    console.log('  __mockDb.reset() - Reset to initial data')
    console.log('  __mockDb.export() - Export current state')
    console.log('  __mockDb.import(data) - Import data')
  }
}
```

## Implementation Benefits

### Developer Experience
- **Clean Code**: No more `isMockMode` checks scattered throughout the app
- **Real HTTP Flows**: Test actual request/response patterns
- **Persistent State**: Mock data survives page refreshes
- **Easy Toggle**: Single environment variable to switch modes
- **Better Testing**: Test real HTTP integration without Supabase

### Maintainability
- **Single Responsibility**: Mock logic isolated in MSW handlers
- **Type Safety**: Mock responses match real Supabase types
- **Reusable**: Same mock server for tests and development
- **Realistic**: Mock behavior closely mirrors Supabase patterns

### Performance
- **No Bundle Impact**: MSW only loads in development/test modes
- **Request Interception**: No network calls in mock mode
- **State Persistence**: Faster subsequent loads with localStorage

## Migration Strategy

### Phase-by-Phase Removal
1. **Setup MSW**: Add MSW infrastructure without removing existing mock logic
2. **Parallel Testing**: Run both systems simultaneously to verify behavior
3. **Gradual Removal**: Remove mock logic file by file, testing each change
4. **Final Cleanup**: Remove all `isMockMode` references and mock utilities

### Risk Mitigation
- **Feature Parity**: Ensure MSW handlers support all current mock features
- **State Migration**: Convert existing mock state format to new schema
- **Fallback Strategy**: Keep existing mock logic until MSW is fully proven
- **Testing Coverage**: Add tests for MSW handlers before removing old logic

## Testing Strategy

### MSW Handler Tests
```typescript
// src/mocks/__tests__/auth.handlers.test.ts
import { server } from '../server'
import { authHandlers } from '../handlers/auth'

describe('Auth Handlers', () => {
  test('should create user and session on magic link request', async () => {
    const response = await fetch('/auth/v1/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' })
    })
    
    const result = await response.json()
    expect(result.user.email).toBe('test@example.com')
    expect(result.session.access_token).toBeDefined()
  })
})
```

### Integration Tests with MSW
- Test components using real HTTP flows
- Verify RLS logic in mock handlers
- Test state persistence across sessions
- Validate error handling and edge cases

## Success Metrics

### Code Quality
- [ ] Zero `isMockMode` references in application code
- [ ] All services use single code path (no branching)
- [ ] Clean separation between app logic and mock implementation

### Functionality
- [ ] Full feature parity with current mock mode
- [ ] State persists across browser sessions
- [ ] All authentication flows work identically
- [ ] Real-time subscriptions simulate correctly

### Developer Experience
- [ ] Single environment variable toggles mock mode
- [ ] Mock setup time under 30 seconds
- [ ] Clear debugging tools and logging
- [ ] Easy data manipulation for testing scenarios

## Alternative Approaches Considered

### JSON Server
- **Pros**: Simple REST API mocking
- **Cons**: No authentication simulation, no RLS logic, separate server process

### Mirage JS  
- **Pros**: Good for API mocking, in-browser database
- **Cons**: Less active maintenance, different philosophy from MSW

### Custom Express Server
- **Pros**: Full control, real HTTP server
- **Cons**: Additional complexity, deployment concerns, separate process

### Why MSW is Optimal
- **Industry Standard**: Widely adopted for API mocking
- **Browser Integration**: No separate server process needed
- **Request Interception**: Works at network level, identical to real requests
- **TypeScript Support**: Excellent TypeScript integration
- **Test Integration**: Built for testing, great DX for development

## Next Steps

1. **Immediate**: Begin Phase 1 implementation with MSW setup
2. **Week 1**: Complete mock database and authentication handlers
3. **Week 2**: Implement all database API handlers with RLS simulation
4. **Week 3**: Remove existing mock logic and test thoroughly
5. **Week 4**: Add enhanced debugging tools and documentation

---

*This plan creates a professional-grade mock architecture that scales with the application while providing an excellent developer experience.*