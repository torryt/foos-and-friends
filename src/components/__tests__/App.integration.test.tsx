import { render, screen } from '@/test/test-utils'
import App from '../../App'

// Mock the useAuth hook to avoid authentication requirements
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
    signOut: vi.fn(),
    isMockMode: true,
    isAuthenticated: true,
    loading: false,
    error: null,
  }),
}))

describe('App Integration', () => {
  test('renders without crashing', () => {
    render(<App />)
    // If it renders without throwing, the test passes
    expect(document.body).toBeInTheDocument()
  })

  test('shows welcome screen when no current group is selected', () => {
    render(<App />)
    
    // Should show the GroupSelectionScreen content
    expect(screen.getByText('Foos & Friends')).toBeInTheDocument()
    expect(screen.getByText('Welcome to your foosball tracker!')).toBeInTheDocument()
  })
})