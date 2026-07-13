import { createContext, useContext } from 'react'

// How the current visitor relates to the group whose page they're on.
// 'member' renders the full authed app; 'public' renders the read-only view
// backed by PublicGroupContext. Preview/not-found states are terminal and
// rendered by the layout itself, so child routes only ever see these two.
export type GroupPageMode = 'member' | 'public'

const GroupPageContext = createContext<GroupPageMode | null>(null)

export const GroupPageProvider = GroupPageContext.Provider

export const useGroupPageMode = (): GroupPageMode => {
  const mode = useContext(GroupPageContext)
  if (!mode) {
    throw new Error('useGroupPageMode must be used within a group page layout')
  }
  return mode
}
