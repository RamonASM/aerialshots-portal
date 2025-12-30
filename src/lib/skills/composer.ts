/**
 * Skills Composer
 *
 * Enables composing multiple skills into workflows with:
 * - Sequential and parallel execution
 * - Conditional step execution
 * - Data mapping between steps
 * - Error handling policies
 */

import { v4 as uuidv4 } from 'uuid'
import type {
  SkillComposition,
  CompositionStep,
  CompositionContext,
  CompositionResult,
  SkillResult,
  ErrorHandlingPolicy,
} from './types'
import { executeSkill, type ExecuteSkillOptions } from './executor'
import { hasSkill } from './registry'

// Composition registry
const compositionRegistry = new Map<string, SkillComposition>()

/**
 * Register a skill composition
 */
export function registerComposition(composition: SkillComposition): void {
  if (compositionRegistry.has(composition.id)) {
    console.warn(`[Skills] Composition '${composition.id}' already registered, overwriting`)
  }

  // Validate all skills exist
  for (const step of composition.steps) {
    if (!hasSkill(step.skillId)) {
      console.warn(`[Skills] Composition '${composition.id}' references unknown skill '${step.skillId}'`)
    }
  }

  compositionRegistry.set(composition.id, composition)
  console.log(`[Skills] Registered composition: ${composition.id} (${composition.steps.length} steps)`)
}

/**
 * Get a composition by ID
 */
export function getComposition(compositionId: string): SkillComposition | undefined {
  return compositionRegistry.get(compositionId)
}

/**
 * List all registered compositions
 */
export function listCompositions(): SkillComposition[] {
  return Array.from(compositionRegistry.values())
}

/**
 * Execute a skill composition
 */
export async function executeComposition(
  compositionId: string,
  input: unknown,
  options: {
    triggeredBy?: string
    listingId?: string
    campaignId?: string
    skipLogging?: boolean
  } = {}
): Promise<CompositionResult> {
  const startTime = Date.now()
  const executionId = uuidv4()

  const composition = getComposition(compositionId)
  if (!composition) {
    return {
      success: false,
      completedSteps: [],
      failedSteps: [],
      skippedSteps: [],
      stepResults: {},
      totalExecutionTimeMs: 0,
      errors: [`Composition '${compositionId}' not found`],
    }
  }

  // Initialize context
  const context: CompositionContext = {
    compositionId,
    executionId,
    currentStep: 0,
    stepResults: {},
    sharedData: {},
    input,
    startedAt: new Date(),
    getData: (path: string) => getNestedValue(context.sharedData, path),
    setData: (path: string, value: unknown) => setNestedValue(context.sharedData, path, value),
  }

  const completedSteps: string[] = []
  const failedSteps: string[] = []
  const skippedSteps: string[] = []
  const errors: string[] = []
  let totalCost = 0

  // Group steps by parallel execution
  const stepGroups = groupStepsByParallel(composition.steps)

  for (const group of stepGroups) {
    const groupResults = await executeStepGroup(
      group,
      context,
      composition.errorHandling,
      options
    )

    // Process results
    for (const [stepId, result] of groupResults) {
      const step = composition.steps.find((s) => s.skillId === stepId)
      const stepName = step?.stepName || stepId

      context.stepResults[stepId] = result

      // Check for skipped first (skipped steps return success: true with error: 'SKIPPED')
      if (result.error === 'SKIPPED') {
        skippedSteps.push(stepName)
      } else if (result.success) {
        completedSteps.push(stepName)
        totalCost += result.metadata.costUsd || 0

        // Run success callback
        if (step?.onSuccess) {
          try {
            await step.onSuccess(result, context)
          } catch (e) {
            console.warn(`[Skills] onSuccess callback error for ${stepName}:`, e)
          }
        }

        // Capture output if specified
        if (step?.outputCapture && result.data) {
          context.sharedData[step.outputCapture] = result.data
        }
      } else {
        failedSteps.push(stepName)
        errors.push(`${stepName}: ${result.error}`)

        // Run error callback
        if (step?.onError) {
          try {
            await step.onError(result.error || 'Unknown error', context)
          } catch (e) {
            console.warn(`[Skills] onError callback error for ${stepName}:`, e)
          }
        }

        // Check if we should stop
        const shouldStop = shouldStopOnFailure(
          step,
          composition.errorHandling
        )
        if (shouldStop) {
          break
        }
      }
    }

    // Check if we hit a stopping failure
    if (failedSteps.length > 0 && composition.errorHandling.mode === 'stop') {
      break
    }

    context.currentStep++
  }

  const totalExecutionTimeMs = Date.now() - startTime

  // Success criteria:
  // 1. No failures at all, OR
  // 2. Mode is 'continue' or 'partial' AND we have completed steps AND no required steps failed
  const hasRequiredFailure = failedSteps.some((stepName) => {
    const step = composition.steps.find((s) => (s.stepName || s.skillId) === stepName)
    return step?.required || composition.errorHandling.requiredSteps?.includes(step?.skillId || '')
  })

  const success = failedSteps.length === 0 ||
    ((composition.errorHandling.mode === 'partial' || composition.errorHandling.mode === 'continue') &&
      completedSteps.length > 0 &&
      !hasRequiredFailure)

  return {
    success,
    completedSteps,
    failedSteps,
    skippedSteps,
    stepResults: context.stepResults,
    totalExecutionTimeMs,
    totalCostUsd: totalCost,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Group steps by parallel execution
 */
function groupStepsByParallel(
  steps: CompositionStep[]
): CompositionStep[][] {
  const groups: CompositionStep[][] = []
  let currentGroup: CompositionStep[] = []
  let currentParallelId: string | undefined

  for (const step of steps) {
    if (step.parallel) {
      if (step.parallel === currentParallelId) {
        // Same parallel group
        currentGroup.push(step)
      } else {
        // New parallel group
        if (currentGroup.length > 0) {
          groups.push(currentGroup)
        }
        currentGroup = [step]
        currentParallelId = step.parallel
      }
    } else {
      // Sequential step
      if (currentGroup.length > 0) {
        groups.push(currentGroup)
      }
      groups.push([step])
      currentGroup = []
      currentParallelId = undefined
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  return groups
}

/**
 * Execute a group of steps (parallel or single)
 */
async function executeStepGroup(
  steps: CompositionStep[],
  context: CompositionContext,
  errorHandling: ErrorHandlingPolicy,
  options: {
    triggeredBy?: string
    listingId?: string
    campaignId?: string
    skipLogging?: boolean
  }
): Promise<Map<string, SkillResult>> {
  const results = new Map<string, SkillResult>()

  if (steps.length === 1) {
    // Single step - execute directly
    const step = steps[0]
    const result = await executeStep(step, context, options)
    results.set(step.skillId, result)
  } else {
    // Multiple steps - execute in parallel
    const promises = steps.map(async (step) => {
      const result = await executeStep(step, context, options)
      results.set(step.skillId, result)
    })
    await Promise.all(promises)
  }

  return results
}

/**
 * Execute a single step
 */
async function executeStep(
  step: CompositionStep,
  context: CompositionContext,
  options: {
    triggeredBy?: string
    listingId?: string
    campaignId?: string
    skipLogging?: boolean
  }
): Promise<SkillResult> {
  // Check condition
  if (step.condition) {
    try {
      const shouldRun = await step.condition(context)
      if (!shouldRun) {
        return {
          success: true,
          error: 'SKIPPED',
          metadata: { executionTimeMs: 0 },
        }
      }
    } catch (e) {
      console.warn(`[Skills] Condition error for ${step.skillId}:`, e)
      // If condition fails, skip the step
      return {
        success: true,
        error: 'SKIPPED',
        metadata: { executionTimeMs: 0 },
      }
    }
  }

  // Map input
  let input: unknown = context.input
  if (step.inputMapper) {
    try {
      input = await step.inputMapper(context)
    } catch (e) {
      return {
        success: false,
        error: `Input mapping failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        errorCode: 'INPUT_MAPPING_ERROR',
        metadata: { executionTimeMs: 0 },
      }
    }
  }

  // Build execution options
  const execOptions: ExecuteSkillOptions = {
    skillId: step.skillId,
    input,
    config: {
      timeout: step.timeout,
      retries: step.retries,
    },
    triggeredBy: options.triggeredBy || 'composition',
    triggerSource: 'workflow',
    listingId: options.listingId,
    campaignId: options.campaignId,
    parentExecutionId: context.executionId,
    sharedContext: context.sharedData,
    skipLogging: options.skipLogging,
  }

  return executeSkill(execOptions)
}

/**
 * Check if failure should stop the composition
 */
function shouldStopOnFailure(
  step: CompositionStep | undefined,
  policy: ErrorHandlingPolicy
): boolean {
  // If step is marked required, always stop
  if (step?.required) {
    return true
  }

  // Check policy mode
  if (policy.mode === 'stop') {
    return true
  }

  // Check if step is in required list
  if (policy.requiredSteps && step) {
    return policy.requiredSteps.includes(step.skillId)
  }

  return false
}

/**
 * Get nested value from object
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Set nested value in object
 */
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split('.')
  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {}
    }
    current = current[part] as Record<string, unknown>
  }

  current[parts[parts.length - 1]] = value
}

// ============================================
// Composition Builder (Fluent API)
// ============================================

/**
 * Fluent builder for creating compositions
 */
export class CompositionBuilder {
  private id: string
  private name: string
  private description: string = ''
  private steps: CompositionStep[] = []
  private errorHandling: ErrorHandlingPolicy = { mode: 'continue' }
  private version: string = '1.0.0'

  constructor(id: string, name: string) {
    this.id = id
    this.name = name
  }

  /**
   * Set description
   */
  withDescription(description: string): this {
    this.description = description
    return this
  }

  /**
   * Set version
   */
  withVersion(version: string): this {
    this.version = version
    return this
  }

  /**
   * Add a step
   */
  addStep(skillId: string, config?: Partial<CompositionStep>): this {
    this.steps.push({
      skillId,
      ...config,
    })
    return this
  }

  /**
   * Add multiple parallel steps
   */
  addParallelSteps(
    groupId: string,
    steps: Array<{ skillId: string; config?: Partial<CompositionStep> }>
  ): this {
    for (const step of steps) {
      this.steps.push({
        skillId: step.skillId,
        parallel: groupId,
        ...step.config,
      })
    }
    return this
  }

  /**
   * Set error handling mode
   */
  onError(mode: ErrorHandlingPolicy['mode']): this {
    this.errorHandling.mode = mode
    return this
  }

  /**
   * Mark steps as required
   */
  requiredSteps(...stepIds: string[]): this {
    this.errorHandling.requiredSteps = stepIds
    return this
  }

  /**
   * Build the composition
   */
  build(): SkillComposition {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      steps: this.steps,
      errorHandling: this.errorHandling,
      version: this.version,
    }
  }

  /**
   * Build and register the composition
   */
  register(): SkillComposition {
    const composition = this.build()
    registerComposition(composition)
    return composition
  }
}

/**
 * Create a new composition builder
 */
export function createComposition(id: string, name: string): CompositionBuilder {
  return new CompositionBuilder(id, name)
}
