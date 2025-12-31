/**
 * Circuit Breaker Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  CircuitBreaker,
  CircuitOpenError,
  TimeoutError,
  withCircuitBreaker,
  isCircuitOpen,
  getCircuitStats,
  circuitBreaker,
} from './circuit-breaker'

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker

  beforeEach(() => {
    breaker = new CircuitBreaker()
  })

  describe('Initial State', () => {
    it('should start in CLOSED state', () => {
      const stats = breaker.getStats('test-service')
      expect(stats.state).toBe('CLOSED')
    })

    it('should have zero failures and successes initially', () => {
      const stats = breaker.getStats('test-service')
      expect(stats.failures).toBe(0)
      expect(stats.successes).toBe(0)
      expect(stats.totalRequests).toBe(0)
    })

    it('should allow requests when CLOSED', () => {
      expect(breaker.canRequest('test-service')).toBe(true)
    })
  })

  describe('Configuration', () => {
    it('should use default config for unknown services', () => {
      const stats = breaker.getStats('unknown-service')
      expect(stats.state).toBe('CLOSED')
    })

    it('should allow custom configuration', () => {
      breaker.configure('custom-service', {
        failureThreshold: 10,
        recoveryTimeout: 60000,
      })

      // Test that the custom threshold is used
      for (let i = 0; i < 9; i++) {
        breaker.recordFailure('custom-service')
      }

      // Should still be CLOSED after 9 failures (threshold is 10)
      expect(breaker.getStats('custom-service').state).toBe('CLOSED')

      // 10th failure should open the circuit
      breaker.recordFailure('custom-service')
      expect(breaker.getStats('custom-service').state).toBe('OPEN')
    })

    it('should have pre-configured settings for known services', () => {
      // Should not throw for known services
      expect(() => breaker.getStats('claude-api')).not.toThrow()
      expect(() => breaker.getStats('life-here-api')).not.toThrow()
      expect(() => breaker.getStats('supabase-storage')).not.toThrow()
    })
  })

  describe('State Transitions', () => {
    it('should transition to OPEN after failure threshold', () => {
      // Default threshold is 5
      for (let i = 0; i < 4; i++) {
        breaker.recordFailure('test-service')
        expect(breaker.getStats('test-service').state).toBe('CLOSED')
      }

      breaker.recordFailure('test-service')
      expect(breaker.getStats('test-service').state).toBe('OPEN')
    })

    it('should reject requests when OPEN', () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure('test-service')
      }

      expect(breaker.canRequest('test-service')).toBe(false)
    })

    it('should transition to HALF_OPEN after recovery timeout', async () => {
      breaker.configure('test-service', {
        failureThreshold: 5,
        recoveryTimeout: 100, // 100ms for testing
        successThreshold: 1,
      })

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure('test-service')
      }

      expect(breaker.getStats('test-service').state).toBe('OPEN')

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should transition to HALF_OPEN when canRequest is called
      expect(breaker.canRequest('test-service')).toBe(true)
      expect(breaker.getStats('test-service').state).toBe('HALF_OPEN')
    })

    it('should transition to CLOSED after success threshold in HALF_OPEN', async () => {
      breaker.configure('test-service', {
        failureThreshold: 2,
        recoveryTimeout: 50,
        successThreshold: 2,
      })

      // Open the circuit
      breaker.recordFailure('test-service')
      breaker.recordFailure('test-service')
      expect(breaker.getStats('test-service').state).toBe('OPEN')

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 100))
      breaker.canRequest('test-service') // Trigger transition to HALF_OPEN

      // Record successes
      breaker.recordSuccess('test-service')
      expect(breaker.getStats('test-service').state).toBe('HALF_OPEN')

      breaker.recordSuccess('test-service')
      expect(breaker.getStats('test-service').state).toBe('CLOSED')
    })

    it('should transition back to OPEN if failure in HALF_OPEN', async () => {
      breaker.configure('test-service', {
        failureThreshold: 2,
        recoveryTimeout: 50,
        successThreshold: 3,
      })

      // Open the circuit
      breaker.recordFailure('test-service')
      breaker.recordFailure('test-service')

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 100))
      breaker.canRequest('test-service') // Trigger transition to HALF_OPEN

      expect(breaker.getStats('test-service').state).toBe('HALF_OPEN')

      // Failure during HALF_OPEN should go back to OPEN
      breaker.recordFailure('test-service')
      expect(breaker.getStats('test-service').state).toBe('OPEN')
    })
  })

  describe('Success/Failure Tracking', () => {
    it('should track total requests', async () => {
      breaker.recordSuccess('test-service')
      breaker.recordSuccess('test-service')
      breaker.recordFailure('test-service')

      const stats = breaker.getStats('test-service')
      expect(stats.totalSuccesses).toBe(2)
      expect(stats.totalFailures).toBe(1)
    })

    it('should reset failure count on success', () => {
      breaker.recordFailure('test-service')
      breaker.recordFailure('test-service')
      expect(breaker.getStats('test-service').failures).toBe(2)

      breaker.recordSuccess('test-service')
      expect(breaker.getStats('test-service').failures).toBe(0)
    })

    it('should reset success count on failure', () => {
      breaker.recordSuccess('test-service')
      breaker.recordSuccess('test-service')
      expect(breaker.getStats('test-service').successes).toBe(2)

      breaker.recordFailure('test-service')
      expect(breaker.getStats('test-service').successes).toBe(0)
    })

    it('should track last failure/success timestamps', () => {
      const beforeFailure = Date.now()
      breaker.recordFailure('test-service')
      const afterFailure = Date.now()

      const stats1 = breaker.getStats('test-service')
      expect(stats1.lastFailure).toBeGreaterThanOrEqual(beforeFailure)
      expect(stats1.lastFailure).toBeLessThanOrEqual(afterFailure)

      const beforeSuccess = Date.now()
      breaker.recordSuccess('test-service')
      const afterSuccess = Date.now()

      const stats2 = breaker.getStats('test-service')
      expect(stats2.lastSuccess).toBeGreaterThanOrEqual(beforeSuccess)
      expect(stats2.lastSuccess).toBeLessThanOrEqual(afterSuccess)
    })
  })

  describe('call() Method', () => {
    it('should execute function when circuit is CLOSED', async () => {
      const fn = vi.fn().mockResolvedValue('success')

      const result = await breaker.call('test-service', fn)

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalled()
    })

    it('should throw CircuitOpenError when circuit is OPEN', async () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure('test-service')
      }

      const fn = vi.fn().mockResolvedValue('success')

      await expect(breaker.call('test-service', fn)).rejects.toThrow(CircuitOpenError)
      expect(fn).not.toHaveBeenCalled()
    })

    it('should record success on successful execution', async () => {
      const fn = vi.fn().mockResolvedValue('success')

      await breaker.call('test-service', fn)

      const stats = breaker.getStats('test-service')
      expect(stats.totalSuccesses).toBe(1)
    })

    it('should record failure on failed execution', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))

      await expect(breaker.call('test-service', fn)).rejects.toThrow('fail')

      const stats = breaker.getStats('test-service')
      expect(stats.totalFailures).toBe(1)
    })

    it('should timeout slow requests when configured', async () => {
      breaker.configure('slow-service', {
        failureThreshold: 5,
        recoveryTimeout: 30000,
        successThreshold: 3,
        trackTimeouts: true,
        requestTimeout: 50,
      })

      const slowFn = () => new Promise(resolve => setTimeout(resolve, 200))

      await expect(breaker.call('slow-service', slowFn)).rejects.toThrow(TimeoutError)

      const stats = breaker.getStats('slow-service')
      expect(stats.totalFailures).toBe(1)
    })
  })

  describe('Manual Controls', () => {
    it('should allow manually opening a circuit', () => {
      expect(breaker.getStats('test-service').state).toBe('CLOSED')

      breaker.open('test-service')

      expect(breaker.getStats('test-service').state).toBe('OPEN')
    })

    it('should allow manually closing a circuit', () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure('test-service')
      }
      expect(breaker.getStats('test-service').state).toBe('OPEN')

      breaker.close('test-service')

      expect(breaker.getStats('test-service').state).toBe('CLOSED')
    })

    it('should allow resetting a circuit', () => {
      breaker.recordFailure('test-service')
      breaker.recordSuccess('test-service')

      breaker.reset('test-service')

      const stats = breaker.getStats('test-service')
      expect(stats.failures).toBe(0)
      expect(stats.successes).toBe(0)
      expect(stats.totalRequests).toBe(0)
    })

    it('should allow resetting all circuits', () => {
      breaker.recordFailure('service-1')
      breaker.recordFailure('service-2')

      breaker.resetAll()

      expect(breaker.getStats('service-1').failures).toBe(0)
      expect(breaker.getStats('service-2').failures).toBe(0)
    })
  })
})

describe('CircuitOpenError', () => {
  it('should have correct properties', () => {
    const state = {
      state: 'OPEN' as const,
      failures: 5,
      successes: 0,
      lastFailure: Date.now(),
      lastSuccess: null,
      totalRequests: 10,
      totalFailures: 5,
      totalSuccesses: 5,
      lastStateChange: Date.now(),
    }

    const error = new CircuitOpenError('test-service', state)

    expect(error.name).toBe('CircuitOpenError')
    expect(error.service).toBe('test-service')
    expect(error.circuitState).toBe(state)
    expect(error.message).toContain('test-service')
  })
})

describe('TimeoutError', () => {
  it('should have correct properties', () => {
    const error = new TimeoutError('Request timed out after 5000ms')

    expect(error.name).toBe('TimeoutError')
    expect(error.message).toContain('5000ms')
  })
})

describe('Convenience Functions', () => {
  beforeEach(() => {
    circuitBreaker.resetAll()
  })

  describe('withCircuitBreaker', () => {
    it('should use the global circuit breaker instance', async () => {
      const fn = vi.fn().mockResolvedValue('result')

      const result = await withCircuitBreaker('test-service', fn)

      expect(result).toBe('result')
    })
  })

  describe('isCircuitOpen', () => {
    it('should return false when circuit is closed', () => {
      expect(isCircuitOpen('test-service')).toBe(false)
    })

    it('should return true when circuit is open', () => {
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure('test-service')
      }

      expect(isCircuitOpen('test-service')).toBe(true)
    })
  })

  describe('getCircuitStats', () => {
    it('should return stats from global instance', () => {
      circuitBreaker.recordSuccess('test-service')

      const stats = getCircuitStats('test-service')

      expect(stats.totalSuccesses).toBe(1)
    })
  })
})

describe('Service-Specific Circuits', () => {
  let breaker: CircuitBreaker

  beforeEach(() => {
    breaker = new CircuitBreaker()
  })

  it('should maintain separate state for different services', () => {
    breaker.recordFailure('service-a')
    breaker.recordFailure('service-a')
    breaker.recordSuccess('service-b')

    expect(breaker.getStats('service-a').failures).toBe(2)
    expect(breaker.getStats('service-b').failures).toBe(0)
    expect(breaker.getStats('service-b').successes).toBe(1)
  })

  it('should not affect other services when one opens', () => {
    // Open circuit for service-a
    for (let i = 0; i < 5; i++) {
      breaker.recordFailure('service-a')
    }

    expect(breaker.getStats('service-a').state).toBe('OPEN')
    expect(breaker.getStats('service-b').state).toBe('CLOSED')
    expect(breaker.canRequest('service-b')).toBe(true)
  })
})
