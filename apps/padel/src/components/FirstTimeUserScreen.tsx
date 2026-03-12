import { Loader, Plus, UserPlus, Users, Zap } from 'lucide-react'

interface FirstTimeUserScreenProps {
  onCreateGroup: () => void
  onJoinGroup: () => void
  loading?: boolean
}

const LoadingState = () => (
  <div className="min-h-screen bg-page flex items-center justify-center">
    <div className="text-center">
      <Loader className="animate-spin mx-auto mb-4 text-[var(--th-sport-primary)]" size={32} />
      <p className="text-secondary">Loading...</p>
    </div>
  </div>
)

const WelcomeHeader = () => (
  <div className="text-center mb-12">
    <div className="flex items-center justify-center gap-3 mb-6">
      <Zap className="text-[var(--th-sport-primary)]" size={40} />
      <h1 className="text-4xl font-bold text-sport-gradient">Padelmigos</h1>
    </div>
    <p className="text-xl text-primary mb-4">Welcome to your padel tracker!</p>
    <p className="text-secondary max-w-2xl mx-auto">
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
  <div className="bg-card backdrop-blur-sm rounded-[var(--th-radius-lg)] p-8 border border-[var(--th-border-subtle)] mb-8">
    <div className="text-center mb-6">
      <div className="w-16 h-16 bg-sport-gradient rounded-full flex items-center justify-center mx-auto mb-4">
        <Users className="text-white" size={24} />
      </div>
      <h2 className="text-2xl font-bold text-primary mb-2">Get Started</h2>
      <p className="text-secondary">
        Ready to track your padel games? You can create a new group or join an existing one.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      <button
        type="button"
        onClick={onCreateGroup}
        className="flex items-center justify-center gap-3 p-4 bg-sport-gradient text-white rounded-[var(--th-radius-md)] hover:bg-sport-gradient-hover transition-all font-medium"
      >
        <Plus size={20} />
        Create Your First Group
      </button>

      <button
        type="button"
        onClick={onJoinGroup}
        className="flex items-center justify-center gap-3 p-4 bg-[var(--th-win)] text-white rounded-[var(--th-radius-md)] hover:opacity-90 transition-colors font-medium"
      >
        <UserPlus size={20} />
        Join Existing Group
      </button>
    </div>

    <div className="mt-6 p-4 bg-accent-subtle border border-[var(--th-border)] rounded-[var(--th-radius-md)]">
      <p className="text-primary text-sm">
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
    <div className="min-h-screen bg-page">
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <WelcomeHeader />
        <FirstTimeUserSection onCreateGroup={onCreateGroup} onJoinGroup={onJoinGroup} />
      </div>
    </div>
  )
}
