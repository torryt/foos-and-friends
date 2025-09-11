# Delete Friend Group Feature Plan

**Date**: January 2025  
**Status**: Planned  
**Priority**: High  
**Effort**: Large (4-6 hours)

## Overview

Implement group deletion functionality for group owners with comprehensive data cleanup. This includes cascading deletion of all associated data (players, matches, memberships) while maintaining referential integrity and providing clear warnings about permanent data loss.

## Current State Analysis

### Database Dependencies
- **friend_groups**: Parent table with ownership model
- **group_memberships**: User associations with groups  
- **players**: All scoped to specific groups
- **matches**: Reference players which reference groups
- **CASCADE rules**: Currently configured for data integrity

### Ownership Model
- **Single owner**: Each group has exactly one `owner_id`
- **Creator tracking**: `created_by` field for audit purposes
- **No co-ownership**: No shared ownership or admin delegation yet

### UI Limitations
- **No delete option**: Currently no way to remove unwanted groups
- **Growing group lists**: Users accumulate groups over time
- **No cleanup mechanism**: Inactive groups persist indefinitely

## Proposed Solution

### 1. Database Function Implementation

#### Comprehensive Delete Function
```sql
CREATE OR REPLACE FUNCTION delete_friend_group(
  p_group_id uuid,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS json AS $$
DECLARE
  v_group_record friend_groups;
  v_member_count integer;
  v_player_count integer;
  v_match_count integer;
BEGIN
  -- Verify group exists and user is owner
  SELECT * INTO v_group_record 
  FROM friend_groups 
  WHERE id = p_group_id AND owner_id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Group not found or you are not the owner'
    );
  END IF;

  -- Get counts for confirmation/logging
  SELECT COUNT(*) INTO v_member_count
  FROM group_memberships 
  WHERE group_id = p_group_id AND is_active = true;

  SELECT COUNT(*) INTO v_player_count
  FROM players 
  WHERE group_id = p_group_id AND deleted_at IS NULL;

  SELECT COUNT(*) INTO v_match_count
  FROM matches 
  WHERE group_id = p_group_id;

  -- Delete in correct order (respect foreign keys)
  -- 1. Delete matches first (they reference players)
  DELETE FROM matches WHERE group_id = p_group_id;
  
  -- 2. Delete players (they reference group)
  DELETE FROM players WHERE group_id = p_group_id;
  
  -- 3. Delete memberships (they reference group)
  DELETE FROM group_memberships WHERE group_id = p_group_id;
  
  -- 4. Finally delete the group itself
  DELETE FROM friend_groups WHERE id = p_group_id;

  -- Return success with deletion summary
  RETURN json_build_object(
    'success', true,
    'group_id', p_group_id,
    'deleted_members', v_member_count,
    'deleted_players', v_player_count,
    'deleted_matches', v_match_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to delete group: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Service Layer Implementation

#### groupService.ts Updates
```tsx
// Add deleteGroup method
async deleteGroup(groupId: string): Promise<{ 
  success: boolean; 
  error?: string;
  deletedCounts?: {
    members: number;
    players: number;
    matches: number;
  };
}> {
  if (isMockMode) {
    const groupIndex = mockGroups.findIndex(g => g.id === groupId)
    if (groupIndex === -1) {
      return { success: false, error: 'Group not found' }
    }

    const group = mockGroups[groupIndex]
    
    // Verify user is owner
    if (group.ownerId !== 'mock-user-id') {
      return { 
        success: false, 
        error: 'Only group owners can delete groups' 
      }
    }

    // Count related data for feedback
    const players = mockPlayers.filter(p => p.groupId === groupId)
    const matches = mockMatches.filter(m => m.groupId === groupId)

    // Remove all related data
    mockPlayers = mockPlayers.filter(p => p.groupId !== groupId)
    mockMatches = mockMatches.filter(m => m.groupId !== groupId)
    mockGroups.splice(groupIndex, 1)

    return { 
      success: true,
      deletedCounts: {
        members: 1, // Mock user only
        players: players.length,
        matches: matches.length
      }
    }
  }

  if (!isSupabaseAvailable() || !supabase) {
    return { success: false, error: 'Database not available' }
  }

  try {
    const { data, error } = await supabase.rpc('delete_friend_group', {
      p_group_id: groupId
    })

    if (error) {
      return { success: false, error: error.message }
    }

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return { 
      success: true,
      deletedCounts: {
        members: data.deleted_members,
        players: data.deleted_players,
        matches: data.deleted_matches
      }
    }
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to delete group' 
    }
  }
}
```

### 3. Context Integration

#### GroupContext.tsx Updates
```tsx
interface GroupContextType {
  // ... existing properties
  deleteGroup: (groupId: string) => Promise<{ 
    success: boolean; 
    error?: string;
    deletedCounts?: {
      members: number;
      players: number;
      matches: number;
    };
  }>
}

export const GroupProvider = ({ children }: GroupProviderProps) => {
  // ... existing state

  // Delete group function
  const deleteGroup = async (groupId: string) => {
    if (!isAuthenticated || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    setError(null)

    try {
      const result = await groupService.deleteGroup(groupId)

      if (result.success) {
        // Remove group from user's groups
        setUserGroups(prev => prev.filter(g => g.id !== groupId))
        
        // Handle current group deletion
        if (currentGroup?.id === groupId) {
          const remainingGroups = userGroups.filter(g => g.id !== groupId)
          if (remainingGroups.length > 0) {
            setCurrentGroup(remainingGroups[0])
            if (isMockMode) {
              groupService.setCurrentMockGroup(remainingGroups[0].id)
            }
          } else {
            setCurrentGroup(null)
          }
        }

        return { success: true, deletedCounts: result.deletedCounts }
      } else {
        setError(result.error || 'Failed to delete group')
        return { success: false, error: result.error }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete group'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  return (
    <GroupContext.Provider
      value={{
        // ... existing values
        deleteGroup,
      }}
    >
      {children}
    </GroupContext.Provider>
  )
}
```

### 4. UI Component Implementation

#### GroupSelector.tsx Enhancements
```tsx
import { Trash2, AlertTriangle } from 'lucide-react'

export const GroupSelector = ({ onCreateGroup, onJoinGroup }: GroupSelectorProps) => {
  const { currentGroup, userGroups, deleteGroup } = useGroupContext()
  const [showDeleteModal, setShowDeleteModal] = useState<{
    groupId: string
    groupName: string
    memberCount?: number
    playerCount?: number
    matchCount?: number
  } | null>(null)

  return (
    <div className="dropdown">
      {userGroups.map((group) => (
        <div key={group.id} className="group-item">
          {/* Existing group info */}
          
          {/* Delete button for owned groups only */}
          {group.ownerId === user?.id && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteModal({
                  groupId: group.id,
                  groupName: group.name,
                  // TODO: Add counts from group stats
                })
              }}
              className="delete-button text-red-500 hover:bg-red-50"
              title={`Delete ${group.name}`}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      ))}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <DeleteGroupModal
          groupName={showDeleteModal.groupName}
          memberCount={showDeleteModal.memberCount}
          playerCount={showDeleteModal.playerCount}
          matchCount={showDeleteModal.matchCount}
          onConfirm={async () => {
            const result = await deleteGroup(showDeleteModal.groupId)
            if (result.success) {
              setShowDeleteModal(null)
              // Show success message with deletion counts
            } else {
              // Show error message
              console.error('Failed to delete group:', result.error)
            }
          }}
          onCancel={() => setShowDeleteModal(null)}
        />
      )}
    </div>
  )
}
```

#### New DeleteGroupModal Component
```tsx
import { Trash2, AlertTriangle, Users, Trophy, Target } from 'lucide-react'

interface DeleteGroupModalProps {
  groupName: string
  memberCount?: number
  playerCount?: number
  matchCount?: number
  onConfirm: () => void
  onCancel: () => void
}

export const DeleteGroupModal = ({ 
  groupName, 
  memberCount, 
  playerCount, 
  matchCount,
  onConfirm, 
  onCancel 
}: DeleteGroupModalProps) => {
  const [confirmText, setConfirmText] = useState('')
  const isConfirmed = confirmText === groupName

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Trash2 className="text-red-500" size={24} />
          <h3 className="text-lg font-bold text-slate-800">Delete Group</h3>
        </div>
        
        <div className="mb-6">
          <p className="text-slate-600 mb-4">
            You are about to permanently delete <strong>{groupName}</strong>.
          </p>
          
          {/* Data impact summary */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-medium text-red-800 mb-2">
                  This will permanently delete:
                </p>
                <div className="grid grid-cols-3 gap-4 text-sm text-red-700">
                  <div className="flex items-center gap-1">
                    <Users size={14} />
                    <span>{memberCount || 0} members</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy size={14} />
                    <span>{playerCount || 0} players</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target size={14} />
                    <span>{matchCount || 0} matches</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Confirmation input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              To confirm, type the group name: <strong>{groupName}</strong>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Enter group name"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!isConfirmed}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              isConfirmed
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Delete Forever
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 5. Enhanced Group Settings (Optional)

#### New GroupSettingsModal Component
```tsx
// Dedicated settings modal for group management
export const GroupSettingsModal = ({ 
  group, 
  isOpen, 
  onClose 
}: GroupSettingsModalProps) => {
  if (!isOpen) return null

  return (
    <div className="settings-modal">
      <h2>Group Settings: {group.name}</h2>
      
      {/* Group info editing */}
      <section>
        <h3>Basic Information</h3>
        {/* Name, description editing */}
      </section>

      {/* Member management */}
      <section>
        <h3>Members ({group.memberCount})</h3>
        {/* Member list with roles */}
      </section>

      {/* Danger zone */}
      <section className="danger-zone">
        <h3>Danger Zone</h3>
        <button 
          onClick={() => setShowDeleteModal(true)}
          className="delete-group-button"
        >
          Delete Group
        </button>
      </section>
    </div>
  )
}
```

### 6. Permission System

#### Ownership Verification
```tsx
const canDeleteGroup = (group: FriendGroup, user: AuthUser) => {
  // Only group owner can delete
  return group.ownerId === user.id
}

// UI permission check
{group.ownerId === user?.id && (
  <button className="delete-button">
    <Trash2 size={12} />
  </button>
)}
```

### 7. Data Migration Considerations

#### Before Implementation
- Backup critical data
- Test cascade behavior in staging
- Verify foreign key constraints
- Plan rollback strategy

#### After Deletion
- No data recovery possible
- Audit logs for accountability
- User notifications to affected members

## Implementation Steps

### Phase 1: Database Foundation (2 hours)
1. Create `delete_friend_group` database function
2. Test cascade deletion behavior
3. Add proper error handling and logging
4. Verify RLS policies work with deletion

### Phase 2: Service & Context (1 hour)
1. Implement `deleteGroup` in groupService
2. Add `deleteGroup` to GroupContext
3. Handle current group switching logic
4. Mock mode implementation

### Phase 3: UI Components (2 hours)
1. Add delete buttons to GroupSelector (owner only)
2. Create DeleteGroupModal with confirmation
3. Implement confirmation text input
4. Add data impact visualization

### Phase 4: Testing & Polish (1 hour)
1. Test cascading deletion thoroughly
2. Error handling and loading states
3. Edge case testing (current group deletion)
4. User feedback and success messages

## User Flows

### Happy Path: Delete Group
1. Group owner opens group selector
2. Owner sees delete button (trash icon) for their groups
3. Owner clicks delete button
4. Modal shows deletion impact (members, players, matches)
5. Owner types group name to confirm
6. Owner clicks "Delete Forever"
7. Group and all data permanently deleted
8. Owner switched to another group or selection screen

### Permission Denied Flow
1. Non-owner views group selector
2. No delete buttons visible for groups they don't own
3. Clear ownership indication in UI

### Confirmation Flow
1. Owner clicks delete but doesn't type group name correctly
2. Delete button remains disabled
3. Clear instruction to type exact group name
4. Button enables only after exact match

## Testing Strategy

### Unit Tests
```tsx
describe('Delete Group', () => {
  test('allows owner to delete group', async () => {
    // Mock user as group owner
    // Call deleteGroup
    // Verify group and related data deleted
    // Verify success response with counts
  })

  test('prevents non-owner from deleting group', async () => {
    // Mock user as group member (not owner)
    // Attempt to delete group
    // Verify permission error
    // Verify group unchanged
  })

  test('handles current group deletion', async () => {
    // Set group as current group
    // Delete that group
    // Verify current group switches to another
    // Or verify current group becomes null
  })
})
```

### Integration Tests
- [ ] Delete button only shown for owned groups
- [ ] Cascade deletion removes all related data
- [ ] Current group handling works correctly
- [ ] User redirected appropriately after deletion

### Database Tests
- [ ] Foreign key constraints respected
- [ ] Cascade deletion works correctly
- [ ] No orphaned records left behind
- [ ] RLS policies prevent unauthorized deletion

## Security Considerations

### Authorization
- RLS policies enforce owner-only deletion
- Server-side ownership verification
- Database function uses SECURITY DEFINER

### Data Protection
- Confirmation required (type group name)
- Clear warning about permanent deletion
- No accidental deletion possible

### Audit Trail
- Log who deleted what when
- Track deletion reasons (future feature)
- Maintain accountability

## Edge Cases

### User's Only Group
- Show warning that they'll have no groups left
- Redirect to group selection screen
- Option to create new group immediately

### Active Matches/Tournament
- Consider preventing deletion during active tournaments
- Or show stronger warnings about ongoing activity
- Future feature: pause/suspend instead of delete

### Large Groups
- Performance considerations for many members/matches
- Progress indicator for large deletions
- Background processing if needed

## Accessibility

### Screen Readers
```tsx
<button 
  aria-label={`Delete ${group.name} group permanently`}
  title="Delete group (owner only)"
>
  <Trash2 size={12} />
</button>
```

### Keyboard Navigation
- Delete buttons in tab order
- Modal keyboard navigation
- Focus management after deletion
- Escape key to cancel

## Performance Impact

### Database
- Single transaction for all deletions
- Foreign key cascade may be slow for large groups
- Consider background processing for huge groups

### UI
- Modal rendered on-demand only
- State updates are local array filtering
- Potential loading states for slow deletions

## Future Enhancements

### Administrative Features
1. **Soft deletion**: Archive instead of permanent delete
2. **Group transfer**: Transfer ownership instead of delete
3. **Export data**: Download group data before deletion
4. **Deletion scheduling**: Schedule future deletion with cancellation

### User Experience
1. **Group analytics**: Show group activity before deletion
2. **Member notification**: Warn members before deletion
3. **Data recovery**: Limited-time undelete functionality
4. **Bulk operations**: Delete multiple groups at once

## Risk Assessment

### High Risks
- **Permanent data loss**: No recovery after deletion
- **User impact**: All group members lose access
- **Accidental deletion**: Despite safeguards, still possible

### Medium Risks
- **Performance**: Large group deletion could be slow
- **Cascade errors**: Foreign key issues could cause failures
- **User confusion**: About ownership and permissions

### Mitigation Strategies
- **Strong confirmation**: Type group name requirement
- **Clear warnings**: Show exact data impact
- **Permission UI**: Only show delete to owners
- **Error handling**: Graceful failure with clear messages
- **Testing**: Comprehensive edge case testing

## Success Metrics

### Functionality
- [ ] Only group owners can delete groups
- [ ] Confirmation flow prevents accidental deletion
- [ ] All related data properly deleted (no orphans)
- [ ] Current group handling works smoothly

### User Experience
- [ ] Clear visual feedback during deletion
- [ ] Data impact clearly communicated
- [ ] No confusion about permissions
- [ ] Smooth transition after deletion

### Data Integrity
- [ ] No orphaned records after deletion
- [ ] Foreign key constraints respected
- [ ] No cascade deletion failures
- [ ] Audit trail maintained

## Database Migration Script

```sql
-- Migration: Add group deletion functionality
BEGIN;

-- Create comprehensive group deletion function
CREATE OR REPLACE FUNCTION delete_friend_group(
  p_group_id uuid,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS json AS $$
DECLARE
  v_group_record friend_groups;
  v_member_count integer;
  v_player_count integer;
  v_match_count integer;
BEGIN
  -- Verify ownership
  SELECT * INTO v_group_record 
  FROM friend_groups 
  WHERE id = p_group_id AND owner_id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Get counts for feedback
  SELECT COUNT(*) INTO v_member_count FROM group_memberships WHERE group_id = p_group_id;
  SELECT COUNT(*) INTO v_player_count FROM players WHERE group_id = p_group_id;
  SELECT COUNT(*) INTO v_match_count FROM matches WHERE group_id = p_group_id;

  -- Delete in correct order
  DELETE FROM matches WHERE group_id = p_group_id;
  DELETE FROM players WHERE group_id = p_group_id;
  DELETE FROM group_memberships WHERE group_id = p_group_id;
  DELETE FROM friend_groups WHERE id = p_group_id;

  RETURN json_build_object(
    'success', true,
    'group_id', p_group_id,
    'deleted_members', v_member_count,
    'deleted_players', v_player_count,
    'deleted_matches', v_match_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
```

---

*This feature provides group owners with complete control over their groups while maintaining data integrity and user safety through comprehensive confirmation flows.*