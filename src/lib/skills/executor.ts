/**
 * Skills Executor
 *
 * Handles skill execution with:
 * - Input validation
 * - Execution logging
 * - Error handling and retries
 * - Cost tracking
 * - Timeout management
 */

import { v4 as uuidv4 } from 'uuid'
import type {
  SkillDefinition,
  SkillResult,
  SkillExecutionContext,
  SkillConfig,
  SkillStatus,
  SkillExecutionRecord,
} from './types'
import {
  getSkill,
  saveSkillExecution,
  updateSkillExecution,
} from './registry'

/**
 * Skill execution options
 */
export interface ExecuteSkillOptions {
  skillId: string
  input: unknown
  config?: Partial<SkillConfig>
  triggeredBy?: string
  triggerSource?: SkillExecutionContext['triggerSource']
  listingId?: string
  campaignId?: string
  parentExecutionId?: string
  sharedContext?: Record<string, unknown>
  skipLogging?: boolean      // Skip database logging (for testing)
}

/**
 * Execute a skill by ID
 */
export async function executeSkill<TInput = unknown, TOutput = unknown>(
  options: ExecuteSkillOptions
): Promise<SkillResult<TOutput>> {
  const {
    skillId,
    input,
    config: configOverrides = {},
    triggeredBy = 'unknown',
    triggerSource = 'manual',
    listingId,
    campaignId,
    parentExecutionId,
    sharedContext,
    skipLogging = false,
  } = options

  const executionId = uuidv4()
  const startedAt = new Date()

  // Get skill definition
  const skill = getSkill<TInput, TOutput>(skillId)
  if (!skill) {
    return {
      success: false,
      error: `Skill '${skillId}' not found`,
      errorCode: 'SKILL_NOT_FOUND',
      metadata: {
        executionTimeMs: 0,
      },
    }
  }

  // Merge configs
  const config: SkillConfig = {
    ...skill.defaultConfig,
    ...configOverrides,
  }

  // Create execution context
  const context: SkillExecutionContext = {
    executionId,
    skillId,
    triggeredBy,
    triggerSource,
    startedAt,
    config,
    listingId,
    campaignId,
    parentExecutionId,
    sharedContext,
  }

  // Create execution record
  const record: SkillExecutionRecord = {
    id: executionId,
    skillId,
    startedAt,
    status: 'running',
    input,
    triggeredBy,
    triggerSource,
    listingId,
    campaignId,
    parentExecutionId,
  }

  // Save initial execution record
  if (!skipLogging) {
    await saveSkillExecution(record)
  }

  try {
    // Validate input if validator exists
    if (skill.validate) {
      const errors = skill.validate(input as TInput)
      if (errors.length > 0) {
        const errorMsg = errors.map((e) => `${e.field}: ${e.message}`).join(', ')
        const result: SkillResult<TOutput> = {
          success: false,
          error: `Validation failed: ${errorMsg}`,
          errorCode: 'VALIDATION_ERROR',
          metadata: {
            executionTimeMs: Date.now() - startedAt.getTime(),
          },
        }

        if (!skipLogging) {
          await updateSkillExecution(executionId, {
            status: 'failed',
            completedAt: new Date(),
            errorMessage: result.error,
            executionTimeMs: result.metadata.executionTimeMs,
          })
        }

        return result
      }
    }

    // Execute with timeout and retries
    const result = await executeWithRetry<TInput, TOutput>(
      skill,
      input as TInput,
      context,
      config.retries !== undefined ? config.retries : 3
    )

    // Update execution record
    if (!skipLogging) {
      await updateSkillExecution(executionId, {
        status: result.success ? 'completed' : 'failed',
        completedAt: new Date(),
        output: result.data,
        errorMessage: result.error,
        executionTimeMs: result.metadata.executionTimeMs,
        tokensUsed: result.metadata.tokensUsed,
        costUsd: result.metadata.costUsd,
      })
    }

    // Run cleanup if defined
    if (skill.cleanup) {
      try {
        await skill.cleanup(context)
      } catch (cleanupError) {
        console.warn(`[Skills] Cleanup error for ${skillId}:`, cleanupError)
      }
    }

    return result
  } catch (error) {
    const executionTimeMs = Date.now() - startedAt.getTime()
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    const result: SkillResult<TOutput> = {
      success: false,
      error: errorMessage,
      errorCode: 'EXECUTION_ERROR',
      metadata: {
        executionTimeMs,
      },
    }

    if (!skipLogging) {
      await updateSkillExecution(executionId, {
        status: 'failed',
        completedAt: new Date(),
        errorMessage,
        executionTimeMs,
      })
    }

    return result
  }
}

/**
 * Execute with retry logic
 */
async function executeWithRetry<TInput, TOutput>(
  skill: SkillDefinition<TInput, TOutput>,
  input: TInput,
  context: SkillExecutionContext,
  maxRetries: number
): Promise<SkillResult<TOutput>> {
  const timeout = context.config.timeout || 30000
  let lastError: string | undefined
  let retryCount = 0

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Create an AbortController for this attempt
    const controller = new AbortController()
    const attemptContext = {
      ...context,
      abortSignal: controller.signal
    }

    try {
      // Execute with timeout and cancellation support
      const result = await executeWithTimeout(
        skill.execute(input, attemptContext),
        timeout,
        controller
      )

      // Add retry count to metadata
      if (result.metadata) {
        result.metadata.retryCount = retryCount
      }

      // If successful or non-retryable error, return
      if (result.success || isNonRetryableError(result.errorCode)) {
        return result
      }

      lastError = result.error
      retryCount++

      // Wait before retry with exponential backoff
      if (attempt < maxRetries) {
        const delay = getRetryDelay(attempt, result.errorCode === 'RATE_LIMITED')
        await sleep(delay)
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error'
      retryCount++

      if (attempt < maxRetries) {
        const delay = getRetryDelay(attempt, false)
        await sleep(delay)
      }
    } finally {
      // Always cleanup the controller to prevent listener leaks
      controller.abort('attempt_finished')
    }
  }

  // All retries exhausted
  return {
    success: false,
    error: lastError || 'Max retries exceeded',
    errorCode: 'MAX_RETRIES_EXCEEDED',
    metadata: {
      executionTimeMs: Date.now() - context.startedAt.getTime(),
      retryCount,
    },
  }
}

/**
 * Execute with timeout and cancellation
 */
async function executeWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  controller: AbortController
): Promise<T> {
  let timeoutId: NodeJS.Timeout

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort('timeout')
      reject(new Error('Execution timeout'))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    // @ts-ignore - timeoutId is assigned
    clearTimeout(timeoutId)
  }
}

/**
 * Check if error is non-retryable
 */
function isNonRetryableError(errorCode?: string): boolean {
  const nonRetryable = [
    'VALIDATION_ERROR',
    'INVALID_API_KEY',
    'QUOTA_EXCEEDED',
    'BILLING_ERROR',
    'PERMISSION_DENIED',
    'INVALID_INPUT',
    'IMAGE_FETCH_ERROR',       // Image doesn't exist, retrying won't help
    'FFMPEG_NOT_AVAILABLE',    // FFmpeg not installed, system config issue
    'VIDEO_NOT_FOUND',         // Video file doesn't exist
    'AUDIO_FETCH_ERROR',       // Audio file doesn't exist
  ]
  return errorCode ? nonRetryable.includes(errorCode) : false
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
function getRetryDelay(attempt: number, isRateLimited: boolean): number {
  const baseDelay = 1000  // 1 second
  const maxDelay = 30000  // 30 seconds

  // Exponential backoff: 1s, 2s, 4s, 8s, ...
  let delay = baseDelay * Math.pow(2, attempt)

  // Add jitter (0-25% of delay)
  delay += Math.random() * delay * 0.25

  // Rate limited errors get 3x delay
  if (isRateLimited) {
    delay *= 3
  }

  return Math.min(delay, maxDelay)
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Execute multiple skills in parallel
 */
export async function executeSkillsParallel(
  options: ExecuteSkillOptions[]
): Promise<Map<string, SkillResult>> {
  const results = new Map<string, SkillResult>()

  const promises = options.map(async (opt) => {
    const result = await executeSkill(opt)
    results.set(opt.skillId, result)
  })

  await Promise.all(promises)
  return results
}

/**
 * Execute multiple skills in sequence
 */
export async function executeSkillsSequential(
  options: ExecuteSkillOptions[],
  stopOnFailure: boolean = true
): Promise<{
  results: Map<string, SkillResult>
  completed: string[]
  failed: string[]
}> {
  const results = new Map<string, SkillResult>()
  const completed: string[] = []
  const failed: string[] = []

  for (const opt of options) {
    const result = await executeSkill(opt)
    results.set(opt.skillId, result)

    if (result.success) {
      completed.push(opt.skillId)
    } else {
      failed.push(opt.skillId)
      if (stopOnFailure) {
        break
      }
    }
  }

  return { results, completed, failed }
}

/**
 * Cancel a running skill execution
 */
export async function cancelSkillExecution(
  executionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateSkillExecution(executionId, {
      status: 'cancelled',
      completedAt: new Date(),
      errorMessage: 'Execution cancelled by user',
    })
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Estimate cost for a skill execution
 */
export async function estimateSkillCost(
  skillId: string,
  input: unknown
): Promise<{ estimatedCost: number; breakdown?: Record<string, number> }> {
  const skill = getSkill(skillId)
  if (!skill) {
    return { estimatedCost: 0 }
  }

  if (skill.estimateCost) {
    const cost = await skill.estimateCost(input)
    return { estimatedCost: cost }
  }

  // Default cost estimation based on provider
  const providerCosts: Record<string, number> = {
    gemini: 0.002,      // Approx per call
    anthropic: 0.003,
    openai: 0.005,
    founddr: 0.10,      // Per image
    ffmpeg: 0,          // Free (local)
    bannerbear: 0.10,
  }

  const provider = skill.provider || 'gemini'
  return { estimatedCost: providerCosts[provider] || 0.01 }
}
