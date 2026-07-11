import type { SeasonTrophy } from '@foos/shared'
import { useEffect, useState } from 'react'
import { useGroupContext } from '@/contexts/GroupContext'
import { trophiesService } from '@/lib/init'

// Season trophies awarded in the current group (newest season first, gold before bronze)
export function useTrophies() {
  const [trophies, setTrophies] = useState<SeasonTrophy[]>([])
  const { currentGroup } = useGroupContext()

  useEffect(() => {
    if (!currentGroup) {
      setTrophies([])
      return
    }

    let stale = false

    trophiesService.getTrophiesByGroup(currentGroup.id).then((result) => {
      if (!stale) {
        setTrophies(result.data)
      }
    })

    return () => {
      stale = true
    }
  }, [currentGroup])

  return trophies
}
