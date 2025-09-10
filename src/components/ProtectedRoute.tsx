import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AuthForm } from './AuthForm'

interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
}

export const ProtectedRoute = ({ children, fallback }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, isMockMode } = useAuth()

  // Show loading state only when not in mock mode
  if (loading && !isMockMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show auth form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        {fallback || <AuthForm />}
      </div>
    )
  }

  // Render protected content
  return <>{children}</>
}
