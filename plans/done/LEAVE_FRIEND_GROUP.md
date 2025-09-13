# Leave Friend Group Feature Plan

**Date**: January 2025  
**Status**: Planned  
**Priority**: Medium  
**Effort**: Medium (2-3 hours)

## Overview

Allow group members (non-owners) to leave friend groups they have joined. This provides users control over their group memberships while maintaining group integrity and data consistency.

## Current State Analysis

### Group Membership System
- **GroupContext.tsx**: Manages current group and user groups
- **group_memberships table**: Tracks user roles (owner/admin/member)
- **No leave functionality**: Users currently cannot exit groups
- **Owner protection**: Groups always have exactly one owner

### User Experience Gaps
- Users stuck in groups they no longer want to participate in
- No way to clean up group list for inactive groups
- Potential privacy concerns (users visible to groups they don't want)

## Proposed Solution

### 1. Database Schema Updates

#### Group Memberships Soft Deletion
```sql
-- Add left_at column to group_memberships
ALTER TABLE group_memberships 
ADD COLUMN left_at timestamp with time zone DEFAULT NULL;

-- Update RLS policies to exclude users who have left
DROP POLICY "users_see_memberships" ON group_memberships;
CREATE POLICY "users_see_active_memberships" ON group_memberships
  FOR SELECT USING (
    user_id = auth.uid() 
    AND is_active = true 
    AND left_at IS NULL
  );
```

#### Membership Deactivation
```sql
-- Create function to handle leaving groups
CREATE OR REPLACE FUNCTION leave_friend_group(
  p_group_id uuid,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS json AS $$
DECLARE
  v_membership_record group_memberships;
  v_group_record friend_groups;
BEGIN
  -- Check if user is a member of this group
  SELECT * INTO v_membership_record 
  FROM group_memberships 
  WHERE group_id = p_group_id 
    AND user_id = p_user_id 
    AND is_active = true
    AND left_at IS NULL;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You are not a member of this group'
    );
  END IF;

  -- Prevent owner from leaving (must transfer ownership first)
  IF v_membership_record.role = 'owner' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Group owners cannot leave. Transfer ownership first.'
    );
  END IF;

  -- Mark membership as left
  UPDATE group_memberships 
  SET 
    is_active = false,
    left_at = NOW()
  WHERE id = v_membership_record.id;

  -- Remove user from group's visible_to_users array
  UPDATE friend_groups 
  SET visible_to_users = array_remove(visible_to_users, p_user_id)
  WHERE id = p_group_id;

  RETURN json_build_object(
    'success', true,
    'group_id', p_group_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Service Layer Implementation

#### groupService.ts Updates
```tsx
// Add leaveGroup method
async leaveGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  if (isMockMode) {
    // Remove group from mock user's groups
    const groupIndex = mockGroups.findIndex(g => g.id === groupId)
    if (groupIndex === -1) {
      return { success: false, error: 'Group not found' }
    }

    const group = mockGroups[groupIndex]
    
    // Prevent owner from leaving
    if (group.ownerId === 'mock-user-id') {
      return { 
        success: false, 
        error: 'Group owners cannot leave. Delete the group instead.' 
      }
    }

    // Remove from user's groups (simulate leaving)
    mockGroups.splice(groupIndex, 1)
    return { success: true }
  }

  if (!isSupabaseAvailable() || !supabase) {
    return { success: false, error: 'Database not available' }
  }

  try {
    const { data, error } = await supabase.rpc('leave_friend_group', {
      p_group_id: groupId
    })

    if (error) {
      return { success: false, error: error.message }
    }

    if (!data.success) {
      return { success: false, error: data.error }
    }

    return { success: true }
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to leave group' 
    }
  }
}
```

### 3. Context Integration

#### GroupContext.tsx Updates
```tsx
interface GroupContextType {
  // ... existing properties
  leaveGroup: (groupId: string) => Promise<{ success: boolean; error?: string }>
}

export const GroupProvider = ({ children }: GroupProviderProps) => {
  // ... existing state

  // Leave group function
  const leaveGroup = async (groupId: string) => {
    if (!isAuthenticated || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    setError(null)

    try {
      const result = await groupService.leaveGroup(groupId)

      if (result.success) {
        // Remove group from user's groups
        setUserGroups(prev => prev.filter(g => g.id !== groupId))
        
        // If user was viewing this group, switch to another or none
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

        return { success: true }
      } else {
        setError(result.error || 'Failed to leave group')
        return { success: false, error: result.error }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave group'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  return (
    <GroupContext.Provider
      value={{
        // ... existing values
        leaveGroup,
      }}
    >
      {children}
    </GroupContext.Provider>
  )
}
```

### 4. UI Component Updates

#### GroupSelector.tsx Enhancements
```tsx
import { LogOut, Trash2 } from 'lucide-react'

export const GroupSelector = ({ onCreateGroup, onJoinGroup }: GroupSelectorProps) => {
  const { currentGroup, userGroups, switchGroup, leaveGroup } = useGroupContext()
  const [showLeaveModal, setShowLeaveModal] = useState<{
    groupId: string
    groupName: string
  } | null>(null)

  const handleLeaveGroup = async (groupId: string, groupName: string) => {
    const result = await leaveGroup(groupId)
    
    if (result.success) {
      // Success handled by context
      setShowLeaveModal(null)
    } else {
      // Show error toast or inline error
      console.error('Failed to leave group:', result.error)
    }
  }

  return (
    <div className="dropdown">
      {/* Existing group list */}
      {userGroups.map((group) => (
        <div key={group.id} className="group-item">
          {/* Existing group info */}
          
          {/* Leave button for non-owners */}
          {group.ownerId !== user?.id && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowLeaveModal({
                  groupId: group.id,
                  groupName: group.name
                })
              }}
              className="leave-button"
              title={`Leave ${group.name}`}
            >
              <LogOut size={12} />
            </button>
          )}
        </div>
      ))}

      {/* Leave confirmation modal */}
      {showLeaveModal && (
        <LeaveGroupModal
          groupName={showLeaveModal.groupName}
          onConfirm={() => handleLeaveGroup(
            showLeaveModal.groupId, 
            showLeaveModal.groupName
          )}
          onCancel={() => setShowLeaveModal(null)}
        />
      )}
    </div>
  )
}
```

#### New LeaveGroupModal Component
```tsx
import { LogOut, AlertTriangle } from 'lucide-react'

interface LeaveGroupModalProps {
  groupName: string
  onConfirm: () => void
  onCancel: () => void
}

export const LeaveGroupModal = ({ 
  groupName, 
  onConfirm, 
  onCancel 
}: LeaveGroupModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <LogOut className="text-red-500" size={24} />
          <h3 className="text-lg font-bold text-slate-800">Leave Group</h3>
        </div>
        
        <div className="mb-6">
          <p className="text-slate-600 mb-4">
            Are you sure you want to leave <strong>{groupName}</strong>?
          </p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">This action cannot be undone</p>
              <ul className="text-xs space-y-1">
                <li>• You will lose access to group rankings and matches</li>
                <li>• You will need a new invite to rejoin</li>
                <li>• Your match history will be preserved</li>
              </ul>
            </div>
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
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Leave Group
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 5. Permission System

#### Who Can Leave Groups?
- **Members**: Can leave any group they're a member of
- **Admins**: Can leave groups (not implemented yet, future role)
- **Owners**: Cannot leave (must transfer ownership or delete group)

#### Permission Logic
```tsx
const canLeaveGroup = (group: FriendGroup, user: AuthUser) => {
  // Owner cannot leave
  if (group.ownerId === user.id) return false
  
  // All other members can leave
  return true
}
```

### 6. User Experience Considerations

#### Current Group Handling
```tsx
// When user leaves their current group
const handleLeaveCurrentGroup = (groupId: string) => {
  if (currentGroup?.id === groupId) {
    // Show warning that they'll be switched to another group
    // Or redirect to group selection screen
    
    const remainingGroups = userGroups.filter(g => g.id !== groupId)
    if (remainingGroups.length === 0) {
      // Redirect to group selection screen
      setCurrentGroup(null)
    } else {
      // Auto-switch to first remaining group
      switchGroup(remainingGroups[0].id)
    }
  }
}
```

#### Data Cleanup
- User's created players remain in group
- User's match history preserved  
- User removed from group's visible users list
- User's membership marked as inactive

## Implementation Steps

### Phase 1: Database & Backend (1 hour)
1. Add `left_at` column to group_memberships
2. Create `leave_friend_group` database function
3. Update RLS policies for inactive memberships
4. Implement `leaveGroup` in groupService

### Phase 2: Context Integration (30 minutes)
1. Add `leaveGroup` to GroupContext
2. Handle current group switching logic
3. Update user groups state after leaving

### Phase 3: UI Implementation (1 hour)
1. Add leave buttons to GroupSelector
2. Create LeaveGroupModal component
3. Implement confirmation flow
4. Add loading states and error handling

### Phase 4: Testing & Polish (30 minutes)
1. Test edge cases (leaving current group, last group, etc.)
2. Error handling and user feedback
3. Mock mode implementation

## User Flows

### Happy Path: Leave Group
1. User opens group selector dropdown
2. User sees groups with leave buttons (except owned groups)
3. User clicks leave button for a group
4. Confirmation modal appears with warnings
5. User confirms leaving
6. Group removed from user's list
7. User switched to different group if needed

### Owner Attempt Flow
1. Group owner tries to leave (no leave button shown)
2. Or tooltip explains "Transfer ownership to leave"
3. Directs to group settings for ownership transfer

### Last Group Flow
1. User attempts to leave their only group
2. Warning explains they'll need new invite to join any group
3. After leaving, user sees group selection screen

## Testing Strategy

### Unit Tests
```tsx
describe('Leave Group', () => {
  test('allows member to leave group', async () => {
    // Mock user as group member
    // Call leaveGroup
    // Verify membership marked as inactive
    // Verify user removed from group list
  })

  test('prevents owner from leaving', async () => {
    // Mock user as group owner
    // Attempt to leave group
    // Verify error returned
    // Verify membership unchanged
  })

  test('handles leaving current group', async () => {
    // Set user's current group
    // Leave that group
    // Verify current group switches to another
    // Or verify current group becomes null
  })
})
```

### Integration Tests
- [ ] Leave button only shown for non-owned groups
- [ ] Current group handling works correctly
- [ ] User removed from group visibility after leaving
- [ ] Match history preserved after leaving

## Security Considerations

### Authorization
- RLS policies prevent unauthorized leaving
- Server-side validation of ownership rules
- User can only leave groups they're actually in

### Data Integrity
- Soft deletion preserves audit trail
- Foreign key relationships maintained
- Players created by leaving user remain in group

## Edge Cases

### User Has No Groups After Leaving
- Redirect to group selection screen
- Show "Create or join a group" message
- Maintain app functionality without crashing

### Leaving Current Group
- Automatically switch to another group
- Clear current group if no others available
- Preserve user session and auth state

### Network Errors During Leave
- Show error message to user
- Don't update local state if server fails
- Allow retry of leave operation

## Accessibility

### Screen Readers
```tsx
<button 
  aria-label={`Leave ${group.name} group`}
  title="Leave this group"
>
  <LogOut size={12} />
</button>
```

### Keyboard Navigation
- Leave buttons in tab order
- Modal keyboard navigation (tab, escape)
- Focus management after leaving group

## Performance Impact

### Database
- Single UPDATE query per leave operation
- No cascade operations needed
- RLS filtering adds minimal overhead

### UI
- Modal rendered on-demand only
- State updates are local array filtering
- No significant performance impact

## Future Enhancements

### Potential Features
1. **Rejoin protection**: Cooldown period before rejoining
2. **Leave reasons**: Track why users leave groups  
3. **Group transfer**: Move to different group instead of leaving
4. **Batch operations**: Leave multiple groups at once

### Administrative Features
1. **Leave analytics**: Track group retention metrics
2. **Exit interviews**: Optional feedback when leaving
3. **Re-engagement**: Invite back users who left

## Risk Assessment

### Low Risks
- **Accidental leaving**: Mitigated by confirmation modal
- **Owner confusion**: Clear UI prevents owner leaving attempts
- **Data loss**: All data preserved, only membership affected

### Mitigation Strategies
- **Clear warnings** about permanent action
- **Confirmation flow** with group name verification
- **Undo capability** could be added later if needed
- **Audit trail** for troubleshooting

## Success Metrics

### Functionality
- [ ] Members can successfully leave groups they joined
- [ ] Owners cannot leave groups (clear error/prevention)
- [ ] Current group handling works smoothly
- [ ] Group visibility updated correctly after leaving

### User Experience
- [ ] Clear visual feedback during leave process
- [ ] Confirmation modal prevents accidental leaving
- [ ] No confusion about who can leave what
- [ ] Smooth transition when leaving current group

## Database Migration Script

```sql
-- Migration: Add leave functionality to group memberships
BEGIN;

-- Add left_at column to track when users leave groups
ALTER TABLE group_memberships 
ADD COLUMN left_at timestamp with time zone DEFAULT NULL;

-- Update RLS policies to exclude users who have left
DROP POLICY IF EXISTS "users_see_memberships" ON group_memberships;
CREATE POLICY "users_see_active_memberships" ON group_memberships
  FOR SELECT USING (
    user_id = auth.uid() 
    AND is_active = true 
    AND left_at IS NULL
  );

-- Create function to handle leaving groups
CREATE OR REPLACE FUNCTION leave_friend_group(
  p_group_id uuid,
  p_user_id uuid DEFAULT auth.uid()
) RETURNS json AS $$
DECLARE
  v_membership_record group_memberships;
BEGIN
  SELECT * INTO v_membership_record 
  FROM group_memberships 
  WHERE group_id = p_group_id 
    AND user_id = p_user_id 
    AND is_active = true
    AND left_at IS NULL;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Not a member');
  END IF;

  IF v_membership_record.role = 'owner' THEN
    RETURN json_build_object('success', false, 'error', 'Owners cannot leave');
  END IF;

  UPDATE group_memberships 
  SET is_active = false, left_at = NOW()
  WHERE id = v_membership_record.id;

  UPDATE friend_groups 
  SET visible_to_users = array_remove(visible_to_users, p_user_id)
  WHERE id = p_group_id;

  RETURN json_build_object('success', true, 'group_id', p_group_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
```

---

*This feature provides users control over their group memberships while maintaining system integrity.*