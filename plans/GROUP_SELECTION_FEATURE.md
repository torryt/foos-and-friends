# Group Selection Feature Implementation Plan

## Overview
This document outlines the implementation of a group selection screen that appears when no active group is selected. The feature ensures users must select an active group before accessing core foosball tracking functionality.

## Current State Analysis
The application currently has:
- ✅ Group management system with create/join functionality
- ✅ GroupContext that tracks `currentGroup` state
- ✅ Group selector dropdown in the header
- ⚠️ Core features (rankings, matches, add players) are always visible
- ⚠️ No dedicated group selection/onboarding screen

## Feature Requirements

### Core Functionality
1. **Group Selection Screen**: Display when `currentGroup` is null
2. **Conditional Feature Access**: Hide core features when no active group is set
3. **Group Creation Flow**: Streamlined for new users with no group memberships
4. **Group Selection Flow**: Allow switching between multiple groups

### User Scenarios

#### Scenario 1: New User (No Group Memberships)
**Context**: User has authenticated but has never joined or created a group
**Experience**:
- Show welcome screen with group creation and join options
- Two primary call-to-action buttons: "Create Your First Group" and "Join Existing Group"
- Brief onboarding explanation of groups and invite codes
- Equal prominence for both create and join options

#### Scenario 2: Existing User (Multiple Group Memberships, None Selected)
**Context**: User has group memberships but no currently active group
**Experience**:
- Show group selection screen with list of user's groups
- "Switch to Group" buttons for each group
- "Create New Group" option
- "Join Another Group" option

#### Scenario 3: User With Active Group
**Context**: User has a `currentGroup` set in context
**Experience**:
- Normal app functionality (current behavior)
- All features accessible: rankings, matches, add players, etc.

## Implementation Plan

### Phase 1: Create Group Selection Screen Component

#### File: `src/components/GroupSelectionScreen.tsx`
```typescript
interface GroupSelectionScreenProps {
  userGroups: FriendGroup[]
  onSelectGroup: (groupId: string) => void
  onCreateGroup: () => void
  onJoinGroup: () => void
  loading?: boolean
}
```

**Features:**
- Welcome message and app explanation
- Conditional rendering based on group memberships
- Visual group cards for selection
- Empty state for users with no groups
- Loading states during group operations

### Phase 2: Conditional Feature Rendering

#### Update `src/App.tsx`
- Add conditional rendering logic
- Show GroupSelectionScreen when `currentGroup` is null
- Hide core features (TabNavigation, main content) when no group selected

#### Features to Hide When No Active Group:
- `TabNavigation` component (Rankings/Matches tabs)
- `QuickActions` component (Add Friend, Record Match)
- `PlayerRankings` component
- `MatchHistory` component
- `AddPlayerModal` and `RecordMatchForm`

### Phase 3: Enhanced Group Context Logic

#### Update `src/contexts/GroupContext.tsx`
- Add `hasAnyGroups` computed property
- Improve initial group selection logic

### Phase 4: UI/UX Enhancements

#### Visual Design Elements:
- Welcome illustration or icon
- Gradient background matching app theme
- Clean card-based group selection
- Consistent button styling
- Loading and error states

#### Responsive Design:
- Mobile-optimized layout
- Touch-friendly group selection cards
- Proper spacing and typography

## Detailed Implementation

### Component Structure

```typescript
// GroupSelectionScreen.tsx
export const GroupSelectionScreen = ({
  userGroups,
  onSelectGroup,
  onCreateGroup,
  onJoinGroup,
  loading
}: GroupSelectionScreenProps) => {
  const hasGroups = userGroups.length > 0

  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-100">
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <WelcomeHeader />
        
        {hasGroups ? (
          <GroupSelectionSection 
            groups={userGroups}
            onSelectGroup={onSelectGroup}
          />
        ) : (
          <FirstTimeUserSection 
            onCreateGroup={onCreateGroup}
            onJoinGroup={onJoinGroup}
          />
        )}
        
        <ActionButtons 
          hasGroups={hasGroups}
          onCreateGroup={onCreateGroup}
          onJoinGroup={onJoinGroup}
        />
      </div>
    </div>
  )
}
```

### App.tsx Integration Logic

```typescript
const AppContent = ({ user, onSignOut, isMockMode }: AppContentProps) => {
  const { currentGroup, userGroups, loading } = useGroupContext()
  
  // Show group selection when no active group
  if (!currentGroup) {
    return (
      <GroupSelectionScreen
        userGroups={userGroups}
        onSelectGroup={switchGroup}
        onCreateGroup={() => setShowCreateGroup(true)}
        onJoinGroup={() => setShowJoinGroup(true)}
        loading={loading}
      />
    )
  }
  
  // Normal app functionality when group is selected
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-100">
      <Header />
      <TabNavigation />
      {/* Rest of existing functionality */}
    </div>
  )
}
```

## User Experience Flow

### New User Journey (Create Group)
1. **Authentication** → Magic link login
2. **Group Selection Screen** → Choose "Create Your First Group" or "Join Existing Group"
3. **Group Creation Modal** → Name, description, generate invite code
4. **Success** → Automatically switch to new group
5. **Core Features** → Full app functionality unlocked

### New User Journey (Join Group)
1. **Authentication** → Magic link login
2. **Group Selection Screen** → Choose "Join Existing Group"
3. **Join Group Modal** → Enter invite code from friend
4. **Success** → Automatically switch to joined group
5. **Core Features** → Full app functionality unlocked

### Existing User Journey
1. **Authentication** → Magic link login
2. **Group Selection Screen** → List of user's groups
3. **Group Selection** → Click to activate group
4. **Core Features** → Full app functionality with selected group

### Group Switching
1. **Header Group Selector** → Dropdown with current group
2. **Switch Group** → Select different group from dropdown
3. **No Group Selected** → Return to Group Selection Screen
4. **Create/Join** → Access from Group Selection Screen

## Technical Considerations

### Context Management
- Ensure `currentGroup` state is properly managed
- Handle loading states during group operations
- Maintain group selection persistence across sessions

### URL Routing (Future Enhancement)
- Consider adding routes like `/groups` for selection screen
- Deep linking to specific groups
- Invite link handling improvements

### Performance
- Lazy load group selection screen components
- Optimize group list rendering for users with many groups
- Implement proper loading states

### Accessibility
- Proper ARIA labels for group selection
- Keyboard navigation support
- Screen reader compatibility
- Focus management

## Testing Strategy

### Unit Tests
- GroupSelectionScreen component rendering
- Conditional logic in App.tsx
- Group context state management

### Integration Tests
- Full user journey from auth to group selection
- Group creation and selection flow
- Feature hiding/showing based on group state

### User Experience Tests
- New user onboarding flow
- Existing user group switching
- Error handling and edge cases

## Success Criteria

### Functional Requirements
- ✅ Users cannot access core features without active group
- ✅ New users see clear group creation prompt
- ✅ Existing users can easily switch between groups
- ✅ All existing functionality preserved when group is active

### User Experience Requirements
- ✅ Clear, intuitive group selection interface
- ✅ Consistent visual design with existing app
- ✅ Responsive design works on all devices
- ✅ Fast, smooth transitions between states

### Technical Requirements
- ✅ No breaking changes to existing functionality
- ✅ Proper error handling and loading states
- ✅ Maintainable, well-tested code
- ✅ Performance optimization for group operations

## Implementation Timeline

### Phase 1: Core Functionality (1-2 days)
- Create GroupSelectionScreen component
- Update App.tsx conditional rendering
- Basic group selection logic

### Phase 2: UI/UX Polish (1 day)
- Visual design implementation
- Loading and error states
- Responsive design

### Phase 3: Testing & Refinement (1 day)
- Unit and integration tests
- User experience testing
- Bug fixes and improvements

## Future Enhancements

### Advanced Features
- Group favoriting/pinning
- Recent groups quick access
- Group search and filtering
- Bulk group operations

### Analytics Integration
- Track group selection patterns
- Monitor user onboarding success
- Group creation/joining metrics

### Social Features
- Group member previews
- Activity indicators
- Group invitation improvements

This feature will significantly improve the user experience by providing clear group context and preventing confusion when multiple groups are available.