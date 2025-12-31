/**
 * Integrate Life Here Skill Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { integrateLifeHereSkill, clearLifeHereCache } from './life-here'
import type { SkillExecutionContext } from '../types'
import type { IntegrateLifeHereInput } from './types'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('integrateLifeHereSkill', () => {
  const mockContext: SkillExecutionContext = {
    executionId: 'exec-life-here-123',
    skillId: 'integrate-life-here',
    triggeredBy: 'test',
    triggerSource: 'manual',
    startedAt: new Date(),
    config: {},
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
    // Clear cache between tests to prevent cross-contamination
    clearLifeHereCache()
  })

  describe('metadata', () => {
    it('should have correct skill identity', () => {
      expect(integrateLifeHereSkill.id).toBe('integrate-life-here')
      expect(integrateLifeHereSkill.name).toBe('Integrate Life Here')
      expect(integrateLifeHereSkill.category).toBe('data')
      expect(integrateLifeHereSkill.version).toBe('1.0.0')
      expect(integrateLifeHereSkill.provider).toBe('life_here')
    })

    it('should define input and output schemas', () => {
      expect(integrateLifeHereSkill.inputSchema).toBeDefined()
      expect(integrateLifeHereSkill.outputSchema).toBeDefined()
      expect(integrateLifeHereSkill.inputSchema.type).toBe('object')
    })
  })

  describe('validation', () => {
    it('should require location source', () => {
      const input: IntegrateLifeHereInput = {
        dataTypes: ['scores'],
      }

      const errors = integrateLifeHereSkill.validate?.(input) ?? []
      expect(errors.some(e => e.field === 'location')).toBe(true)
    })

    it('should accept lat/lng coordinates', () => {
      const input: IntegrateLifeHereInput = {
        lat: 28.5383,
        lng: -81.3792,
        dataTypes: ['scores'],
      }

      const errors = integrateLifeHereSkill.validate?.(input) ?? []
      expect(errors.length).toBe(0)
    })

    it('should accept address with city/state', () => {
      const input: IntegrateLifeHereInput = {
        city: 'Orlando',
        state: 'FL',
        dataTypes: ['dining'],
      }

      const errors = integrateLifeHereSkill.validate?.(input) ?? []
      expect(errors.length).toBe(0)
    })

    it('should require at least one data type', () => {
      const input: IntegrateLifeHereInput = {
        lat: 28.5383,
        lng: -81.3792,
        dataTypes: [],
      }

      const errors = integrateLifeHereSkill.validate?.(input) ?? []
      expect(errors.some(e => e.field === 'dataTypes')).toBe(true)
    })

    it('should validate data type values', () => {
      const input = {
        lat: 28.5383,
        lng: -81.3792,
        dataTypes: ['invalid_type' as any],
      }

      const errors = integrateLifeHereSkill.validate?.(input) ?? []
      expect(errors.some(e => e.code === 'INVALID')).toBe(true)
    })

    it('should accept valid data types', () => {
      const input: IntegrateLifeHereInput = {
        lat: 28.5383,
        lng: -81.3792,
        dataTypes: ['scores', 'dining', 'commute', 'events'],
      }

      const errors = integrateLifeHereSkill.validate?.(input) ?? []
      expect(errors.length).toBe(0)
    })
  })

  describe('execution', () => {
    it('should fetch scores endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            lifeHereScore: {
              score: 87,
              label: 'Excellent',
              profile: 'balanced',
              description: 'Great lifestyle location',
            },
          },
        }),
      })

      const input: IntegrateLifeHereInput = {
        lat: 28.5383,
        lng: -81.3792,
        dataTypes: ['scores'],
        profile: 'balanced',
      }

      const result = await integrateLifeHereSkill.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.data?.lifeHereScore?.score).toBe(87)
      expect(result.data?.dataFetched).toContain('scores')
    })

    it('should fetch dining endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            restaurants: [
              { name: 'The Ravenous Pig', cuisine: 'American', rating: 4.7, distance: 0.8 },
              { name: 'Cafe Tu Tu Tango', cuisine: 'Tapas', rating: 4.5, distance: 1.2 },
            ],
            total: 45,
            avgRating: 4.2,
          },
        }),
      })

      const input: IntegrateLifeHereInput = {
        lat: 28.5383,
        lng: -81.3792,
        dataTypes: ['dining'],
        limit: 5,
      }

      const result = await integrateLifeHereSkill.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.data?.dining?.count).toBe(45)
      expect(result.data?.dining?.topPicks.length).toBe(2)
    })

    it('should fetch multiple endpoints in parallel', async () => {
      // Mock scores
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            lifeHereScore: { score: 85, label: 'Great', profile: 'balanced', description: 'Nice area' },
          },
        }),
      })

      // Mock dining
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { restaurants: [], total: 30 },
        }),
      })

      // Mock commute
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            destinations: {
              airport: { minutes: 25 },
              beach: { minutes: 45 },
              downtown: { minutes: 15 },
            },
          },
        }),
      })

      const input: IntegrateLifeHereInput = {
        lat: 28.5383,
        lng: -81.3792,
        dataTypes: ['scores', 'dining', 'commute'],
      }

      const result = await integrateLifeHereSkill.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.data?.dataFetched.length).toBe(3)
      expect(result.data?.commute?.beachMinutes).toBe(45)
    })

    it('should generate highlights from fetched data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            lifeHereScore: { score: 92, label: 'Exceptional', profile: 'balanced', description: 'Amazing' },
          },
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            restaurants: [{ name: 'Test Restaurant', cuisine: 'Italian', rating: 4.8, distance: 0.5 }],
            total: 50,
          },
        }),
      })

      const input: IntegrateLifeHereInput = {
        lat: 28.5383,
        lng: -81.3792,
        dataTypes: ['scores', 'dining'],
      }

      const result = await integrateLifeHereSkill.execute(input, mockContext)

      expect(result.success).toBe(true)
      expect(result.data?.highlights.length).toBeGreaterThan(0)
      expect(result.data?.highlights.some(h => h.includes('92/100'))).toBe(true)
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const input: IntegrateLifeHereInput = {
        lat: 28.5383,
        lng: -81.3792,
        dataTypes: ['scores'],
      }

      const result = await integrateLifeHereSkill.execute(input, mockContext)

      // Should still succeed but with empty data
      expect(result.success).toBe(true)
      expect(result.data?.dataFetched).not.toContain('scores')
    })

    it('should include location in output', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      })

      const input: IntegrateLifeHereInput = {
        lat: 28.5383,
        lng: -81.3792,
        city: 'Orlando',
        state: 'FL',
        dataTypes: ['overview'],
      }

      const result = await integrateLifeHereSkill.execute(input, mockContext)

      expect(result.data?.location.lat).toBe(28.5383)
      expect(result.data?.location.lng).toBe(-81.3792)
      expect(result.data?.location.city).toBe('Orlando')
    })
  })

  describe('cost estimation', () => {
    it('should estimate cost based on data types', async () => {
      const singleType: IntegrateLifeHereInput = {
        lat: 28.5383,
        lng: -81.3792,
        dataTypes: ['scores'],
      }

      const multipleTypes: IntegrateLifeHereInput = {
        lat: 28.5383,
        lng: -81.3792,
        dataTypes: ['scores', 'dining', 'commute', 'events', 'attractions'],
      }

      const singleCost = await integrateLifeHereSkill.estimateCost?.(singleType)
      const multipleCost = await integrateLifeHereSkill.estimateCost?.(multipleTypes)

      expect(singleCost).toBeDefined()
      expect(multipleCost).toBeDefined()
      expect(multipleCost!).toBeGreaterThan(singleCost!)
    })
  })
})
