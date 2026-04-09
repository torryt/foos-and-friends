import { render, screen } from '@testing-library/react'
import { ConnectionStatus } from '../ConnectionStatus'

vi.mock('@/hooks/useOfflineStatus')

import { useOfflineStatus } from '@/hooks/useOfflineStatus'

const mockUseOfflineStatus = vi.mocked(useOfflineStatus)

describe('ConnectionStatus', () => {
  test('renders nothing when online', () => {
    mockUseOfflineStatus.mockReturnValue({ isOnline: true })

    const { container } = render(<ConnectionStatus />)

    expect(container.firstChild).toBeNull()
    expect(screen.queryByText('Online')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  test('renders offline badge when offline', () => {
    mockUseOfflineStatus.mockReturnValue({ isOnline: false })

    render(<ConnectionStatus />)

    expect(screen.getAllByText('Offline').length).toBeGreaterThan(0)
  })

  test('does not render online badge when offline', () => {
    mockUseOfflineStatus.mockReturnValue({ isOnline: false })

    render(<ConnectionStatus />)

    expect(screen.queryByText('Online')).not.toBeInTheDocument()
  })

  test('offline badge has correct accessibility attributes', () => {
    mockUseOfflineStatus.mockReturnValue({ isOnline: false })

    render(<ConnectionStatus />)

    const output = screen.getByRole('status')
    expect(output).toHaveAttribute('aria-live', 'polite')
  })
})
