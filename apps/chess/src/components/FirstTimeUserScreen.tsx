import { Crown, Loader, Plus, UserPlus, Users } from 'lucide-react'

interface FirstTimeUserScreenProps {
  onCreateGroup: () => void
  onJoinGroup: () => void
  loading?: boolean
}

const LoadingState = () => (
  <div className="min-h-screen bg-gradient-to-br from-[#F0EFF4] via-[#F0EFF4]/80 to-[#E8D5E0] flex items-center justify-center">
    <div className="text-center">
      <Loader className="animate-spin mx-auto mb-4 text-[#832161]" size={32} />
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
)

const WelcomeHeader = () => (
  <div className="text-center mb-12">
    <div className="flex items-center justify-center gap-3 mb-6">
      <Crown className="text-[#832161]" size={40} />
      <h1 className="text-4xl font-bold bg-gradient-to-r from-[#832161] to-[#DA4167] bg-clip-text text-transparent">
        Chess & Friends
      </h1>
    </div>
    <p className="text-xl text-gray-700 mb-4">Welcome to your chess tracker!</p>
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
      <div className="w-16 h-16 bg-gradient-to-r from-[#832161] to-[#DA4167] rounded-full flex items-center justify-center mx-auto mb-4">
        <Users className="text-white" size={24} />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Get Started</h2>
      <p className="text-gray-600">
        Ready to track your chess games? You can create a new group or join an existing one.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      <button
        type="button"
        onClick={onCreateGroup}
        className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-[#832161] to-[#DA4167] text-white rounded-lg hover:from-[#6e1b52] hover:to-[#c93558] transition-all font-medium"
      >
        <Plus size={20} />
        Create Your First Group
      </button>

      <button
        type="button"
        onClick={onJoinGroup}
        className="flex items-center justify-center gap-3 p-4 bg-[#3D2645] text-white rounded-lg hover:bg-[#2d1c33] transition-colors font-medium"
      >
        <UserPlus size={20} />
        Join Existing Group
      </button>
    </div>

    <div className="mt-6 p-4 bg-[#F0EFF4] border border-[#832161]/20 rounded-lg">
      <p className="text-[#3D2645] text-sm">
        <strong>Pro tip:</strong> Groups keep your games private and separate. Each group has its
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
    <div className="min-h-screen bg-gradient-to-br from-[#F0EFF4] via-[#F0EFF4]/80 to-[#E8D5E0]">
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <WelcomeHeader />
        <FirstTimeUserSection onCreateGroup={onCreateGroup} onJoinGroup={onJoinGroup} />
      </div>
    </div>
  )
}
