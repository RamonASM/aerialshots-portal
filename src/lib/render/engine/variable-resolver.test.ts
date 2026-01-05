/**
 * Variable Resolver Tests
 */

import { describe, it, expect } from 'vitest'
import {
  resolveVariables,
  resolveColor,
  calculateAutoSize,
  formatPrice,
  formatNumber,
  formatDate,
  capitalize,
  truncate,
  wrapText,
  estimateTextWidth,
} from './variable-resolver'
import type { RenderContext } from '../types'

describe('resolveVariables', () => {
  const baseContext: RenderContext = {
    variables: {
      name: 'John Doe',
      price: 450000,
      beds: 3,
    },
    brandKit: {
      id: 'test',
      primaryColor: '#0077ff',
      fontFamily: 'Inter',
      agentName: 'Jane Agent',
    },
  }

  it('should resolve simple variables', () => {
    expect(resolveVariables('Hello {{name}}!', baseContext)).toBe('Hello John Doe!')
  })

  it('should resolve multiple variables', () => {
    expect(resolveVariables('{{beds}} beds for {{name}}', baseContext)).toBe('3 beds for John Doe')
  })

  it('should leave unresolved variables as-is', () => {
    expect(resolveVariables('Hello {{unknown}}!', baseContext)).toBe('Hello {{unknown}}!')
  })

  it('should handle empty text', () => {
    expect(resolveVariables('', baseContext)).toBe('')
  })

  it('should resolve brandKit values', () => {
    expect(resolveVariables('Agent: {{brandKit.agentName}}', baseContext)).toBe('Agent: Jane Agent')
  })

  it('should apply formatPrice helper', () => {
    expect(resolveVariables('Price: {{formatPrice price}}', baseContext)).toBe('Price: $450,000')
  })

  it('should apply uppercase helper', () => {
    expect(resolveVariables('{{uppercase name}}', baseContext)).toBe('JOHN DOE')
  })

  it('should apply lowercase helper', () => {
    expect(resolveVariables('{{lowercase name}}', baseContext)).toBe('john doe')
  })
})

describe('resolveColor', () => {
  const context: RenderContext = {
    variables: {
      customColor: '#ff0000',
    },
    brandKit: {
      id: 'test',
      primaryColor: '#0077ff',
      secondaryColor: '#ffffff',
      fontFamily: 'Inter',
    },
  }

  it('should return hex colors as-is', () => {
    expect(resolveColor('#ff6b00', context)).toBe('#ff6b00')
  })

  it('should resolve variable references', () => {
    expect(resolveColor('{{customColor}}', context)).toBe('#ff0000')
  })

  it('should resolve brandKit color names', () => {
    expect(resolveColor('primaryColor', context)).toBe('#0077ff')
    expect(resolveColor('secondaryColor', context)).toBe('#ffffff')
  })

  it('should handle rgba colors', () => {
    expect(resolveColor('rgba(255, 255, 255, 0.5)', context)).toBe('rgba(255, 255, 255, 0.5)')
  })

  it('should return default for undefined', () => {
    expect(resolveColor(undefined, context)).toBe('#000000')
  })

  it('should return default for invalid colors', () => {
    expect(resolveColor('notacolor', context)).toBe('#000000')
  })
})

describe('formatPrice', () => {
  it('should format millions with M suffix', () => {
    expect(formatPrice(1000000)).toBe('$1M')
    expect(formatPrice(1500000)).toBe('$1.5M')
    expect(formatPrice(2000000)).toBe('$2M')
  })

  it('should format thousands with commas', () => {
    expect(formatPrice(450000)).toBe('$450,000')
    expect(formatPrice(1500)).toBe('$1,500')
  })

  it('should handle small numbers', () => {
    expect(formatPrice(500)).toBe('$500')
    expect(formatPrice(0)).toBe('$0')
  })

  it('should handle string input', () => {
    expect(formatPrice('450000')).toBe('$450,000')
  })

  it('should handle NaN', () => {
    expect(formatPrice('not a number')).toBe('$0')
  })
})

describe('formatNumber', () => {
  it('should add commas to large numbers', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1000000)).toBe('1,000,000')
  })

  it('should handle decimal numbers', () => {
    expect(formatNumber(1234.56)).toBe('1,234.56')
  })
})

describe('formatDate', () => {
  it('should format valid dates', () => {
    const result = formatDate('2025-01-15T12:00:00Z')
    expect(result).toContain('Jan')
    expect(result).toContain('2025')
    // Day may vary by timezone, just check format is correct
    expect(result).toMatch(/Jan \d{1,2}, 2025/)
  })

  it('should return empty string for empty input', () => {
    expect(formatDate('')).toBe('')
  })

  it('should return original string for invalid dates', () => {
    expect(formatDate('not a date')).toBe('not a date')
  })
})

describe('capitalize', () => {
  it('should capitalize first letter of each word', () => {
    expect(capitalize('hello world')).toBe('Hello World')
    expect(capitalize('ALREADY CAPS')).toBe('ALREADY CAPS')
  })
})

describe('truncate', () => {
  it('should truncate long text with ellipsis', () => {
    const longText = 'This is a very long text that needs to be truncated'
    expect(truncate(longText, 20)).toBe('This is a very lo...')
  })

  it('should not truncate short text', () => {
    expect(truncate('Short', 20)).toBe('Short')
  })

  it('should handle edge case at exact length', () => {
    expect(truncate('12345', 5)).toBe('12345')
  })
})

describe('calculateAutoSize', () => {
  const containerWidth = 960

  it('should return maxSize for short text', () => {
    const config = { enabled: true, minSize: 24, maxSize: 48 }
    expect(calculateAutoSize('Hi', config, containerWidth)).toBe(48)
  })

  it('should use breakpoints when provided', () => {
    const config = {
      enabled: true,
      minSize: 24,
      maxSize: 48,
      breakpoints: [
        { maxLength: 10, fontSize: 48 },
        { maxLength: 30, fontSize: 36 },
        { maxLength: 60, fontSize: 28 },
      ],
    }
    expect(calculateAutoSize('Hello', config, containerWidth)).toBe(48)
    expect(calculateAutoSize('This is a medium length headline', config, containerWidth)).toBe(28)
  })

  it('should return minSize for very long text', () => {
    const config = {
      enabled: true,
      minSize: 24,
      maxSize: 48,
      breakpoints: [
        { maxLength: 10, fontSize: 48 },
        { maxLength: 30, fontSize: 36 },
      ],
    }
    const veryLongText = 'This is a very long text that exceeds all breakpoints by a significant margin'
    expect(calculateAutoSize(veryLongText, config, containerWidth)).toBe(24)
  })

  it('should return maxSize when disabled', () => {
    const config = { enabled: false, maxSize: 48 }
    expect(calculateAutoSize('Any text', config, containerWidth)).toBe(48)
  })
})

describe('wrapText', () => {
  it('should wrap text at word boundaries', () => {
    const lines = wrapText('Hello world this is a test', 15)
    expect(lines).toEqual(['Hello world', 'this is a test'])
  })

  it('should handle single long word', () => {
    const lines = wrapText('Supercalifragilistic', 10)
    expect(lines).toEqual(['Supercalifragilistic'])
  })

  it('should handle empty text', () => {
    const lines = wrapText('', 20)
    expect(lines).toEqual([])
  })
})

describe('estimateTextWidth', () => {
  it('should estimate width based on font size', () => {
    const width16 = estimateTextWidth('Hello', 16)
    const width32 = estimateTextWidth('Hello', 32)
    expect(width32).toBeGreaterThan(width16)
    expect(width32).toBeCloseTo(width16 * 2, 0)
  })

  it('should account for bold weight', () => {
    const regular = estimateTextWidth('Hello', 16, 400)
    const bold = estimateTextWidth('Hello', 16, 700)
    expect(bold).toBeGreaterThan(regular)
  })
})

describe('security', () => {
  const baseContext = {
    variables: {
      name: 'John',
      nested: {
        value: 'nested value',
      },
    },
  } as unknown as RenderContext

  it('should block __proto__ access', () => {
    const result = resolveVariables('{{__proto__.isAdmin}}', baseContext)
    // Should not resolve - return original template
    expect(result).toBe('{{__proto__.isAdmin}}')
  })

  it('should block constructor access', () => {
    const result = resolveVariables('{{constructor.prototype}}', baseContext)
    expect(result).toBe('{{constructor.prototype}}')
  })

  it('should block prototype access', () => {
    const result = resolveVariables('{{prototype.constructor}}', baseContext)
    expect(result).toBe('{{prototype.constructor}}')
  })

  it('should block nested __proto__ access', () => {
    const result = resolveVariables('{{nested.__proto__.polluted}}', baseContext)
    expect(result).toBe('{{nested.__proto__.polluted}}')
  })

  it('should still allow normal nested access', () => {
    const result = resolveVariables('{{nested.value}}', baseContext)
    expect(result).toBe('nested value')
  })

  it('should block __defineGetter__ access', () => {
    const result = resolveVariables('{{__defineGetter__}}', baseContext)
    expect(result).toBe('{{__defineGetter__}}')
  })

  it('should block __lookupGetter__ access', () => {
    const result = resolveVariables('{{__lookupGetter__}}', baseContext)
    expect(result).toBe('{{__lookupGetter__}}')
  })
})
