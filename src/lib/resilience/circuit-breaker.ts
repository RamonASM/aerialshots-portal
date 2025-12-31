/**
 * Circuit Breaker for External Services
 *
 * Implements the circuit breaker pattern to prevent cascade failures
 * when external services (Claude API, Life Here API, Supabase Storage) fail.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failures exceeded threshold, all requests fail fast
 * - HALF_OPEN: Testing if service is back up
 */

import { logger } from '@/lib/logger'

// =====================
// TYPES
// =====================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number
  /** Time in ms to wait before attempting recovery */
  recoveryTimeout: number
  /** Number of successful requests needed to close from half-open */
  successThreshold: number
  /** Whether to track timeouts as failures */
  trackTimeouts: boolean
  /** Request timeout in ms (for tracking) */
  requestTimeout: number
}

export interface CircuitStats {
  state: CircuitState
  failures: number
  successes: number
  lastFailure: number | null
  lastSuccess: number | null
  totalRequests: number
  totalFailures: number
  totalSuccesses: number
}

interface CircuitStateData {
  state: CircuitState
  failures: number
  successes: number
  lastFailure: number | null
  lastSuccess: number | null
  totalRequests: number
  totalFailures: number
  totalSuccesses: number
  lastStateChange: number
}

// =====================
// DEFAULT CONFIG
// =====================

const DEFAULT_CONFIG: CircuitConfig = {
  failureThreshold: 5,
  recoveryTimeout: 30000, // 30 seconds
  successThreshold: 3,
  trackTimeouts: true,
  requestTimeout: 10000, // 10 seconds
}

// Pre-configured circuits for known services
export const SERVICE_CONFIGS: Record<string, Partial<CircuitConfig>> = {
  'claude-api': {
    failureThreshold: 3,
    recoveryTimeout: 60000, // 1 minute - API issues often take time to resolve
    successThreshold: 2,
  },
  'life-here-api': {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    successThreshold: 3,
  },
  'supabase-storage': {
    failureThreshold: 5,
    recoveryTimeout: 15000,
    successThreshold: 2,
  },
  'google-fonts': {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    successThreshold: 2,
  },
}

// =====================
// CIRCUIT BREAKER CLASS
// =====================

export class CircuitBreaker {
  private circuits: Map<string, CircuitStateData> = new Map()
  private configs: Map<string, CircuitConfig> = new Map()

  constructor() {
    // Initialize with default configs for known services
    for (const [service, config] of Object.entries(SERVICE_CONFIGS)) {
      this.configs.set(service, { ...DEFAULT_CONFIG, ...config })
    }
  }

  /**
   * Configure a circuit for a specific service
   */
  configure(service: string, config: Partial<CircuitConfig>): void {
    const currentConfig = this.configs.get(service) || DEFAULT_CONFIG
    this.configs.set(service, { ...currentConfig, ...config })
  }

  /**
   * Get the current state of a circuit
   */
  getState(service: string): CircuitStateData {
    const existing = this.circuits.get(service)
    if (existing) {
      return existing
    }

    // Initialize new circuit in CLOSED state
    const newState: CircuitStateData = {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      lastFailure: null,
      lastSuccess: null,
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      lastStateChange: Date.now(),
    }
    this.circuits.set(service, newState)
    return newState
  }

  /**
   * Get statistics for a circuit
   */
  getStats(service: string): CircuitStats {
    const state = this.getState(service)
    return {
      state: state.state,
      failures: state.failures,
      successes: state.successes,
      lastFailure: state.lastFailure,
      lastSuccess: state.lastSuccess,
      totalRequests: state.totalRequests,
      totalFailures: state.totalFailures,
      totalSuccesses: state.totalSuccesses,
    }
  }

  /**
   * Check if a request can proceed
   */
  canRequest(service: string): boolean {
    const state = this.getState(service)
    const config = this.configs.get(service) || DEFAULT_CONFIG

    if (state.state === 'CLOSED') {
      return true
    }

    if (state.state === 'OPEN') {
      // Check if recovery timeout has passed
      if (Date.now() - state.lastStateChange >= config.recoveryTimeout) {
        this.transitionToHalfOpen(service)
        return true
      }
      return false
    }

    // HALF_OPEN - allow requests to test recovery
    return true
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async call<T>(
    service: string,
    fn: () => Promise<T>,
    options?: { timeout?: number }
  ): Promise<T> {
    const config = this.configs.get(service) || DEFAULT_CONFIG

    // Check if we can make the request
    if (!this.canRequest(service)) {
      const state = this.getState(service)
      logger.warn({
        service,
        state: state.state,
        failures: state.failures,
        lastFailure: state.lastFailure,
      }, `Circuit open for ${service}`)
      throw new CircuitOpenError(service, state)
    }

    // Track this request
    const state = this.getState(service)
    state.totalRequests++

    const timeout = options?.timeout ?? config.requestTimeout

    try {
      // Execute with timeout if configured
      const result = config.trackTimeouts
        ? await this.withTimeout(fn(), timeout)
        : await fn()

      this.recordSuccess(service)
      return result
    } catch (error) {
      this.recordFailure(service, error)
      throw error
    }
  }

  /**
   * Wrap a promise with a timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutHandle: ReturnType<typeof setTimeout>

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new TimeoutError(`Request timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    try {
      return await Promise.race([promise, timeoutPromise])
    } finally {
      clearTimeout(timeoutHandle!)
    }
  }

  /**
   * Record a successful request
   */
  recordSuccess(service: string): void {
    const state = this.getState(service)
    const config = this.configs.get(service) || DEFAULT_CONFIG

    state.successes++
    state.totalSuccesses++
    state.lastSuccess = Date.now()

    // Reset failure count on success
    state.failures = 0

    // If half-open and we've reached success threshold, close the circuit
    if (state.state === 'HALF_OPEN' && state.successes >= config.successThreshold) {
      this.transitionToClosed(service)
    }

    logger.debug({
      service,
      state: state.state,
      successes: state.successes,
    }, `Circuit breaker success for ${service}`)
  }

  /**
   * Record a failed request
   */
  recordFailure(service: string, error?: unknown): void {
    const state = this.getState(service)
    const config = this.configs.get(service) || DEFAULT_CONFIG

    state.failures++
    state.totalFailures++
    state.lastFailure = Date.now()

    // Reset success count on failure
    state.successes = 0

    logger.warn({
      service,
      state: state.state,
      failures: state.failures,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, `Circuit breaker failure for ${service}`)

    // If we've reached the failure threshold, open the circuit
    if (state.state === 'CLOSED' && state.failures >= config.failureThreshold) {
      this.transitionToOpen(service)
    }

    // If half-open and we get a failure, go back to open
    if (state.state === 'HALF_OPEN') {
      this.transitionToOpen(service)
    }
  }

  /**
   * Manually open a circuit (useful for maintenance)
   */
  open(service: string): void {
    this.transitionToOpen(service)
  }

  /**
   * Manually close a circuit
   */
  close(service: string): void {
    this.transitionToClosed(service)
  }

  /**
   * Reset a circuit to initial state
   */
  reset(service: string): void {
    this.circuits.delete(service)
    logger.info({ service }, `Circuit reset for ${service}`)
  }

  /**
   * Reset all circuits
   */
  resetAll(): void {
    this.circuits.clear()
    logger.info('All circuits reset')
  }

  // =====================
  // STATE TRANSITIONS
  // =====================

  private transitionToOpen(service: string): void {
    const state = this.getState(service)
    const previousState = state.state

    state.state = 'OPEN'
    state.lastStateChange = Date.now()
    state.successes = 0

    logger.warn({
      service,
      previousState,
      failures: state.failures,
    }, `Circuit OPEN for ${service}`)
  }

  private transitionToHalfOpen(service: string): void {
    const state = this.getState(service)
    const previousState = state.state

    state.state = 'HALF_OPEN'
    state.lastStateChange = Date.now()
    state.successes = 0

    logger.info({
      service,
      previousState,
    }, `Circuit HALF_OPEN for ${service}`)
  }

  private transitionToClosed(service: string): void {
    const state = this.getState(service)
    const previousState = state.state

    state.state = 'CLOSED'
    state.lastStateChange = Date.now()
    state.failures = 0
    state.successes = 0

    logger.info({
      service,
      previousState,
    }, `Circuit CLOSED for ${service}`)
  }
}

// =====================
// ERROR CLASSES
// =====================

export class CircuitOpenError extends Error {
  constructor(
    public readonly service: string,
    public readonly circuitState: CircuitStateData
  ) {
    super(`Circuit is open for service: ${service}`)
    this.name = 'CircuitOpenError'
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

// =====================
// SINGLETON INSTANCE
// =====================

// Global circuit breaker instance
const circuitBreaker = new CircuitBreaker()

export default circuitBreaker

// Named export for the instance
export { circuitBreaker }

// =====================
// CONVENIENCE FUNCTIONS
// =====================

/**
 * Execute a function with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  service: string,
  fn: () => Promise<T>,
  options?: { timeout?: number }
): Promise<T> {
  return circuitBreaker.call(service, fn, options)
}

/**
 * Check if a service circuit is open
 */
export function isCircuitOpen(service: string): boolean {
  return !circuitBreaker.canRequest(service)
}

/**
 * Get circuit stats for a service
 */
export function getCircuitStats(service: string): CircuitStats {
  return circuitBreaker.getStats(service)
}
