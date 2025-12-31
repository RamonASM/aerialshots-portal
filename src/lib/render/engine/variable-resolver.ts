/**
 * Variable Resolution and Text Processing
 * Handles Handlebars-like variable substitution and text formatting
 */

import type { RenderContext, AutoSizeConfig } from '../types'

// =====================
// VARIABLE RESOLUTION
// =====================

/**
 * Resolve Handlebars-like variables in text
 * Supports: {{variableName}}, {{nested.path}}, {{formatPrice price}}
 */
export function resolveVariables(text: string, context: RenderContext): string {
  if (!text) return ''

  // Match {{...}} patterns
  return text.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
    const trimmed = expression.trim()

    // Check for helper functions
    const helperMatch = trimmed.match(/^(\w+)\s+(.+)$/)
    if (helperMatch) {
      const [, helper, arg] = helperMatch
      const value = getNestedValue(arg, context)
      return applyHelper(helper, value)
    }

    // Simple variable lookup
    const value = getNestedValue(trimmed, context)
    return value !== undefined && value !== null ? String(value) : match
  })
}

/**
 * Get nested value from context using dot notation
 * Supports: "price", "listing.price", "lifeHereData.walkScore"
 */
function getNestedValue(path: string, context: RenderContext): unknown {
  // Block dangerous property access at the path level
  const pathParts = path.split('.')
  if (pathParts.some(part => BLOCKED_PROPERTIES.has(part))) {
    console.warn(`[VariableResolver] Blocked access to dangerous property in path: ${path}`)
    return undefined
  }

  // First check direct variables (using hasOwnProperty to prevent prototype chain access)
  if (
    context.variables &&
    Object.prototype.hasOwnProperty.call(context.variables, path)
  ) {
    return context.variables[path]
  }

  // Check brand kit
  if (path.startsWith('brandKit.') && context.brandKit) {
    const key = path.slice(9) as keyof typeof context.brandKit
    return context.brandKit[key]
  }

  // Check Life Here data
  if (path.startsWith('lifeHere.') && context.lifeHereData) {
    return getDeepValue(context.lifeHereData, path.slice(9))
  }

  // Check listing data
  if (path.startsWith('listing.') && context.listingData) {
    return getDeepValue(context.listingData, path.slice(8))
  }

  // Check agent data
  if (path.startsWith('agent.') && context.agentData) {
    return getDeepValue(context.agentData, path.slice(6))
  }

  // Try dot notation on all context sources
  const parts = path.split('.')
  if (parts.length > 1) {
    // Check each context source
    const sources = [
      context.variables,
      context.brandKit,
      context.lifeHereData,
      context.listingData,
      context.agentData,
    ]

    for (const source of sources) {
      if (!source) continue
      const value = getDeepValue(source, path)
      if (value !== undefined) return value
    }
  }

  return undefined
}

// Blocked property names to prevent prototype pollution attacks
const BLOCKED_PROPERTIES = new Set([
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
])

/**
 * Get deep value from object using dot notation
 * Includes protection against prototype pollution attacks
 */
function getDeepValue(obj: unknown, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    // Block prototype pollution attempts
    if (BLOCKED_PROPERTIES.has(part)) {
      console.warn(`[VariableResolver] Blocked access to dangerous property: ${part}`)
      return undefined
    }

    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined

    // Use hasOwnProperty check to prevent prototype chain access
    if (!Object.prototype.hasOwnProperty.call(current, part)) {
      return undefined
    }

    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Apply helper function to value
 */
function applyHelper(helper: string, value: unknown): string {
  switch (helper) {
    case 'formatPrice':
      return formatPrice(value)
    case 'formatNumber':
      return formatNumber(value)
    case 'formatDate':
      return formatDate(value)
    case 'uppercase':
      return String(value).toUpperCase()
    case 'lowercase':
      return String(value).toLowerCase()
    case 'capitalize':
      return capitalize(String(value))
    case 'truncate':
      return truncate(String(value), 50)
    default:
      return String(value)
  }
}

// =====================
// FORMATTERS
// =====================

/**
 * Format price with abbreviation for large numbers
 */
export function formatPrice(value: unknown): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (isNaN(num)) return '$0'

  if (num >= 1000000) {
    const millions = num / 1000000
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`
  }

  if (num >= 1000) {
    return `$${num.toLocaleString()}`
  }

  return `$${num}`
}

/**
 * Format number with commas
 */
export function formatNumber(value: unknown): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (isNaN(num)) return '0'
  return num.toLocaleString()
}

/**
 * Format date
 */
export function formatDate(value: unknown): string {
  if (!value) return ''
  const date = new Date(String(value))
  if (isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Capitalize first letter of each word
 */
export function capitalize(text: string): string {
  return text.replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

// =====================
// COLOR RESOLUTION
// =====================

/**
 * Resolve color value, handling variables and defaults
 */
export function resolveColor(
  color: string | undefined,
  context: RenderContext
): string {
  if (!color) return '#000000'

  // Check if it's a variable reference
  if (color.startsWith('{{') && color.endsWith('}}')) {
    const varName = color.slice(2, -2).trim()
    const resolved = getNestedValue(varName, context)
    return isValidColor(String(resolved)) ? String(resolved) : '#000000'
  }

  // Check context variables for color name (using hasOwnProperty for security)
  if (
    context.variables &&
    Object.prototype.hasOwnProperty.call(context.variables, color)
  ) {
    const value = String(context.variables[color])
    if (isValidColor(value)) return value
  }

  // Check brand kit colors
  if (context.brandKit) {
    switch (color) {
      case 'primaryColor':
        return context.brandKit.primaryColor || '#0077ff'
      case 'secondaryColor':
        return context.brandKit.secondaryColor || '#ffffff'
      case 'accentColor':
        return context.brandKit.accentColor || '#ff6b00'
    }
  }

  // Return as-is if it's a valid color
  if (isValidColor(color)) return color

  return '#000000'
}

/**
 * Check if string is a valid CSS color
 */
function isValidColor(color: string): boolean {
  if (!color) return false

  // Hex colors
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color)) {
    return true
  }

  // RGB/RGBA
  if (/^rgba?\([^)]+\)$/.test(color)) {
    return true
  }

  // HSL/HSLA
  if (/^hsla?\([^)]+\)$/.test(color)) {
    return true
  }

  // Named colors (subset of common ones)
  const namedColors = [
    'white', 'black', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
    'pink', 'gray', 'grey', 'transparent',
  ]
  if (namedColors.includes(color.toLowerCase())) {
    return true
  }

  return false
}

// =====================
// AUTO-SIZE CALCULATION
// =====================

/**
 * Calculate optimal font size based on text length
 */
export function calculateAutoSize(
  text: string,
  config: AutoSizeConfig,
  containerWidth: number
): number {
  if (!config.enabled) {
    return config.maxSize || 48
  }

  const minSize = config.minSize || 12
  const maxSize = config.maxSize || 48
  const textLength = text.length

  // Check breakpoints first
  if (config.breakpoints?.length) {
    for (const bp of config.breakpoints.sort((a, b) => a.maxLength - b.maxLength)) {
      if (textLength <= bp.maxLength) {
        return Math.max(minSize, Math.min(bp.fontSize, maxSize))
      }
    }
    // Text exceeds all breakpoints, use minimum
    return minSize
  }

  // Dynamic calculation based on container width and text length
  // Assume average character width is ~0.6 of font size
  const avgCharWidth = 0.6
  const targetCharsPerLine = containerWidth / (maxSize * avgCharWidth)

  if (textLength <= targetCharsPerLine) {
    return maxSize
  }

  // Scale down based on text length
  const scale = targetCharsPerLine / textLength
  const calculatedSize = Math.floor(maxSize * Math.sqrt(scale))

  return Math.max(minSize, Math.min(calculatedSize, maxSize))
}

// =====================
// TEXT UTILITIES
// =====================

/**
 * Split text into lines that fit within a width
 */
export function wrapText(
  text: string,
  maxCharsPerLine: number
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }

  if (currentLine) lines.push(currentLine)
  return lines
}

/**
 * Calculate estimated width of text in pixels
 * This is a rough estimation for layout calculations
 */
export function estimateTextWidth(
  text: string,
  fontSize: number,
  fontWeight: number = 400
): number {
  // Average character width ratio (varies by font)
  const avgWidthRatio = fontWeight >= 600 ? 0.58 : 0.54
  return text.length * fontSize * avgWidthRatio
}
