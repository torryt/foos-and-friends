import type { PlayerPickerPreferences } from '@foos/shared'
import { DEFAULT_PLAYER_PICKER_PREFS } from '@foos/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userPreferencesService } from '@/lib/init'
import { useAuth } from './useAuth'

const STORAGE_KEY = 'foos:playerPickerPrefs'
const queryKey = ['userPreferences'] as const

// localStorage is only a first-paint cache; the server row is the source of truth.
const readCached = (): PlayerPickerPreferences => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_PLAYER_PICKER_PREFS, ...JSON.parse(raw) }
  } catch {
    // unavailable or corrupt: fall through to defaults
  }
  return DEFAULT_PLAYER_PICKER_PREFS
}

const writeCached = (prefs: PlayerPickerPreferences) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}

export const usePlayerPickerPrefs = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await userPreferencesService.get()
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  })

  // Server value wins once it exists; before that (or if no row was saved) use the local cache
  const prefs: PlayerPickerPreferences = query.data?.playerPicker
    ? { ...DEFAULT_PLAYER_PICKER_PREFS, ...query.data.playerPicker }
    : readCached()

  const mutation = useMutation({
    mutationFn: async (next: PlayerPickerPreferences) => {
      const result = await userPreferencesService.update({ playerPicker: next })
      if (result.error) throw new Error(result.error)
      return result.data
    },
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey })
      queryClient.setQueryData(queryKey, (old: object | undefined) => ({
        ...old,
        playerPicker: next,
      }))
      writeCached(next)
    },
    // On failure the optimistic value stays, so the choice still applies for this session
  })

  const { mutate } = mutation
  const setPrefs = (patch: Partial<PlayerPickerPreferences>) => mutate({ ...prefs, ...patch })

  return { prefs, setPrefs }
}
