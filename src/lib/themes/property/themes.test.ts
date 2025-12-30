/**
 * Property Themes Tests
 *
 * Tests for the property website theme system
 */

import { describe, it, expect } from 'vitest'
import {
  themes,
  getTheme,
  getAllThemes,
  isValidTheme,
  generateThemeCSSVariables,
  DEFAULT_THEME,
  type ThemeId,
} from './themes'

describe('Property Themes', () => {
  describe('themes object', () => {
    it('should have all 5 themes defined', () => {
      expect(Object.keys(themes)).toHaveLength(5)
      expect(themes.modern).toBeDefined()
      expect(themes.luxury).toBeDefined()
      expect(themes.minimal).toBeDefined()
      expect(themes.classic).toBeDefined()
      expect(themes.bold).toBeDefined()
    })

    it('should have required properties for each theme', () => {
      for (const themeId of Object.keys(themes) as ThemeId[]) {
        const theme = themes[themeId]
        expect(theme.id).toBe(themeId)
        expect(theme.name).toBeDefined()
        expect(theme.description).toBeDefined()
        expect(theme.colors).toBeDefined()
        expect(theme.typography).toBeDefined()
        expect(theme.layout).toBeDefined()
      }
    })

    it('should have all color properties defined', () => {
      const requiredColors = [
        'primary',
        'secondary',
        'accent',
        'background',
        'backgroundSecondary',
        'text',
        'textSecondary',
        'textMuted',
        'border',
        'borderSubtle',
      ]

      for (const themeId of Object.keys(themes) as ThemeId[]) {
        for (const color of requiredColors) {
          expect(themes[themeId].colors[color as keyof typeof themes.modern.colors]).toBeDefined()
        }
      }
    })
  })

  describe('getTheme', () => {
    it('should return theme by ID', () => {
      expect(getTheme('modern').id).toBe('modern')
      expect(getTheme('luxury').id).toBe('luxury')
      expect(getTheme('minimal').id).toBe('minimal')
      expect(getTheme('classic').id).toBe('classic')
      expect(getTheme('bold').id).toBe('bold')
    })

    it('should return modern theme for invalid ID', () => {
      expect(getTheme('invalid').id).toBe('modern')
      expect(getTheme('').id).toBe('modern')
    })
  })

  describe('getAllThemes', () => {
    it('should return array of all themes', () => {
      const allThemes = getAllThemes()
      expect(allThemes).toHaveLength(5)
      expect(allThemes.map((t) => t.id)).toContain('modern')
      expect(allThemes.map((t) => t.id)).toContain('luxury')
    })
  })

  describe('isValidTheme', () => {
    it('should return true for valid theme IDs', () => {
      expect(isValidTheme('modern')).toBe(true)
      expect(isValidTheme('luxury')).toBe(true)
      expect(isValidTheme('minimal')).toBe(true)
      expect(isValidTheme('classic')).toBe(true)
      expect(isValidTheme('bold')).toBe(true)
    })

    it('should return false for invalid theme IDs', () => {
      expect(isValidTheme('invalid')).toBe(false)
      expect(isValidTheme('')).toBe(false)
      expect(isValidTheme('MODERN')).toBe(false)
    })
  })

  describe('generateThemeCSSVariables', () => {
    it('should generate CSS variables from theme', () => {
      const cssVars = generateThemeCSSVariables(themes.modern)

      expect(cssVars['--theme-primary']).toBe(themes.modern.colors.primary)
      expect(cssVars['--theme-background']).toBe(themes.modern.colors.background)
      expect(cssVars['--theme-font-family']).toBe(themes.modern.typography.fontFamily)
      expect(cssVars['--theme-card-radius']).toBe(themes.modern.layout.cardRadius)
    })

    it('should include all required CSS variables', () => {
      const cssVars = generateThemeCSSVariables(themes.luxury)
      const requiredVars = [
        '--theme-primary',
        '--theme-secondary',
        '--theme-accent',
        '--theme-background',
        '--theme-text',
        '--theme-font-family',
        '--theme-hero-height',
      ]

      for (const varName of requiredVars) {
        expect(cssVars[varName]).toBeDefined()
      }
    })
  })

  describe('DEFAULT_THEME', () => {
    it('should be modern', () => {
      expect(DEFAULT_THEME).toBe('modern')
    })
  })

  describe('Theme-specific properties', () => {
    it('modern theme should have iOS-inspired dark aesthetic', () => {
      expect(themes.modern.colors.background).toBe('#000000')
      expect(themes.modern.colors.primary).toBe('#0077ff')
    })

    it('luxury theme should have gold accent', () => {
      expect(themes.luxury.colors.primary).toBe('#c9a962')
      expect(themes.luxury.layout.heroHeight).toBe('85vh')
    })

    it('minimal theme should have light background', () => {
      expect(themes.minimal.colors.background).toBe('#ffffff')
      expect(themes.minimal.colors.text).toBe('#1a1a1a')
    })

    it('classic theme should have warm tones', () => {
      expect(themes.classic.colors.background).toBe('#f5f3ef')
      expect(themes.classic.typography.fontFamily).toContain('Baskerville')
    })

    it('bold theme should have high contrast', () => {
      expect(themes.bold.colors.primary).toBe('#ff3366')
      expect(themes.bold.typography.headingWeight).toBe('800')
    })
  })
})
