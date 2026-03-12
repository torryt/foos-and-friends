import { useEffect, useState } from 'react'

interface ChartThemeColors {
  sportPrimary: string
  sportFrom: string
  sportTo: string
  win: string
  loss: string
  draw: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  bgCard: string
  border: string
  gridStroke: string
}

function readCSSVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function getChartColors(): ChartThemeColors {
  return {
    sportPrimary: readCSSVar('--th-sport-primary', '#fb923c'),
    sportFrom: readCSSVar('--th-sport-from', '#fb923c'),
    sportTo: readCSSVar('--th-sport-to', '#ef4444'),
    win: readCSSVar('--th-win', '#16a34a'),
    loss: readCSSVar('--th-loss', '#dc2626'),
    draw: readCSSVar('--th-draw', '#3b82f6'),
    textPrimary: readCSSVar('--th-text-primary', '#1e293b'),
    textSecondary: readCSSVar('--th-text-secondary', '#64748b'),
    textMuted: readCSSVar('--th-text-muted', '#94a3b8'),
    bgCard: readCSSVar('--th-bg-card', '#ffffff'),
    border: readCSSVar('--th-border', '#e2e8f0'),
    gridStroke: readCSSVar('--th-border', '#f3f4f6'),
  }
}

export function useChartTheme(): ChartThemeColors {
  const [colors, setColors] = useState<ChartThemeColors>(getChartColors)

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setColors(getChartColors())
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    // Also update on initial mount (fonts/styles may have loaded)
    setColors(getChartColors())

    return () => observer.disconnect()
  }, [])

  return colors
}
