import { Loader, Plus, UserPlus, Users, Zap } from 'lucide-react'
import type { FriendGroup } from '@/types'

interface GroupSelectionScreenProps {
  userGroups: FriendGroup[]
  onSelectGroup: (groupId: string) => void
  onCreateGroup: () => void
  onJoinGroup: () => void
  loading?: boolean
}

interface GroupCardProps {
  group: FriendGroup
  onSelect: () => void
}

const GroupCard = ({ group, onSelect }: GroupCardProps) => {
  const isOwner = group.ownerId === group.createdBy // Simplified check

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-white/50 hover:bg-white/90 hover:shadow-md transition-all cursor-pointer"
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Select ${group.name} group`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{group.name}</h3>
          {group.description && <p className="text-sm text-gray-600 mt-1">{group.description}</p>}
          <div className="flex items-center gap-2 mt-2">
            <Users size={14} className="text-gray-500" />
            <span className="text-xs text-gray-500">{isOwner ? 'Owner' : 'Member'}</span>
            {group.inviteCode && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-mono">
                {group.inviteCode}
              </span>
            )}
          </div>
        </div>
        <div className="text-orange-500">
          <Users size={24} />
        </div>
      </div>
    </div>
  )
}

const LoadingState = () => (
  <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-100 flex items-center justify-center">
    <div className="text-center">
      <Loader className="animate-spin mx-auto mb-4 text-orange-500" size={32} />
      <p className="text-gray-600">Loading your groups...</p>
    </div>
  </div>
)

const WelcomeHeader = () => (
  <div className="text-center mb-12">
    <div className="flex items-center justify-center gap-3 mb-6">
      <Zap className="text-orange-500" size={40} />
      <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
        Foos & Friends
      </h1>
    </div>
    <p className="text-xl text-gray-700 mb-4">Welcome to your foosball tracker!</p>
    <p className="text-gray-600 max-w-2xl mx-auto">
      Connect with friends, track your games, and compete for the top ranking. Create a group to get
      started or join an existing one with an invite code.
    </p>
  </div>
)

interface FirstTimeUserSectionProps {
  onCreateGroup: () => void
  onJoinGroup: () => void
}

const FirstTimeUserSection = ({ onCreateGroup, onJoinGroup }: FirstTimeUserSectionProps) => (
  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-white/50 mb-8">
    <div className="text-center mb-6">
      <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <Users className="text-white" size={24} />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Get Started</h2>
      <p className="text-gray-600">
        Ready to track your foosball games? You can create a new group or join an existing one.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      <button
        type="button"
        onClick={onCreateGroup}
        className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all font-medium"
      >
        <Plus size={20} />
        Create Your First Group
      </button>

      <button
        type="button"
        onClick={onJoinGroup}
        className="flex items-center justify-center gap-3 p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
      >
        <UserPlus size={20} />
        Join Existing Group
      </button>
    </div>

    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-blue-800 text-sm">
        <strong>💡 Pro tip:</strong> Groups keep your games private and separate. Each group has its
        own players, matches, and rankings.
      </p>
    </div>
  </div>
)

interface GroupSelectionSectionProps {
  groups: FriendGroup[]
  onSelectGroup: (groupId: string) => void
}

const GroupSelectionSection = ({ groups, onSelectGroup }: GroupSelectionSectionProps) => (
  <div className="mb-8">
    <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
      Select a Group to Continue
    </h2>
    <div className="grid gap-4 max-w-2xl mx-auto">
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} onSelect={() => onSelectGroup(group.id)} />
      ))}
    </div>
  </div>
)

interface ActionButtonsProps {
  hasGroups: boolean
  onCreateGroup: () => void
  onJoinGroup: () => void
}

const ActionButtons = ({ hasGroups, onCreateGroup, onJoinGroup }: ActionButtonsProps) => {
  if (!hasGroups) {
    return null // FirstTimeUserSection already has the buttons
  }

  return (
    <div className="text-center">
      <p className="text-gray-600 mb-4">Don't see the group you're looking for?</p>
      <div className="flex justify-center gap-4">
        <button
          type="button"
          onClick={onCreateGroup}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all font-medium"
        >
          <Plus size={16} />
          Create New Group
        </button>

        <button
          type="button"
          onClick={onJoinGroup}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          <UserPlus size={16} />
          Join Another Group
        </button>
      </div>
    </div>
  )
}

export const GroupSelectionScreen = ({
  userGroups,
  onSelectGroup,
  onCreateGroup,
  onJoinGroup,
  loading = false,
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
          <GroupSelectionSection groups={userGroups} onSelectGroup={onSelectGroup} />
        ) : (
          <FirstTimeUserSection onCreateGroup={onCreateGroup} onJoinGroup={onJoinGroup} />
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
