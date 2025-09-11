import { ChevronDown, Plus, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'

interface GroupSelectorProps {
  onCreateGroup?: () => void
  onJoinGroup?: () => void
}

export const GroupSelector = ({ onCreateGroup, onJoinGroup }: GroupSelectorProps) => {
  const { currentGroup, userGroups, switchGroup, loading } = useGroupContext()
  const [isOpen, setIsOpen] = useState(false)

  if (loading) {
    return (
      <div className="bg-white/80 px-3 py-2 rounded-lg border border-white/50">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-gray-600" />
          <span className="text-sm text-gray-600">Loading groups...</span>
        </div>
      </div>
    )
  }

  if (!currentGroup) {
    return (
      <div className="bg-white/80 px-3 py-2 rounded-lg border border-white/50">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-gray-600" />
          <span className="text-sm text-gray-600">No group selected</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white/80 px-3 py-2 rounded-lg border border-white/50 hover:bg-white transition-colors flex items-center gap-2 min-w-0"
      >
        <Users size={16} className="text-gray-600 flex-shrink-0" />
        <div className="flex flex-col items-start min-w-0 flex-1">
          <span className="text-sm font-medium text-gray-700 truncate max-w-32">
            {currentGroup.name}
          </span>
          <span className="text-xs text-gray-500">{currentGroup.inviteCode}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            tabIndex={-1}
            aria-label="Close dropdown"
            onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 min-w-64 z-20">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-3 py-2">Your Groups</div>

              {userGroups.map((group) => (
                <button
                  type="button"
                  key={group.id}
                  onClick={() => {
                    switchGroup(group.id)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors ${
                    group.id === currentGroup.id ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{group.name}</div>
                      {group.description && (
                        <div className="text-sm text-gray-500 truncate">{group.description}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">Code: {group.inviteCode}</div>
                    </div>
                    {group.id === currentGroup.id && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                </button>
              ))}

              <div className="border-t border-gray-100 mt-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onCreateGroup?.()
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  <Plus size={16} className="text-gray-500" />
                  Create New Group
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onJoinGroup?.()
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  <UserPlus size={16} className="text-gray-500" />
                  Join Group
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
