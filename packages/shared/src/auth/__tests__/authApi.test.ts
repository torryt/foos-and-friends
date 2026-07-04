import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '../../lib/supabase.ts'
import {
  MIN_PASSWORD_LENGTH,
  mapAuthError,
  resetPassword,
  signInWithMagicLink,
  signInWithPassword,
  signOut,
  signUp,
  updatePassword,
} from '../authApi.ts'

// Build a fake supabase client where each auth method resolves with the given result
const makeClient = (overrides: Record<string, unknown> = {}): SupabaseClient =>
  ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      ...overrides,
    },
  }) as unknown as SupabaseClient

describe('mapAuthError', () => {
  it('maps invalid credentials to a friendly message', () => {
    expect(mapAuthError('Invalid login credentials', 'fallback')).toBe(
      'Incorrect email or password.',
    )
  })

  it('maps unconfirmed email', () => {
    expect(mapAuthError('Email not confirmed', 'fallback')).toContain('confirm your email')
  })

  it('maps already-registered users', () => {
    expect(mapAuthError('User already registered', 'fallback')).toContain('already exists')
  })

  it('maps rate limiting', () => {
    expect(mapAuthError('Request rate limit reached', 'fallback')).toContain('Too many attempts')
    expect(
      mapAuthError('For security purposes, you can only request this once every 60 seconds', 'x'),
    ).toContain('Too many attempts')
  })

  it('maps short passwords', () => {
    expect(mapAuthError('Password should be at least 8 characters', 'fallback')).toBe(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    )
  })

  it('maps weak/leaked passwords', () => {
    expect(mapAuthError('Password is known to be weak password', 'fallback')).toContain(
      'too easy to guess',
    )
  })

  it('falls back to the provided message when raw message is missing', () => {
    expect(mapAuthError(undefined, 'fallback')).toBe('fallback')
  })

  it('passes through unknown messages', () => {
    expect(mapAuthError('Something unusual happened', 'fallback')).toBe(
      'Something unusual happened',
    )
  })
})

describe('signInWithPassword', () => {
  it('succeeds and forwards credentials', async () => {
    const client = makeClient()
    const result = await signInWithPassword(client, 'a@b.com', 'hunter22')

    expect(result).toEqual({ success: true })
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'hunter22',
    })
  })

  it('returns a friendly error on invalid credentials', async () => {
    const client = makeClient({
      signInWithPassword: vi
        .fn()
        .mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } }),
    })

    const result = await signInWithPassword(client, 'a@b.com', 'wrong')
    expect(result).toEqual({ success: false, error: 'Incorrect email or password.' })
  })

  it('handles thrown errors', async () => {
    const client = makeClient({
      signInWithPassword: vi.fn().mockRejectedValue(new Error('network down')),
    })

    const result = await signInWithPassword(client, 'a@b.com', 'pw')
    expect(result).toEqual({ success: false, error: 'network down' })
  })
})

describe('signUp', () => {
  it('reports needsConfirmation when no session is returned', async () => {
    const client = makeClient()
    const result = await signUp(client, 'a@b.com', 'hunter22', 'https://app/invite?code=x')

    expect(result).toEqual({ success: true, needsConfirmation: true })
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'hunter22',
      options: { emailRedirectTo: 'https://app/invite?code=x' },
    })
  })

  it('reports no confirmation needed when a session is created immediately', async () => {
    const client = makeClient({
      signUp: vi.fn().mockResolvedValue({ data: { session: { access_token: 't' } }, error: null }),
    })

    const result = await signUp(client, 'a@b.com', 'hunter22')
    expect(result).toEqual({ success: true, needsConfirmation: false })
  })

  it('maps signup errors', async () => {
    const client = makeClient({
      signUp: vi
        .fn()
        .mockResolvedValue({ data: {}, error: { message: 'User already registered' } }),
    })

    const result = await signUp(client, 'a@b.com', 'hunter22')
    expect(result.success).toBe(false)
    expect(result.error).toContain('already exists')
  })
})

describe('resetPassword', () => {
  it('sends the reset email with the redirect URL', async () => {
    const client = makeClient()
    const result = await resetPassword(client, 'a@b.com', 'https://app/reset-password')

    expect(result).toEqual({ success: true })
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.com', {
      redirectTo: 'https://app/reset-password',
    })
  })

  it('maps rate-limit errors', async () => {
    const client = makeClient({
      resetPasswordForEmail: vi.fn().mockResolvedValue({
        data: {},
        error: { message: 'For security purposes, you can only request this once every 60 seconds' },
      }),
    })

    const result = await resetPassword(client, 'a@b.com', 'https://app/reset-password')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Too many attempts')
  })
})

describe('updatePassword', () => {
  it('updates the password', async () => {
    const client = makeClient()
    const result = await updatePassword(client, 'new-password')

    expect(result).toEqual({ success: true })
    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'new-password' })
  })

  it('maps same-password errors', async () => {
    const client = makeClient({
      updateUser: vi.fn().mockResolvedValue({
        data: {},
        error: { message: 'New password should be different from the old password.' },
      }),
    })

    const result = await updatePassword(client, 'same')
    expect(result.success).toBe(false)
    expect(result.error).toContain('different from your current password')
  })
})

describe('signInWithMagicLink', () => {
  it('sends the magic link with the redirect URL', async () => {
    const client = makeClient()
    const result = await signInWithMagicLink(client, 'a@b.com', 'https://app')

    expect(result).toEqual({ success: true })
    expect(client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'a@b.com',
      options: { emailRedirectTo: 'https://app' },
    })
  })
})

describe('signOut', () => {
  it('signs out', async () => {
    const client = makeClient()
    expect(await signOut(client)).toEqual({ success: true })
  })

  it('returns the error message on failure', async () => {
    const client = makeClient({
      signOut: vi.fn().mockResolvedValue({ error: { message: 'boom' } }),
    })
    expect(await signOut(client)).toEqual({ success: false, error: 'boom' })
  })
})
