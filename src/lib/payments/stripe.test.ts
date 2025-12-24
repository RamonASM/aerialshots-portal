import { describe, it, expect } from 'vitest'
import { toCents, toDollars } from './stripe'

describe('Stripe Utilities', () => {
  describe('toCents', () => {
    it('should convert whole dollars to cents', () => {
      expect(toCents(100)).toBe(10000)
      expect(toCents(1)).toBe(100)
      expect(toCents(0)).toBe(0)
    })

    it('should handle decimal amounts', () => {
      expect(toCents(99.99)).toBe(9999)
      expect(toCents(1.50)).toBe(150)
      expect(toCents(0.01)).toBe(1)
    })

    it('should round to nearest cent', () => {
      expect(toCents(10.999)).toBe(1100)
      expect(toCents(10.001)).toBe(1000)
    })
  })

  describe('toDollars', () => {
    it('should convert cents to dollars', () => {
      expect(toDollars(10000)).toBe(100)
      expect(toDollars(100)).toBe(1)
      expect(toDollars(0)).toBe(0)
    })

    it('should handle decimal results', () => {
      expect(toDollars(9999)).toBe(99.99)
      expect(toDollars(150)).toBe(1.5)
      expect(toDollars(1)).toBe(0.01)
    })
  })

  describe('conversion roundtrip', () => {
    it('should preserve value through conversion cycle', () => {
      const amounts = [0, 1, 99.99, 100, 1000.50, 9999.99]
      for (const amount of amounts) {
        const cents = toCents(amount)
        const dollars = toDollars(cents)
        // Allow small floating point differences
        expect(Math.abs(dollars - amount)).toBeLessThan(0.01)
      }
    })
  })
})
