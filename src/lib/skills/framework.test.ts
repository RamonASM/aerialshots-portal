import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  registerSkill,
  getSkill,
  hasSkill,
  listSkills,
  getSkillsByCategory,
  clearRegistry,
  getRegistryStats,
  executeSkill,
  executeSkillsParallel,
  executeSkillsSequential,
  registerComposition,
  getComposition,
  executeComposition,
  createComposition,
  type SkillDefinition,
  type SkillResult,
} from './index'

// Mock Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
  }),
}))

// Helper to create a test skill
function createTestSkill(id: string, overrides: Partial<SkillDefinition> = {}): SkillDefinition {
  return {
    id,
    name: `Test Skill ${id}`,
    description: 'A test skill',
    category: 'generate',
    version: '1.0.0',
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
    defaultConfig: { timeout: 5000 },
    execute: async () => ({
      success: true,
      data: { result: 'done' },
      metadata: { executionTimeMs: 100 },
    }),
    ...overrides,
  }
}

describe('Skills Framework', () => {
  beforeEach(() => {
    clearRegistry()
    vi.clearAllMocks()
  })

  describe('Skill Registration', () => {
    it('should register a skill', () => {
      const skill = createTestSkill('test-skill')
      registerSkill(skill)

      expect(hasSkill('test-skill')).toBe(true)
    })

    it('should retrieve a registered skill', () => {
      const skill = createTestSkill('my-skill')
      registerSkill(skill)

      const retrieved = getSkill('my-skill')
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe('my-skill')
      expect(retrieved?.name).toBe('Test Skill my-skill')
    })

    it('should return undefined for non-existent skill', () => {
      const skill = getSkill('non-existent')
      expect(skill).toBeUndefined()
    })

    it('should list all registered skills', () => {
      registerSkill(createTestSkill('skill-1'))
      registerSkill(createTestSkill('skill-2'))
      registerSkill(createTestSkill('skill-3'))

      const skills = listSkills()
      expect(skills.length).toBe(3)
    })

    it('should filter skills by category', () => {
      registerSkill(createTestSkill('gen-1', { category: 'generate' }))
      registerSkill(createTestSkill('trans-1', { category: 'transform' }))
      registerSkill(createTestSkill('gen-2', { category: 'generate' }))

      const generateSkills = getSkillsByCategory('generate')
      expect(generateSkills.length).toBe(2)
    })

    it('should throw error for invalid skill definition', () => {
      expect(() => {
        registerSkill({
          id: '',
          name: 'Invalid',
          description: '',
          category: 'generate',
          version: '1.0.0',
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' },
          defaultConfig: {},
          execute: async () => ({ success: true, metadata: { executionTimeMs: 0 } }),
        })
      }).toThrow('missing required fields')
    })

    it('should overwrite existing skill on re-registration', () => {
      registerSkill(createTestSkill('same-id', { name: 'First' }))
      registerSkill(createTestSkill('same-id', { name: 'Second' }))

      const skill = getSkill('same-id')
      expect(skill?.name).toBe('Second')
    })

    it('should get registry stats', () => {
      registerSkill(createTestSkill('gen-1', { category: 'generate' }))
      registerSkill(createTestSkill('trans-1', { category: 'transform' }))
      registerSkill(createTestSkill('notify-1', { category: 'notify' }))

      const stats = getRegistryStats()
      expect(stats.totalSkills).toBe(3)
      expect(stats.byCategory.generate).toBe(1)
      expect(stats.byCategory.transform).toBe(1)
      expect(stats.byCategory.notify).toBe(1)
    })
  })

  describe('Skill Execution', () => {
    it('should execute a skill successfully', async () => {
      registerSkill(createTestSkill('exec-skill'))

      const result = await executeSkill({
        skillId: 'exec-skill',
        input: { prompt: 'test' },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ result: 'done' })
    })

    it('should return error for non-existent skill', async () => {
      const result = await executeSkill({
        skillId: 'non-existent',
        input: {},
        skipLogging: true,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('SKILL_NOT_FOUND')
    })

    it('should handle execution errors', async () => {
      registerSkill(createTestSkill('error-skill', {
        execute: async () => {
          throw new Error('Something went wrong')
        },
      }))

      const result = await executeSkill({
        skillId: 'error-skill',
        input: {},
        config: { retries: 0 },
        skipLogging: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Something went wrong')
    })

    it('should handle validation errors', async () => {
      registerSkill(createTestSkill('validate-skill', {
        validate: () => [{ field: 'input', message: 'Required', code: 'REQUIRED' }],
      }))

      const result = await executeSkill({
        skillId: 'validate-skill',
        input: {},
        skipLogging: true,
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('VALIDATION_ERROR')
    })

    it('should respect timeout configuration', async () => {
      registerSkill(createTestSkill('slow-skill', {
        defaultConfig: { timeout: 50, retries: 0 },
        execute: async () => {
          await new Promise((r) => setTimeout(r, 200))
          return { success: true, metadata: { executionTimeMs: 200 } }
        },
      }))

      const result = await executeSkill({
        skillId: 'slow-skill',
        input: {},
        config: { timeout: 50, retries: 0 },
        skipLogging: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('timeout')
    }, 10000)

    it('should retry on failure', async () => {
      let attempts = 0
      registerSkill(createTestSkill('retry-skill', {
        defaultConfig: { timeout: 5000 },
        execute: async () => {
          attempts++
          if (attempts < 3) {
            return {
              success: false,
              error: 'Try again',
              metadata: { executionTimeMs: 10 },
            }
          }
          return { success: true, data: { attempts }, metadata: { executionTimeMs: 10 } }
        },
      }))

      const result = await executeSkill({
        skillId: 'retry-skill',
        input: {},
        config: { retries: 3 },
        skipLogging: true,
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ attempts: 3 })
    })

    it('should execute skills in parallel', async () => {
      registerSkill(createTestSkill('para-1'))
      registerSkill(createTestSkill('para-2'))
      registerSkill(createTestSkill('para-3'))

      const results = await executeSkillsParallel([
        { skillId: 'para-1', input: {}, skipLogging: true },
        { skillId: 'para-2', input: {}, skipLogging: true },
        { skillId: 'para-3', input: {}, skipLogging: true },
      ])

      expect(results.size).toBe(3)
      expect(results.get('para-1')?.success).toBe(true)
      expect(results.get('para-2')?.success).toBe(true)
      expect(results.get('para-3')?.success).toBe(true)
    })

    it('should execute skills sequentially', async () => {
      const order: string[] = []

      registerSkill(createTestSkill('seq-1', {
        execute: async () => {
          order.push('seq-1')
          return { success: true, metadata: { executionTimeMs: 10 } }
        },
      }))
      registerSkill(createTestSkill('seq-2', {
        execute: async () => {
          order.push('seq-2')
          return { success: true, metadata: { executionTimeMs: 10 } }
        },
      }))

      await executeSkillsSequential([
        { skillId: 'seq-1', input: {}, skipLogging: true },
        { skillId: 'seq-2', input: {}, skipLogging: true },
      ])

      expect(order).toEqual(['seq-1', 'seq-2'])
    })

    it('should stop sequential execution on failure when configured', async () => {
      registerSkill(createTestSkill('first'))
      registerSkill(createTestSkill('second', {
        execute: async () => ({
          success: false,
          error: 'Failed',
          errorCode: 'VALIDATION_ERROR', // Non-retryable
          metadata: { executionTimeMs: 10 },
        }),
      }))
      registerSkill(createTestSkill('third'))

      const { completed, failed } = await executeSkillsSequential([
        { skillId: 'first', input: {}, config: { retries: 0 }, skipLogging: true },
        { skillId: 'second', input: {}, config: { retries: 0 }, skipLogging: true },
        { skillId: 'third', input: {}, config: { retries: 0 }, skipLogging: true },
      ], true)

      expect(completed).toEqual(['first'])
      expect(failed).toEqual(['second'])
    })
  })

  describe('Skill Composition', () => {
    beforeEach(() => {
      registerSkill(createTestSkill('step-1'))
      registerSkill(createTestSkill('step-2'))
      registerSkill(createTestSkill('step-3'))
    })

    it('should register a composition', () => {
      const composition = createComposition('test-comp', 'Test Composition')
        .addStep('step-1')
        .addStep('step-2')
        .build()

      registerComposition(composition)

      expect(getComposition('test-comp')).toBeDefined()
    })

    it('should execute a simple composition', async () => {
      createComposition('simple', 'Simple')
        .addStep('step-1', { required: true })
        .addStep('step-2')
        .register()

      const result = await executeComposition('simple', {}, { skipLogging: true })

      expect(result.success).toBe(true)
      expect(result.completedSteps.length).toBe(2)
    })

    it('should execute parallel steps', async () => {
      createComposition('parallel-comp', 'Parallel')
        .addParallelSteps('analysis', [
          { skillId: 'step-1' },
          { skillId: 'step-2' },
        ])
        .addStep('step-3')
        .register()

      const result = await executeComposition('parallel-comp', {}, { skipLogging: true })

      expect(result.success).toBe(true)
      expect(result.completedSteps.length).toBe(3)
    })

    it('should handle conditional steps', async () => {
      registerSkill(createTestSkill('conditional'))

      createComposition('conditional-comp', 'Conditional')
        .addStep('step-1')
        .addStep('conditional', {
          stepName: 'Conditional Step',
          condition: async () => false, // Always skip
        })
        .addStep('step-2')
        .register()

      const result = await executeComposition('conditional-comp', {}, { skipLogging: true })

      expect(result.success).toBe(true)
      expect(result.completedSteps).toContain('step-1')
      expect(result.completedSteps).toContain('step-2')
      expect(result.skippedSteps).toContain('Conditional Step')
    })

    it('should pass data between steps', async () => {
      registerSkill(createTestSkill('producer', {
        execute: async () => ({
          success: true,
          data: { value: 42 },
          metadata: { executionTimeMs: 10 },
        }),
      }))

      let receivedData: unknown

      registerSkill(createTestSkill('consumer', {
        execute: async (input) => {
          receivedData = input
          return { success: true, metadata: { executionTimeMs: 10 } }
        },
      }))

      createComposition('data-flow', 'Data Flow')
        .addStep('producer', { outputCapture: 'producerResult' })
        .addStep('consumer', {
          inputMapper: async (ctx) => ctx.getData('producerResult'),
        })
        .register()

      await executeComposition('data-flow', {}, { skipLogging: true })

      expect(receivedData).toEqual({ value: 42 })
    })

    it('should stop on required step failure', async () => {
      registerSkill(createTestSkill('failing', {
        defaultConfig: { retries: 0 },
        execute: async () => ({
          success: false,
          error: 'Failed',
          errorCode: 'VALIDATION_ERROR', // Non-retryable
          metadata: { executionTimeMs: 10 },
        }),
      }))

      createComposition('stop-on-fail', 'Stop on Fail')
        .addStep('step-1')
        .addStep('failing', { required: true, retries: 0 })
        .addStep('step-2')
        .onError('stop')
        .register()

      const result = await executeComposition('stop-on-fail', {}, { skipLogging: true })

      expect(result.success).toBe(false)
      expect(result.completedSteps).toContain('step-1')
      expect(result.failedSteps).toContain('failing')
      expect(result.completedSteps).not.toContain('step-2')
    })

    it('should continue on non-required step failure', async () => {
      registerSkill(createTestSkill('failing', {
        defaultConfig: { retries: 0 },
        execute: async () => ({
          success: false,
          error: 'Failed',
          errorCode: 'VALIDATION_ERROR', // Non-retryable
          metadata: { executionTimeMs: 10 },
        }),
      }))

      createComposition('continue-on-fail', 'Continue on Fail')
        .addStep('step-1')
        .addStep('failing', { required: false, retries: 0 })
        .addStep('step-2')
        .onError('continue')
        .register()

      const result = await executeComposition('continue-on-fail', {}, { skipLogging: true })

      expect(result.success).toBe(true)
      expect(result.completedSteps).toContain('step-1')
      expect(result.completedSteps).toContain('step-2')
      expect(result.failedSteps).toContain('failing')
    })

    it('should return error for non-existent composition', async () => {
      const result = await executeComposition('non-existent', {})

      expect(result.success).toBe(false)
      expect(result.errors?.[0]).toContain('not found')
    })
  })

  describe('Composition Builder', () => {
    it('should build composition with fluent API', () => {
      const composition = createComposition('fluent', 'Fluent Test')
        .withDescription('A fluent composition')
        .withVersion('2.0.0')
        .addStep('step-1', { required: true })
        .addStep('step-2')
        .onError('continue')
        .build()

      expect(composition.id).toBe('fluent')
      expect(composition.name).toBe('Fluent Test')
      expect(composition.description).toBe('A fluent composition')
      expect(composition.version).toBe('2.0.0')
      expect(composition.steps.length).toBe(2)
      expect(composition.errorHandling.mode).toBe('continue')
    })

    it('should support parallel step groups', () => {
      const composition = createComposition('parallel', 'Parallel')
        .addStep('pre')
        .addParallelSteps('group1', [
          { skillId: 'a' },
          { skillId: 'b' },
        ])
        .addStep('post')
        .build()

      expect(composition.steps.length).toBe(4)
      expect(composition.steps[1].parallel).toBe('group1')
      expect(composition.steps[2].parallel).toBe('group1')
    })

    it('should support required steps in error policy', () => {
      const composition = createComposition('required', 'Required')
        .addStep('critical')
        .addStep('optional')
        .requiredSteps('critical')
        .build()

      expect(composition.errorHandling.requiredSteps).toContain('critical')
    })
  })
})
