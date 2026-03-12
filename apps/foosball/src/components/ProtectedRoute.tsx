import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AuthForm } from './AuthForm'

interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
}

export const ProtectedRoute = ({ children, fallback }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth()

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--th-accent)] mx-auto"></div>
          <p className="mt-4 text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  // Show auth form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center px-4">
        {fallback || <AuthForm />}
      </div>
    )
  }

  // Render protected content
  return <>{children}</>
}
