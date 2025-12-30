/**
 * Property Website Themes
 *
 * Defines visual themes for property marketing websites.
 * Each theme includes color palettes, typography, and layout preferences.
 */

export type ThemeId = 'modern' | 'luxury' | 'minimal' | 'classic' | 'bold'

export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  backgroundSecondary: string
  text: string
  textSecondary: string
  textMuted: string
  border: string
  borderSubtle: string
}

export interface ThemeTypography {
  fontFamily: string
  headingWeight: string
  bodyWeight: string
  letterSpacing: string
}

export interface ThemeLayout {
  heroHeight: string
  heroOverlay: string
  cardStyle: 'rounded' | 'sharp' | 'soft'
  cardRadius: string
  sectionSpacing: string
  containerWidth: string
}

export interface Theme {
  id: ThemeId
  name: string
  description: string
  preview: string
  colors: ThemeColors
  typography: ThemeTypography
  layout: ThemeLayout
}

/**
 * Modern Theme (Default)
 * Clean, contemporary design with iOS-inspired aesthetics
 */
const modernTheme: Theme = {
  id: 'modern',
  name: 'Modern',
  description: 'Clean, contemporary design with sleek lines',
  preview: '/themes/modern-preview.jpg',
  colors: {
    primary: '#0077ff',
    secondary: '#3395ff',
    accent: '#ff4533',
    background: '#000000',
    backgroundSecondary: '#0a0a0a',
    text: '#ffffff',
    textSecondary: '#a1a1a6',
    textMuted: '#636366',
    border: 'rgba(255, 255, 255, 0.08)',
    borderSubtle: 'rgba(255, 255, 255, 0.04)',
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    headingWeight: '600',
    bodyWeight: '400',
    letterSpacing: '-0.01em',
  },
  layout: {
    heroHeight: '70vh',
    heroOverlay: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.7) 100%)',
    cardStyle: 'rounded',
    cardRadius: '1rem',
    sectionSpacing: '4rem',
    containerWidth: '80rem',
  },
}

/**
 * Luxury Theme
 * Elegant, sophisticated design for high-end properties
 */
const luxuryTheme: Theme = {
  id: 'luxury',
  name: 'Luxury',
  description: 'Elegant sophistication for premium properties',
  preview: '/themes/luxury-preview.jpg',
  colors: {
    primary: '#c9a962',
    secondary: '#e5d4a1',
    accent: '#8b7355',
    background: '#0f0f0f',
    backgroundSecondary: '#1a1a1a',
    text: '#f5f5f5',
    textSecondary: '#b8b8b8',
    textMuted: '#888888',
    border: 'rgba(201, 169, 98, 0.2)',
    borderSubtle: 'rgba(201, 169, 98, 0.1)',
  },
  typography: {
    fontFamily: '"Playfair Display", Georgia, serif',
    headingWeight: '500',
    bodyWeight: '400',
    letterSpacing: '0.02em',
  },
  layout: {
    heroHeight: '85vh',
    heroOverlay: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%)',
    cardStyle: 'sharp',
    cardRadius: '0.25rem',
    sectionSpacing: '6rem',
    containerWidth: '72rem',
  },
}

/**
 * Minimal Theme
 * Ultra-clean, whitespace-focused design
 */
const minimalTheme: Theme = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Ultra-clean design with focus on content',
  preview: '/themes/minimal-preview.jpg',
  colors: {
    primary: '#1a1a1a',
    secondary: '#404040',
    accent: '#0066cc',
    background: '#ffffff',
    backgroundSecondary: '#f8f8f8',
    text: '#1a1a1a',
    textSecondary: '#666666',
    textMuted: '#999999',
    border: 'rgba(0, 0, 0, 0.08)',
    borderSubtle: 'rgba(0, 0, 0, 0.04)',
  },
  typography: {
    fontFamily: '"Inter", -apple-system, sans-serif',
    headingWeight: '500',
    bodyWeight: '400',
    letterSpacing: '-0.02em',
  },
  layout: {
    heroHeight: '60vh',
    heroOverlay: 'none',
    cardStyle: 'soft',
    cardRadius: '0.5rem',
    sectionSpacing: '5rem',
    containerWidth: '64rem',
  },
}

/**
 * Classic Theme
 * Timeless, traditional design with warm tones
 */
const classicTheme: Theme = {
  id: 'classic',
  name: 'Classic',
  description: 'Timeless elegance with traditional appeal',
  preview: '/themes/classic-preview.jpg',
  colors: {
    primary: '#2c4a3e',
    secondary: '#4a6b5d',
    accent: '#8b4513',
    background: '#f5f3ef',
    backgroundSecondary: '#ebe8e2',
    text: '#2c2c2c',
    textSecondary: '#5c5c5c',
    textMuted: '#8c8c8c',
    border: 'rgba(0, 0, 0, 0.12)',
    borderSubtle: 'rgba(0, 0, 0, 0.06)',
  },
  typography: {
    fontFamily: '"Libre Baskerville", Georgia, serif',
    headingWeight: '700',
    bodyWeight: '400',
    letterSpacing: '0',
  },
  layout: {
    heroHeight: '65vh',
    heroOverlay: 'linear-gradient(to bottom, transparent 50%, rgba(245,243,239,0.9) 100%)',
    cardStyle: 'rounded',
    cardRadius: '0.75rem',
    sectionSpacing: '4rem',
    containerWidth: '76rem',
  },
}

/**
 * Bold Theme
 * High-contrast, attention-grabbing design
 */
const boldTheme: Theme = {
  id: 'bold',
  name: 'Bold',
  description: 'High-impact design that commands attention',
  preview: '/themes/bold-preview.jpg',
  colors: {
    primary: '#ff3366',
    secondary: '#ff6699',
    accent: '#00ccff',
    background: '#0a0a0a',
    backgroundSecondary: '#151515',
    text: '#ffffff',
    textSecondary: '#cccccc',
    textMuted: '#888888',
    border: 'rgba(255, 51, 102, 0.3)',
    borderSubtle: 'rgba(255, 51, 102, 0.15)',
  },
  typography: {
    fontFamily: '"Montserrat", -apple-system, sans-serif',
    headingWeight: '800',
    bodyWeight: '500',
    letterSpacing: '-0.03em',
  },
  layout: {
    heroHeight: '90vh',
    heroOverlay: 'linear-gradient(45deg, rgba(255,51,102,0.3) 0%, transparent 100%)',
    cardStyle: 'sharp',
    cardRadius: '0',
    sectionSpacing: '5rem',
    containerWidth: '84rem',
  },
}

/**
 * All available themes
 */
export const themes: Record<ThemeId, Theme> = {
  modern: modernTheme,
  luxury: luxuryTheme,
  minimal: minimalTheme,
  classic: classicTheme,
  bold: boldTheme,
}

/**
 * Get a theme by ID
 */
export function getTheme(themeId: ThemeId | string): Theme {
  return themes[themeId as ThemeId] || themes.modern
}

/**
 * Get all available themes
 */
export function getAllThemes(): Theme[] {
  return Object.values(themes)
}

/**
 * Check if a theme ID is valid
 */
export function isValidTheme(themeId: string): themeId is ThemeId {
  return themeId in themes
}

/**
 * Generate CSS variables from a theme
 */
export function generateThemeCSSVariables(theme: Theme): Record<string, string> {
  return {
    '--theme-primary': theme.colors.primary,
    '--theme-secondary': theme.colors.secondary,
    '--theme-accent': theme.colors.accent,
    '--theme-background': theme.colors.background,
    '--theme-background-secondary': theme.colors.backgroundSecondary,
    '--theme-text': theme.colors.text,
    '--theme-text-secondary': theme.colors.textSecondary,
    '--theme-text-muted': theme.colors.textMuted,
    '--theme-border': theme.colors.border,
    '--theme-border-subtle': theme.colors.borderSubtle,
    '--theme-font-family': theme.typography.fontFamily,
    '--theme-heading-weight': theme.typography.headingWeight,
    '--theme-body-weight': theme.typography.bodyWeight,
    '--theme-letter-spacing': theme.typography.letterSpacing,
    '--theme-hero-height': theme.layout.heroHeight,
    '--theme-card-radius': theme.layout.cardRadius,
    '--theme-section-spacing': theme.layout.sectionSpacing,
    '--theme-container-width': theme.layout.containerWidth,
  }
}

/**
 * Default theme for new agents
 */
export const DEFAULT_THEME: ThemeId = 'modern'
