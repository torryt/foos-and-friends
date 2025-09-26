import { Edit2, Save, X } from 'lucide-react'
import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { AVAILABLE_AVATARS } from '@/constants/avatars'
import type { Player } from '@/types'

interface PlayerHeaderProps {
  player: Player
  isCurrentUser: boolean
  onUpdatePlayer: (playerId: string, updates: Partial<Player>) => Promise<void>
}

export function PlayerHeader({ player, isCurrentUser, onUpdatePlayer }: PlayerHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(player.name)
  const [editedAvatar, setEditedAvatar] = useState(player.avatar)
  const nameInputId = React.useId()

  const handleSave = async () => {
    if (editedName.trim() && editedName !== player.name) {
      await onUpdatePlayer(player.id, {
        name: editedName.trim(),
        avatar: editedAvatar,
      })
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedName(player.name)
    setEditedAvatar(player.avatar)
    setIsEditing(false)
  }

  return (
    <Card className="p-6 bg-gradient-to-r from-orange-50 to-amber-50">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="text-6xl">{player.avatar}</div>
        <div className="flex-1 text-center sm:text-left">
          {isEditing ? (
            <div className="space-y-3 max-w-sm">
              <div>
                <Label htmlFor={nameInputId}>Name</Label>
                <Input
                  id={nameInputId}
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Enter name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Avatar</Label>
                <div className="mt-1 border border-gray-200 rounded-lg p-2 bg-white">
                  <div className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto overflow-x-hidden">
                    {AVAILABLE_AVATARS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setEditedAvatar(emoji)}
                        className={`p-1.5 text-2xl rounded-lg flex items-center justify-center aspect-square transition-all ${
                          editedAvatar === emoji
                            ? 'bg-orange-100 ring-2 ring-orange-500 ring-offset-1'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm" variant="default">
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button onClick={handleCancel} size="sm" variant="outline">
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900">{player.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Member since {new Date(player.createdAt || Date.now()).toLocaleDateString()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                  {player.ranking} ELO
                </span>
              </div>
            </>
          )}
        </div>
        {isCurrentUser && !isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
            <Edit2 className="w-4 h-4 mr-1" />
            Edit Profile
          </Button>
        )}
        {/* Owner badge removed for now */}
      </div>
    </Card>
  )
}
