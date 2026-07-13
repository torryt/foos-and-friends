import { Bug, Github, MessagesSquare } from 'lucide-react'
import { COMMUNITY_LINKS } from '../constants/links.ts'

interface CommunityLinksProps {
  /** Called when a link is clicked, so a containing menu can close itself. */
  onNavigate?: () => void
}

const links = [
  { href: COMMUNITY_LINKS.github, label: 'GitHub', Icon: Github },
  { href: COMMUNITY_LINKS.discussions, label: 'Discussions', Icon: MessagesSquare },
  { href: COMMUNITY_LINKS.issues, label: 'Report an issue', Icon: Bug },
]

export const CommunityLinks = ({ onNavigate }: CommunityLinksProps) => (
  <>
    {links.map(({ href, label, Icon }) => (
      <a
        key={href}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className="w-full min-h-11 text-left px-3 py-2 rounded-lg hover:bg-card-hover transition-colors flex items-center gap-2 text-sm font-medium text-primary"
      >
        <Icon size={16} className="text-secondary" />
        {label}
      </a>
    ))}
  </>
)
