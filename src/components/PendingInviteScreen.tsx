import { Loader, UserCheck, Users } from 'lucide-react'

interface PendingInviteScreenProps {
  groupName?: string
}

export const PendingInviteScreen = ({ groupName }: PendingInviteScreenProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-100 flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 max-w-md shadow-2xl border border-white/50 text-center">
        <div className="mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="text-orange-600" size={32} />
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <Loader className="animate-spin text-orange-500" size={24} />
            <h1 className="text-2xl font-bold text-gray-900">Joining Group</h1>
          </div>

          <p className="text-gray-600">
            {groupName ? (
              <>
                Welcome! We're adding you to <span className="font-semibold">{groupName}</span>...
              </>
            ) : (
              "Welcome! We're processing your group invitation..."
            )}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-center gap-2 text-blue-800 text-sm">
            <UserCheck size={16} />
            <span className="font-medium">Almost there!</span>
          </div>
          <p className="text-blue-700 text-sm mt-1">
            You'll be redirected to the rankings page in just a moment.
          </p>
        </div>
      </div>
    </div>
  )
}
