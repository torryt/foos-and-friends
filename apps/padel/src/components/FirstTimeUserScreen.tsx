import { Loader, Plus, UserPlus, Users, Zap } from 'lucide-react'

interface FirstTimeUserScreenProps {
  onCreateGroup: () => void
  onJoinGroup: () => void
  loading?: boolean
}

const LoadingState = () => (
  <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-100 flex items-center justify-center">
    <div className="text-center">
      <Loader className="animate-spin mx-auto mb-4 text-orange-500" size={32} />
      <p className="text-gray-600">Loading...</p>
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

const FirstTimeUserSection = ({
  onCreateGroup,
  onJoinGroup,
}: {
  onCreateGroup: () => void
  onJoinGroup: () => void
}) => (
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

export const FirstTimeUserScreen = ({
  onCreateGroup,
  onJoinGroup,
  loading = false,
}: FirstTimeUserScreenProps) => {
  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-100">
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <WelcomeHeader />
        <FirstTimeUserSection onCreateGroup={onCreateGroup} onJoinGroup={onJoinGroup} />
      </div>
    </div>
  )
}
