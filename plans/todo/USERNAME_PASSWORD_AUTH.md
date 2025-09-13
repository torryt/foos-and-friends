# Username/Password Authentication Feature Plan

**Date**: January 2025  
**Status**: Planned  
**Priority**: Medium  
**Effort**: Large (6-8 hours)

## Overview

Add traditional username/password authentication as an alternative to magic link authentication. This provides users with familiar login experience while maintaining the existing passwordless option for convenience.

## Current State Analysis

### Existing Authentication System
- **Magic Link Only**: Current system uses Supabase `signInWithOtp()` for passwordless auth
- **AuthForm.tsx**: Single email input with magic link flow
- **useAuth.ts**: Handles magic link authentication and session management
- **Mock Mode**: Demo authentication without external dependencies
- **SMTP Dependency**: Requires email provider (Brevo) for magic links

### User Experience Gaps
- **Email dependency**: Users need access to email for every login
- **Corporate restrictions**: Some companies block external emails
- **User preference**: Some users prefer traditional password login
- **Offline scenarios**: Magic links require email connectivity

## Proposed Solution: Dual Authentication

### 1. Database Schema Updates

#### Extend User Profile for Usernames
```sql
-- Add username support to user metadata
-- Supabase auth.users table supports custom user_metadata

-- Create function to check username availability
CREATE OR REPLACE FUNCTION is_username_available(p_username text)
RETURNS boolean AS $$
BEGIN
  -- Check if username exists in user metadata
  RETURN NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE user_metadata->>'username' ILIKE p_username
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user by username
CREATE OR REPLACE FUNCTION get_user_by_username(p_username text)
RETURNS json AS $$
DECLARE
  user_record auth.users;
BEGIN
  SELECT * INTO user_record 
  FROM auth.users 
  WHERE user_metadata->>'username' ILIKE p_username;
  
  IF FOUND THEN
    RETURN json_build_object(
      'id', user_record.id,
      'email', user_record.email,
      'username', user_record.user_metadata->>'username',
      'created_at', user_record.created_at
    );
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Service Layer Implementation

#### Enhanced useAuth Hook
```tsx
interface AuthMethods {
  signInWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>
  signUpWithPassword: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signInWithPassword: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>
  checkUsernameAvailable: (username: string) => Promise<{ available: boolean; error?: string }>
  updateProfile: (updates: { username?: string; email?: string }) => Promise<{ success: boolean; error?: string }>
}

export const useAuth = (): AuthState & AuthMethods => {
  // ... existing state

  // Sign up with username and password
  const signUpWithPassword = async (
    username: string, 
    email: string, 
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (isMockMode) {
      // Mock signup - just validate inputs
      if (username.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters' }
      }
      console.log('Mock mode: Would create user', { username, email })
      return { success: true }
    }

    if (!isSupabaseAvailable() || !supabase) {
      return { success: false, error: 'Authentication service not available' }
    }

    try {
      // Check username availability first
      const { data: isAvailable } = await supabase.rpc('is_username_available', { 
        p_username: username 
      })
      
      if (!isAvailable) {
        return { success: false, error: 'Username is already taken' }
      }

      // Create user with email/password
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.toLowerCase(),
            display_name: username
          }
        }
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data.user) {
        return { success: false, error: 'Failed to create user account' }
      }

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create account'
      }
    }
  }

  // Sign in with username/email and password
  const signInWithPassword = async (
    usernameOrEmail: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (isMockMode) {
      console.log('Mock mode: Would sign in', { usernameOrEmail })
      return { success: true }
    }

    if (!isSupabaseAvailable() || !supabase) {
      return { success: false, error: 'Authentication service not available' }
    }

    try {
      let email = usernameOrEmail

      // If input doesn't look like email, try to find user by username
      if (!usernameOrEmail.includes('@')) {
        const { data: userData } = await supabase.rpc('get_user_by_username', {
          p_username: usernameOrEmail
        })
        
        if (userData?.email) {
          email = userData.email
        } else {
          return { success: false, error: 'Username not found' }
        }
      }

      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data.user) {
        return { success: false, error: 'Invalid credentials' }
      }

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to sign in'
      }
    }
  }

  // Check if username is available
  const checkUsernameAvailable = async (
    username: string
  ): Promise<{ available: boolean; error?: string }> => {
    if (isMockMode) {
      // Mock check - simulate some taken usernames
      const takenUsernames = ['admin', 'test', 'demo', 'user']
      return { 
        available: !takenUsernames.includes(username.toLowerCase())
      }
    }

    if (!isSupabaseAvailable() || !supabase) {
      return { available: false, error: 'Service not available' }
    }

    try {
      const { data, error } = await supabase.rpc('is_username_available', {
        p_username: username
      })

      if (error) {
        return { available: false, error: error.message }
      }

      return { available: !!data }
    } catch (err) {
      return {
        available: false,
        error: err instanceof Error ? err.message : 'Failed to check username'
      }
    }
  }

  return {
    // ... existing properties
    signUpWithPassword,
    signInWithPassword,
    checkUsernameAvailable,
  }
}
```

### 3. Enhanced UI Components

#### New AuthModeSelector Component
```tsx
interface AuthModeProps {
  mode: 'signin' | 'signup' | 'magic-link'
  onModeChange: (mode: 'signin' | 'signup' | 'magic-link') => void
}

export const AuthModeSelector = ({ mode, onModeChange }: AuthModeProps) => {
  return (
    <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
      <button
        onClick={() => onModeChange('signin')}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          mode === 'signin'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Sign In
      </button>
      <button
        onClick={() => onModeChange('signup')}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          mode === 'signup'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Sign Up
      </button>
      <button
        onClick={() => onModeChange('magic-link')}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          mode === 'magic-link'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Magic Link
      </button>
    </div>
  )
}
```

#### Enhanced AuthForm Component
```tsx
import { useState, useEffect } from 'react'
import { Eye, EyeOff, Check, X } from 'lucide-react'

type AuthMode = 'signin' | 'signup' | 'magic-link'

export const AuthForm = ({ onSuccess }: AuthFormProps) => {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { 
    signInWithMagicLink, 
    signInWithPassword, 
    signUpWithPassword,
    checkUsernameAvailable,
    isMockMode 
  } = useAuth()

  // Username availability check with debouncing
  useEffect(() => {
    if (mode === 'signup' && username.length >= 3) {
      const timeoutId = setTimeout(async () => {
        const result = await checkUsernameAvailable(username)
        setUsernameAvailable(result.available)
      }, 500)

      return () => clearTimeout(timeoutId)
    } else {
      setUsernameAvailable(null)
    }
  }, [username, mode, checkUsernameAvailable])

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          return
        }
        
        const result = await signUpWithPassword(username, email, password)
        if (result.success) {
          setMessage('Account created successfully! Please check your email to verify your account.')
          // Reset form
          setUsername('')
          setEmail('')
          setPassword('')
          setConfirmPassword('')
        } else {
          setError(result.error || 'Failed to create account')
        }
      } else {
        const result = await signInWithPassword(username || email, password)
        if (result.success) {
          onSuccess?.()
        } else {
          setError(result.error || 'Failed to sign in')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const renderPasswordForm = () => (
    <form onSubmit={handlePasswordAuth} className="space-y-4">
      {/* Username/Email field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {mode === 'signup' ? 'Username' : 'Username or Email'}
        </label>
        <div className="relative">
          <input
            type="text"
            value={mode === 'signup' ? username : (username || email)}
            onChange={(e) => {
              if (mode === 'signup') {
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
              } else {
                // Allow both username and email for signin
                const value = e.target.value
                if (value.includes('@')) {
                  setEmail(value)
                  setUsername('')
                } else {
                  setUsername(value.toLowerCase())
                  setEmail('')
                }
              }
            }}
            placeholder={mode === 'signup' ? 'your_username' : 'username or email@example.com'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
          
          {/* Username availability indicator */}
          {mode === 'signup' && username.length >= 3 && (
            <div className="absolute right-3 top-2.5">
              {usernameAvailable === true && <Check className="text-green-500" size={16} />}
              {usernameAvailable === false && <X className="text-red-500" size={16} />}
            </div>
          )}
        </div>
        
        {/* Username validation messages */}
        {mode === 'signup' && username.length > 0 && (
          <div className="mt-1 text-xs">
            {username.length < 3 ? (
              <span className="text-red-600">Username must be at least 3 characters</span>
            ) : usernameAvailable === false ? (
              <span className="text-red-600">Username is already taken</span>
            ) : usernameAvailable === true ? (
              <span className="text-green-600">Username is available</span>
            ) : (
              <span className="text-gray-500">Checking availability...</span>
            )}
          </div>
        )}
      </div>

      {/* Email field (signup only) */}
      {mode === 'signup' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@company.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      )}

      {/* Password field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {mode === 'signup' && (
          <div className="mt-1 text-xs text-gray-500">
            Password must be at least 6 characters
          </div>
        )}
      </div>

      {/* Confirm password (signup only) */}
      {mode === 'signup' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
            minLength={6}
          />
          {confirmPassword && password !== confirmPassword && (
            <div className="mt-1 text-xs text-red-600">
              Passwords do not match
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || (mode === 'signup' && (!usernameAvailable || password !== confirmPassword))}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
      >
        {isLoading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
      </button>
    </form>
  )

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Welcome to Foos & Friends</h2>
        <p className="text-gray-600 mt-2">
          {isMockMode ? 'Running in demo mode' : 'Choose your preferred sign-in method'}
        </p>
      </div>

      {!isMockMode && (
        <AuthModeSelector mode={mode} onModeChange={setMode} />
      )}

      {isMockMode ? (
        renderMockMode()
      ) : mode === 'magic-link' ? (
        renderMagicLinkForm()
      ) : (
        renderPasswordForm()
      )}

      {/* Messages and errors */}
      {message && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">{message}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}
```

### 4. User Profile Management

#### Profile Settings Component
```tsx
export const ProfileSettings = () => {
  const { user, updateProfile } = useAuth()
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  
  return (
    <div className="profile-settings">
      <h3>Profile Settings</h3>
      
      <form onSubmit={handleUpdateProfile}>
        <div>
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <button type="submit">Update Profile</button>
      </form>
    </div>
  )
}
```

### 5. Password Reset Flow

#### Password Reset Component
```tsx
export const PasswordResetForm = () => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      
      if (error) {
        setError(error.message)
      } else {
        setMessage('Password reset email sent! Check your inbox.')
      }
    } catch (err) {
      setError('Failed to send password reset email')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handlePasswordReset}>
      <div>
        <label>Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Reset Password'}
      </button>
    </form>
  )
}
```

### 6. Security Considerations

#### Password Requirements
```tsx
const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  // Optional: Special characters
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password should contain at least one special character')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
```

#### Username Validation
```tsx
const validateUsername = (username: string): { valid: boolean; error?: string } => {
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' }
  }
  
  if (username.length > 20) {
    return { valid: false, error: 'Username must be less than 20 characters' }
  }
  
  if (!/^[a-z0-9_]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain lowercase letters, numbers, and underscores' }
  }
  
  const reservedUsernames = ['admin', 'api', 'www', 'mail', 'ftp', 'root', 'support']
  if (reservedUsernames.includes(username)) {
    return { valid: false, error: 'Username is reserved' }
  }
  
  return { valid: true }
}
```

## Implementation Steps

### Phase 1: Backend Foundation (2 hours)
1. Add username validation database functions
2. Update Supabase auth configuration for password auth
3. Test username uniqueness checking
4. Set up user metadata structure

### Phase 2: Service Layer (2 hours)
1. Extend useAuth hook with password methods
2. Implement signup with username/email/password
3. Implement signin with username or email
4. Add username availability checking

### Phase 3: UI Components (3 hours)
1. Create AuthModeSelector component
2. Enhance AuthForm with password fields
3. Implement show/hide password functionality
4. Add password strength indicators

### Phase 4: Profile Management (1 hour)
1. Add username to user profile display
2. Create profile settings for username/email updates
3. Add password reset functionality

## User Flows

### Sign Up Flow
1. User selects "Sign Up" tab
2. User enters desired username (with live availability check)
3. User enters email address
4. User creates password (with strength validation)
5. User confirms password
6. User submits form
7. Account created and email verification sent

### Sign In Flow
1. User selects "Sign In" tab
2. User enters username or email
3. User enters password
4. User submits form
5. User is authenticated and redirected

### Password Reset Flow
1. User clicks "Forgot Password?" link
2. User enters email address
3. Password reset email sent
4. User clicks link in email
5. User sets new password

## Testing Strategy

### Unit Tests
```tsx
describe('Username/Password Auth', () => {
  test('validates username format correctly', () => {
    expect(validateUsername('user123')).toEqual({ valid: true })
    expect(validateUsername('us')).toEqual({ 
      valid: false, 
      error: 'Username must be at least 3 characters' 
    })
  })

  test('checks username availability', async () => {
    const result = await checkUsernameAvailable('newuser')
    expect(result.available).toBe(true)
  })

  test('signs up user with valid credentials', async () => {
    const result = await signUpWithPassword('testuser', 'test@example.com', 'password123')
    expect(result.success).toBe(true)
  })
})
```

### Integration Tests
- [ ] Complete signup flow creates user account
- [ ] Username availability check works correctly
- [ ] Sign in with username or email works
- [ ] Password reset flow sends email correctly

## Security Considerations

### Password Security
- Minimum 6 character requirement
- Optional complexity requirements (uppercase, numbers, special chars)
- Supabase handles password hashing automatically
- Rate limiting on authentication attempts

### Username Security
- Prevent username enumeration attacks
- Reserved username list
- Case-insensitive uniqueness
- Character restrictions (alphanumeric + underscore)

### Account Security
- Email verification required
- Password reset requires email confirmation
- Session management handled by Supabase
- Optional 2FA can be added later

## Accessibility

### Screen Readers
```tsx
<input
  type="password"
  aria-describedby="password-requirements"
  aria-invalid={!isPasswordValid}
/>
<div id="password-requirements" className="sr-only">
  Password must be at least 6 characters long
</div>
```

### Keyboard Navigation
- Tab order through form fields
- Enter to submit forms
- Escape to cancel operations
- Proper focus management

## Performance Impact

### Bundle Size
- Email validation logic (~1KB)
- Enhanced UI components (~2KB)
- Password validation (~1KB)
- Total impact: ~4KB

### Runtime Performance
- Email validation on input
- Password validation on input
- Minimal impact on authentication flow

## Migration Strategy

### Existing Users
- Current magic link users continue working
- No forced migration required
- Users can optionally add username to profile
- Backward compatibility maintained

### New Features
- Progressive enhancement approach
- Magic link remains default for simplicity
- Username/password as opt-in feature
- Clear benefits communicated

## Future Enhancements

### Advanced Features
1. **Social Login**: Google, Microsoft, GitHub integration
2. **Two-Factor Authentication**: TOTP, SMS, hardware keys
3. **SSO Integration**: SAML, OAuth for enterprise
4. **Biometric Auth**: WebAuthn for modern browsers

### User Experience
1. **Remember Me**: Extended session duration
2. **Auto-login**: After successful signup
3. **Account Linking**: Merge magic link and password accounts
4. **Login History**: Show recent login attempts

## Risk Assessment

### Medium Risks
- **Password Management**: Users may forget passwords
- **Username Conflicts**: Popular usernames taken quickly
- **Email Verification**: Users may not verify email

### Low Risks
- **Security**: Supabase handles password security
- **Performance**: Minimal impact on app speed
- **Compatibility**: Works alongside existing auth

### Mitigation Strategies
- **Password Reset**: Easy recovery process
- **Username Suggestions**: Offer alternatives when taken
- **Email Reminders**: Resend verification emails
- **Clear Instructions**: Guide users through flows

## Success Metrics

### Functionality
- [ ] Users can create accounts with username/password
- [ ] Username availability checking works in real-time
- [ ] Sign in works with username or email
- [ ] Password reset flow completes successfully

### User Experience
- [ ] Form validation provides helpful feedback
- [ ] Password visibility toggle works correctly
- [ ] Authentication mode switching is intuitive
- [ ] Error messages are clear and actionable

### Security
- [ ] Passwords meet complexity requirements
- [ ] Usernames follow validation rules
- [ ] Email verification enforced for new accounts
- [ ] Rate limiting prevents abuse

## Database Migration Script

```sql
-- Migration: Add username support to authentication
BEGIN;

-- Function to check username availability
CREATE OR REPLACE FUNCTION is_username_available(p_username text)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE user_metadata->>'username' ILIKE p_username
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user by username
CREATE OR REPLACE FUNCTION get_user_by_username(p_username text)
RETURNS json AS $$
DECLARE
  user_record auth.users;
BEGIN
  SELECT * INTO user_record 
  FROM auth.users 
  WHERE user_metadata->>'username' ILIKE p_username
  AND deleted_at IS NULL;
  
  IF FOUND THEN
    RETURN json_build_object(
      'id', user_record.id,
      'email', user_record.email,
      'username', user_record.user_metadata->>'username'
    );
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
```

---

*This feature provides traditional authentication methods while maintaining the simplicity and security of the existing magic link system.*