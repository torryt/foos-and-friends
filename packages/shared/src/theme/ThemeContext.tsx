import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ThemeName = 'default' | 'neonarcade'

interface ThemeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  /** The theme the current mode resolves to (system → device preference). */
  theme: ThemeName
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'app-theme'

// The dark theme's fonts are loaded lazily so light-mode users never fetch them
const NEON_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Rajdhani:wght@400;500;600;700&display=swap'

function loadNeonFonts() {
  const id = 'theme-fonts-neonarcade'
  if (document.getElementById(id)) return

  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = NEON_FONTS_URL
  document.head.appendChild(link)
}

// matchMedia is absent in some environments (e.g. jsdom) — treat that as light
function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

// Legacy stored values ('default' | 'cleansport' | 'neonarcade') are migrated
// on first read; unknown values fall back to following the device.
function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  switch (localStorage.getItem(STORAGE_KEY)) {
    case 'light':
    case 'default':
      return 'light'
    case 'dark':
    case 'neonarcade':
      return 'dark'
    default:
      return 'system'
  }
}

function resolveTheme(mode: ThemeMode): ThemeName {
  if (mode === 'system') return systemPrefersDark() ? 'neonarcade' : 'default'
  return mode === 'dark' ? 'neonarcade' : 'default'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode)
  const [theme, setThemeState] = useState<ThemeName>(() => resolveTheme(getInitialMode()))

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode)
    setThemeState(resolveTheme(newMode))
    localStorage.setItem(STORAGE_KEY, newMode)
  }, [])

  // In system mode, track live device preference changes (e.g. auto-dark at night)
  useEffect(() => {
    if (mode !== 'system' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setThemeState(resolveTheme('system'))
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [mode])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (theme === 'neonarcade') loadNeonFonts()
  }, [theme])

  return <ThemeContext value={{ mode, setMode, theme }}>{children}</ThemeContext>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
