# Delete Player Feature Plan

**Date**: January 2025  
**Status**: Planned  
**Priority**: High  
**Effort**: Large (4-6 hours)

## Overview

Implement player deletion functionality while preserving game history integrity. Deleted players will be marked as "Deleted Player" in match records to maintain data consistency and historical accuracy.

## Current State Analysis

### Database Schema
- **Players table**: UUID primary key, referenced by matches
- **Matches table**: Links to player IDs for team compositions
- **Foreign key relationships**: Matches depend on player existence
- **Current cascade rules**: `ON DELETE CASCADE` would delete match history

### UI Components
- **PlayerRankings.tsx**: Displays all players in ranking order
- **AddPlayerModal.tsx**: Only handles player creation
- **No deletion UI**: Currently no way to remove players

### Game History Impact
- **Match integrity**: Deleting player would break match records  
- **ELO calculations**: Historical matches needed for accurate rankings
- **User experience**: Match history shows "unknown player" is confusing

## Proposed Solution: Soft Deletion

### 1. Database Schema Changes

#### Update Players Table
```sql
-- Add soft deletion column
ALTER TABLE players 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Update indexes for active players only
CREATE INDEX idx_players_active ON players (group_id, created_at) 
WHERE deleted_at IS NULL;
```

#### Update RLS Policies
```sql
-- Modify existing policies to exclude deleted players
DROP POLICY "group_members_manage_players" ON players;
CREATE POLICY "group_members_manage_players" ON players
  FOR ALL USING (
    auth.uid() = ANY(
      SELECT visible_to_users FROM friend_groups 
      WHERE id = players.group_id
    )
    AND deleted_at IS NULL  -- Exclude deleted players
  );
```

### 2. Service Layer Updates

#### playersService.ts Changes
```tsx
// Add deletePlayer method
async deletePlayer(playerId: string): Promise<{ success: boolean; error?: string }> {
  if (isMockMode) {
    const playerIndex = mockPlayers.findIndex(p => p.id === playerId)
    if (playerIndex === -1) {
      return { success: false, error: 'Player not found' }
    }
    
    // Soft delete in mock mode
    mockPlayers[playerIndex] = {
      ...mockPlayers[playerIndex],
      name: 'Deleted Player',
      deletedAt: new Date().toISOString()
    }
    return { success: true }
  }

  if (!isSupabaseAvailable() || !supabase) {
    return { success: false, error: 'Database not available' }
  }

  try {
    const { error } = await supabase
      .from('players')
      .update({ 
        name: 'Deleted Player',
        deleted_at: new Date().toISOString() 
      })
      .eq('id', playerId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to delete player' 
    }
  }
}

// Update getPlayersByGroup to exclude deleted players
async getPlayersByGroup(groupId: string): Promise<{ data: Player[]; error?: string }> {
  // ... existing code ...
  
  if (!isMockMode) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('group_id', groupId)
      .is('deleted_at', null)  // Only active players
      .order('created_at', { ascending: true })
  }
  
  // Filter mock players too
  const activePlayers = mockPlayers.filter(p => 
    p.groupId === groupId && !p.deletedAt
  )
}
```

### 3. UI Component Updates

#### PlayerRankings.tsx Enhancements
```tsx
interface PlayerRankingsProps {
  players: Player[]
  onDeletePlayer?: (playerId: string, playerName: string) => void
  currentUserId?: string
}

const PlayerRankings = ({ players, onDeletePlayer, currentUserId }: PlayerRankingsProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState<{
    playerId: string
    playerName: string
  } | null>(null)

  return (
    <div className="player-card">
      {/* Existing player info */}
      
      {/* Add delete button for player creators/group owners */}
      {onDeletePlayer && (player.createdBy === currentUserId) && (
        <button
          onClick={() => setShowDeleteModal({ 
            playerId: player.id, 
            playerName: player.name 
          })}
          className="delete-button"
          title={`Delete ${player.name}`}
        >
          <Trash2 size={14} />
        </button>
      )}
      
      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <DeletePlayerModal
          playerName={showDeleteModal.playerName}
          onConfirm={() => {
            onDeletePlayer(showDeleteModal.playerId, showDeleteModal.playerName)
            setShowDeleteModal(null)
          }}
          onCancel={() => setShowDeleteModal(null)}
        />
      )}
    </div>
  )
}
```

#### New DeletePlayerModal Component
```tsx
interface DeletePlayerModalProps {
  playerName: string
  onConfirm: () => void
  onCancel: () => void
}

export const DeletePlayerModal = ({ 
  playerName, 
  onConfirm, 
  onCancel 
}: DeletePlayerModalProps) => {
  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3>Delete Player</h3>
        <p>
          Are you sure you want to delete <strong>{playerName}</strong>?
        </p>
        <div className="warning">
          <AlertTriangle size={16} />
          Their match history will be preserved as "Deleted Player"
        </div>
        
        <div className="modal-actions">
          <button onClick={onCancel} className="cancel-button">
            Cancel
          </button>
          <button onClick={onConfirm} className="delete-button">
            Delete Player
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 4. Game Logic Integration

#### useGameLogic.ts Updates
```tsx
// Add deletePlayer function
const deletePlayer = async (
  playerId: string, 
  playerName: string
): Promise<{ success: boolean; error?: string }> => {
  if (!currentGroup || !user) {
    return { success: false, error: 'Not authenticated or no group selected' }
  }

  try {
    const result = await playersService.deletePlayer(playerId)
    
    if (result.success) {
      // Remove from local state
      setPlayers(prev => prev.filter(p => p.id !== playerId))
      return { success: true }
    } else {
      return { success: false, error: result.error }
    }
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to delete player' 
    }
  }
}

// Return deletePlayer in hook return
return {
  players,
  matches,
  loading,
  error,
  addPlayer,
  recordMatch,
  deletePlayer
}
```

### 5. Permission System

#### Who Can Delete Players?
1. **Player creator**: User who originally added the player
2. **Group owner**: Owner of the friend group
3. **Group admin**: If admin role is implemented later

#### Permission Checks
```tsx
const canDeletePlayer = (player: Player, currentUser: AuthUser, currentGroup: FriendGroup) => {
  // Player creator can delete
  if (player.createdBy === currentUser.id) return true
  
  // Group owner can delete any player
  if (currentGroup.ownerId === currentUser.id) return true
  
  return false
}
```

### 6. Match History Display

#### MatchHistory Component Updates
```tsx
// Show deleted players as "Deleted Player" in match records
const formatPlayerName = (player: Player) => {
  return player.deletedAt ? 'Deleted Player' : player.name
}

// Add visual indication for deleted players
<span className={player.deletedAt ? 'deleted-player' : ''}>
  {formatPlayerName(player)}
</span>
```

### 7. Mock Mode Implementation

```tsx
// Extend mock player interface
interface MockPlayer extends Player {
  deletedAt?: string
}

// Mock deletion preserves player in array but marks as deleted
const deletePlayerMock = (playerId: string) => {
  const playerIndex = mockPlayers.findIndex(p => p.id === playerId)
  if (playerIndex >= 0) {
    mockPlayers[playerIndex] = {
      ...mockPlayers[playerIndex],
      name: 'Deleted Player',
      deletedAt: new Date().toISOString()
    }
  }
}
```

## Implementation Steps

### Phase 1: Database & Backend (2 hours)
1. Add `deleted_at` column to players table
2. Update RLS policies to exclude deleted players
3. Implement `deletePlayer` service method
4. Update `getPlayersByGroup` to filter deleted players

### Phase 2: UI Components (2 hours)
1. Add delete buttons to PlayerRankings
2. Create DeletePlayerModal component
3. Implement permission-based button visibility
4. Add confirmation flow with warnings

### Phase 3: Integration (1 hour)
1. Connect deletePlayer to useGameLogic hook
2. Update App.tsx to pass delete handler
3. Ensure state updates correctly after deletion

### Phase 4: Polish & Testing (1 hour)
1. Add loading states during deletion
2. Error handling and user feedback
3. Test edge cases and error conditions

## User Flows

### Happy Path: Delete Player
1. User views PlayerRankings with delete buttons
2. User clicks delete button for player they created
3. Confirmation modal appears with warning
4. User confirms deletion
5. Player disappears from rankings
6. Historical matches show "Deleted Player"

### Permission Denied Flow
1. User sees player they didn't create
2. No delete button is visible (permission-based rendering)
3. Or delete button shows tooltip "Only creator can delete"

### Error Handling Flow
1. User attempts to delete player
2. Network/database error occurs
3. Error toast shows "Failed to delete player"
4. Player remains in list, user can retry

## Testing Strategy

### Unit Tests
```tsx
describe('Delete Player', () => {
  test('deletes player when user is creator', async () => {
    // Mock user as player creator
    // Call deletePlayer
    // Verify player marked as deleted
    // Verify not returned in active players list
  })

  test('prevents deletion when user is not creator', async () => {
    // Mock user as different from creator
    // Verify delete button not shown
    // Or verify permission denied error
  })

  test('preserves match history after deletion', async () => {
    // Create player with match history
    // Delete player
    // Verify matches still exist
    // Verify deleted player shows as "Deleted Player"
  })
})
```

### Integration Tests
- [ ] Delete player removes from rankings
- [ ] Match history preserved with "Deleted Player" label  
- [ ] Permissions enforced correctly
- [ ] Error states handled gracefully

## Security Considerations

### Authorization
- Server-side permission checks in RLS policies
- Client-side UI permissions for better UX
- Audit trail preserved (who deleted when)

### Data Integrity  
- Soft deletion prevents orphaned match records
- Foreign key constraints maintained
- Rollback capability (un-delete if needed later)

## Edge Cases

### Player with Many Matches
- Deletion should be instant (just updates one row)
- Match queries automatically exclude via RLS
- No cascade performance issues

### Group Owner Changes
- New owner can delete players created by old owner
- Clear permission inheritance

### Player Self-Deletion
- Players cannot delete themselves
- Prevents accidental self-removal

## Accessibility

### Screen Readers
```tsx
<button 
  aria-label={`Delete player ${player.name}`}
  title="Delete this player permanently"
>
  <Trash2 size={14} />
</button>
```

### Keyboard Navigation
- Delete buttons included in tab order
- Enter/Space to activate
- Escape to cancel modal

## Performance Impact

### Database
- Soft deletion adds one column
- Queries need `WHERE deleted_at IS NULL`  
- Index on deleted_at for performance

### UI
- No significant impact
- Modal rendering on-demand only
- State updates are local (remove from array)

## Future Enhancements

### Potential Features
1. **Undelete functionality**: Restore deleted players
2. **Bulk deletion**: Delete multiple players at once
3. **Delete reasons**: Track why players were deleted
4. **Player transfer**: Move player between groups instead of delete

### Administrative Features
1. **Audit log**: Who deleted what when
2. **Deletion limits**: Prevent mass deletion
3. **Confirmation codes**: Extra security for important deletions

## Risk Assessment

### Medium Risks
- **Accidental deletion**: Mitigated by confirmation modal
- **Permission confusion**: Clear UI indicators of who can delete
- **Data loss fears**: Clear messaging about preserved history

### Mitigation Strategies
- **Clear warnings** about permanent deletion
- **Permission-based UI** prevents unauthorized attempts
- **Confirmation modal** with specific player name
- **Audit trail** for accountability

## Success Metrics

### Functionality
- [ ] Delete button only shown to authorized users
- [ ] Confirmation modal prevents accidental deletion
- [ ] Player removed from active rankings after deletion
- [ ] Match history preserved with "Deleted Player" label

### User Experience
- [ ] Clear visual feedback during deletion process
- [ ] Error messages are helpful and actionable
- [ ] No confusion about who can delete what
- [ ] Deleted players don't appear in new match forms

## Database Migration Script

```sql
-- Migration: Add soft deletion to players table
BEGIN;

-- Add deleted_at column
ALTER TABLE players 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for active players
CREATE INDEX idx_players_active ON players (group_id, created_at) 
WHERE deleted_at IS NULL;

-- Update RLS policy to exclude deleted players
DROP POLICY IF EXISTS "group_members_manage_players" ON players;
CREATE POLICY "group_members_manage_players" ON players
  FOR ALL USING (
    auth.uid() = ANY(
      SELECT visible_to_users FROM friend_groups 
      WHERE id = players.group_id
    )
    AND deleted_at IS NULL
  );

COMMIT;
```

---

*This feature provides essential player management while maintaining data integrity and user trust.*