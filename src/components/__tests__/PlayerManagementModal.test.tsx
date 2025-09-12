import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import PlayerManagementModal from '../PlayerManagementModal'
import type { Player } from '@/types'

// Mock the toast hook
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: () => ({
      success: vi.fn(),
      error: vi.fn(),
    }),
  }),
}))

describe('PlayerManagementModal', () => {
  const mockOnClose = vi.fn()
  const mockOnUpdatePlayer = vi.fn()
  const mockOnDeletePlayer = vi.fn()

  const mockPlayers: Player[] = [
    {
      id: '1',
      name: 'John Doe',
      ranking: 1200,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      avatar: '👨‍💻',
      department: 'Engineering',
      createdBy: 'user1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Jane Smith',
      ranking: 1150,
      matchesPlayed: 5,
      wins: 3,
      losses: 2,
      avatar: '👩‍🎨',
      department: 'Design',
      createdBy: 'user2',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '3',
      name: 'Bob Wilson',
      ranking: 1300,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      avatar: '🧔',
      department: 'Marketing',
      createdBy: 'user3',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ]

  beforeEach(() => {
    mockOnClose.mockClear()
    mockOnUpdatePlayer.mockClear().mockResolvedValue({ success: true })
    mockOnDeletePlayer.mockClear().mockResolvedValue({ success: true })
  })

  describe('Regular User Permissions', () => {
    test('regular user can edit their own created players', () => {
      render(
        <PlayerManagementModal
          isOpen={true}
          onClose={mockOnClose}
          players={mockPlayers}
          currentUserId="user1"
          isAdmin={false}
          onUpdatePlayer={mockOnUpdatePlayer}
          onDeletePlayer={mockOnDeletePlayer}
        />,
      )

      // Should see edit button for player created by user1
      const johnRow = screen.getByText('John Doe').closest('.bg-white\\/60')
      expect(johnRow).toBeInTheDocument()
      
      // Find edit button within John's row
      const editButton = johnRow?.querySelector('button[title="Edit player"]')
      expect(editButton).toBeInTheDocument()
    })

    test('regular user cannot edit players created by others', () => {
      render(
        <PlayerManagementModal
          isOpen={true}
          onClose={mockOnClose}
          players={mockPlayers}
          currentUserId="user1"
          isAdmin={false}
          onUpdatePlayer={mockOnUpdatePlayer}
          onDeletePlayer={mockOnDeletePlayer}
        />,
      )

      // Should NOT see edit button for player created by user2
      const janeRow = screen.getByText('Jane Smith').closest('.bg-white\\/60')
      expect(janeRow).toBeInTheDocument()
      
      // Should not find edit button within Jane's row
      const editButton = janeRow?.querySelector('button[title="Edit player"]')
      expect(editButton).not.toBeInTheDocument()
    })

    test('regular user can delete their own created players (if no matches)', () => {
      render(
        <PlayerManagementModal
          isOpen={true}
          onClose={mockOnClose}
          players={mockPlayers}
          currentUserId="user1"
          isAdmin={false}
          onUpdatePlayer={mockOnUpdatePlayer}
          onDeletePlayer={mockOnDeletePlayer}
        />,
      )

      // Should see delete button for player created by user1 with 0 matches
      const johnRow = screen.getByText('John Doe').closest('.bg-white\\/60')
      expect(johnRow).toBeInTheDocument()
      
      // Find delete button within John's row
      const deleteButton = johnRow?.querySelector('button[title="Delete player (only if no matches played)"]')
      expect(deleteButton).toBeInTheDocument()
    })

    test('regular user cannot delete players created by others', () => {
      render(
        <PlayerManagementModal
          isOpen={true}
          onClose={mockOnClose}
          players={mockPlayers}
          currentUserId="user1"
          isAdmin={false}
          onUpdatePlayer={mockOnUpdatePlayer}
          onDeletePlayer={mockOnDeletePlayer}
        />,
      )

      // Should NOT see delete button for player created by user3
      const bobRow = screen.getByText('Bob Wilson').closest('.bg-white\\/60')
      expect(bobRow).toBeInTheDocument()
      
      // Should not find delete button within Bob's row
      const deleteButton = bobRow?.querySelector('button[title="Delete player (only if no matches played)"]')
      expect(deleteButton).not.toBeInTheDocument()
    })
  })

  describe('Admin/Owner Permissions', () => {
    test('admin can edit any player', () => {
      render(
        <PlayerManagementModal
          isOpen={true}
          onClose={mockOnClose}
          players={mockPlayers}
          currentUserId="owner"
          isAdmin={true}
          onUpdatePlayer={mockOnUpdatePlayer}
          onDeletePlayer={mockOnDeletePlayer}
        />,
      )

      // Should see edit buttons for all players
      mockPlayers.forEach((player) => {
        const playerRow = screen.getByText(player.name).closest('.bg-white\\/60')
        expect(playerRow).toBeInTheDocument()
        
        const editButton = playerRow?.querySelector('button[title="Edit player"]')
        expect(editButton).toBeInTheDocument()
      })
    })

    test('admin can delete any player (if no matches)', () => {
      render(
        <PlayerManagementModal
          isOpen={true}
          onClose={mockOnClose}
          players={mockPlayers}
          currentUserId="owner"
          isAdmin={true}
          onUpdatePlayer={mockOnUpdatePlayer}
          onDeletePlayer={mockOnDeletePlayer}
        />,
      )

      // Should see delete button for John (0 matches)
      const johnRow = screen.getByText('John Doe').closest('.bg-white\\/60')
      const johnDeleteButton = johnRow?.querySelector('button[title="Delete player (only if no matches played)"]')
      expect(johnDeleteButton).toBeInTheDocument()

      // Should see delete button for Bob (0 matches)  
      const bobRow = screen.getByText('Bob Wilson').closest('.bg-white\\/60')
      const bobDeleteButton = bobRow?.querySelector('button[title="Delete player (only if no matches played)"]')
      expect(bobDeleteButton).toBeInTheDocument()

      // Should NOT see delete button for Jane (has matches)
      const janeRow = screen.getByText('Jane Smith').closest('.bg-white\\/60')
      const janeDeleteButton = janeRow?.querySelector('button[title="Delete player (only if no matches played)"]')
      expect(janeDeleteButton).not.toBeInTheDocument()
    })

    test('admin can successfully delete any player', async () => {
      // Mock window.confirm to return true
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      
      render(
        <PlayerManagementModal
          isOpen={true}
          onClose={mockOnClose}
          players={mockPlayers}
          currentUserId="owner"
          isAdmin={true}
          onUpdatePlayer={mockOnUpdatePlayer}
          onDeletePlayer={mockOnDeletePlayer}
        />,
      )

      // Click delete button for Bob (created by user3, but admin should be able to delete)
      const bobRow = screen.getByText('Bob Wilson').closest('.bg-white\\/60')
      const bobDeleteButton = bobRow?.querySelector('button[title="Delete player (only if no matches played)"]')
      expect(bobDeleteButton).toBeInTheDocument()

      if (bobDeleteButton) {
        await userEvent.click(bobDeleteButton as HTMLElement)
      }

      await waitFor(() => {
        expect(mockOnDeletePlayer).toHaveBeenCalledWith('3')
      })

      confirmSpy.mockRestore()
    })
  })

  describe('Match History Restrictions', () => {
    test('cannot delete players with matches played (even as admin)', () => {
      render(
        <PlayerManagementModal
          isOpen={true}
          onClose={mockOnClose}
          players={mockPlayers}
          currentUserId="owner"
          isAdmin={true}
          onUpdatePlayer={mockOnUpdatePlayer}
          onDeletePlayer={mockOnDeletePlayer}
        />,
      )

      // Jane has 5 matches played, should not show delete button
      const janeRow = screen.getByText('Jane Smith').closest('.bg-white\\/60')
      expect(janeRow).toBeInTheDocument()
      
      const deleteButton = janeRow?.querySelector('button[title="Delete player (only if no matches played)"]')
      expect(deleteButton).not.toBeInTheDocument()
    })
  })
})