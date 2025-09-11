import { render, renderHook } from '@testing-library/react'
import type { ReactElement } from 'react'
import { vi } from 'vitest'
import { GroupProvider } from '@/contexts/GroupContext'

// Mock the useAuth hook globally
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'mock-user-id',
      email: 'test@example.com',
    },
    isAuthenticated: true,
    loading: false,
    error: null,
    signInWithMagicLink: vi.fn(),
    signOut: vi.fn(),
  }),
}))

// Test wrapper that provides all necessary context
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <GroupProvider>{children}</GroupProvider>
}

// Custom render function with providers
const customRender = (ui: ReactElement, options = {}) =>
  render(ui, { wrapper: AllTheProviders, ...options })

// Custom renderHook function with providers
const customRenderHook = <T,>(hook: () => T, options = {}) =>
  renderHook(hook, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render, customRenderHook as renderHook }
