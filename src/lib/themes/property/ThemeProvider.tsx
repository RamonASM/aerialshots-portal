/**
 * Property Theme Provider
 *
 * Wraps property pages with theme-specific CSS variables
 */

'use client'

import { useMemo } from 'react'
import { getTheme, generateThemeCSSVariables, type ThemeId } from './themes'

interface ThemeProviderProps {
  themeId: ThemeId | string
  children: React.ReactNode
}

export function ThemeProvider({ themeId, children }: ThemeProviderProps) {
  const theme = getTheme(themeId)
  const cssVariables = useMemo(() => generateThemeCSSVariables(theme), [theme])

  return (
    <div
      className="themed-property-page"
      style={cssVariables as React.CSSProperties}
    >
      {children}
    </div>
  )
}

/**
 * Hook to get current theme from CSS variables
 */
export function useThemeColor(
  colorKey: keyof ReturnType<typeof generateThemeCSSVariables>
): string {
  const varName = colorKey.replace('--theme-', '')
  return `var(${colorKey})`
}
