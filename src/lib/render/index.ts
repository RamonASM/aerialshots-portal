/**
 * Render Library
 * Text-to-image rendering system for carousels and marketing assets
 */

// Core types
export * from './types'

// Render engines
export {
  renderWithSatori,
  AVAILABLE_FONTS,
  DEFAULT_FONT,
  loadFonts,
  loadFont,
  clearFontCache,
  getFontCacheStats,
  resolveVariables,
  resolveColor,
  calculateAutoSize,
  formatPrice,
  formatNumber,
  formatDate,
} from './engine'

// Re-export for convenience
export type { FontFamily } from './engine/fonts'
