/**
 * Workflow Orchestrator Tests
 *
 * TDD tests for multi-step agent workflow execution
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  registerWorkflow,
  getWorkflowDefinition,
  getAllWorkflowDefinitions,
  executeWorkflow,
  getWorkflowExecution,
  pauseWorkflow,
  resumeWorkflow,
  getWorkflowsForResource,
} from './orchestrator'
import type { WorkflowDefinition, WorkflowTrigger } from './types'

// Mock dependencies
const mockSupabase = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockSupabase,
}))

vi.mock('./executor')

import { executeAgent } from './executor'
const mockExecuteAgent = vi.mocked(executeAgent)

// Helper to create chainable mock for Supabase
function createChainableMock(finalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.from = vi.fn().mockReturnValue(chain)
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(finalResult)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Workflow Registry', () => {
  const testWorkflow: WorkflowDefinition = {
    id: 'test-workflow',
    name: 'Test Workflow',
    description: 'A test workflow',
    triggerEvent: 'test.event',
    steps: [
      { agentSlug: 'agent-1', required: true },
      { agentSlug: 'agent-2', required: false },
    ],
    onError: 'continue',
  }

  describe('registerWorkflow', () => {
    it('should register a workflow definition', () => {
      registerWorkflow(testWorkflow)

      const retrieved = getWorkflowDefinition('test-workflow')
      expect(retrieved).toEqual(testWorkflow)
    })

    it('should overwrite existing workflow with same ID', () => {
      const updated: WorkflowDefinition = {
        ...testWorkflow,
        name: 'Updated Workflow',
      }

      registerWorkflow(testWorkflow)
      registerWorkflow(updated)

      const retrieved = getWorkflowDefinition('test-workflow')
      expect(retrieved?.name).toBe('Updated Workflow')
    })
  })

  describe('getWorkflowDefinition', () => {
    it('should return undefined for non-existent workflow', () => {
      const result = getWorkflowDefinition('nonexistent')
      expect(result).toBeUndefined()
    })

    it('should return registered workflow', () => {
      registerWorkflow(testWorkflow)

      const result = getWorkflowDefinition('test-workflow')
      expect(result).toBeDefined()
      expect(result?.id).toBe('test-workflow')
    })
  })

  describe('getAllWorkflowDefinitions', () => {
    it('should return all registered workflows', () => {
      const workflow2: WorkflowDefinition = {
        ...testWorkflow,
        id: 'workflow-2',
        name: 'Workflow 2',
      }

      registerWorkflow(testWorkflow)
      registerWorkflow(workflow2)

      const all = getAllWorkflowDefinitions()
      expect(all.length).toBeGreaterThanOrEqual(2)
      expect(all.find((w) => w.id === 'test-workflow')).toBeDefined()
      expect(all.find((w) => w.id === 'workflow-2')).toBeDefined()
    })
  })
})

describe('executeWorkflow', () => {
  const simpleWorkflow: WorkflowDefinition = {
    id: 'simple-workflow',
    name: 'Simple Workflow',
    description: 'A simple test workflow',
    triggerEvent: 'listing.created',
    steps: [{ agentSlug: 'content-writer', required: true }],
    onError: 'stop',
  }

  const multiStepWorkflow: WorkflowDefinition = {
    id: 'multi-step-workflow',
    name: 'Multi-Step Workflow',
    description: 'A workflow with multiple steps',
    triggerEvent: 'listing.delivered',
    steps: [
      { agentSlug: 'step-1', required: true },
      { agentSlug: 'step-2', required: true },
      { agentSlug: 'step-3', required: false },
    ],
    onError: 'continue',
  }

  beforeEach(() => {
    registerWorkflow(simpleWorkflow)
    registerWorkflow(multiStepWorkflow)
  })

  describe('Workflow Validation', () => {
    it('should throw error if workflow not found', async () => {
      const trigger: WorkflowTrigger = {
        event: 'listing.created',
      }

      await expect(executeWorkflow('nonexistent', trigger)).rejects.toThrow(
        'Workflow definition not found'
      )
    })

    it('should throw error if trigger event does not match', async () => {
      const trigger: WorkflowTrigger = {
        event: 'wrong.event',
      }

      await expect(executeWorkflow('simple-workflow', trigger)).rejects.toThrow(
        'Workflow trigger mismatch'
      )
    })
  })

  describe('Workflow Execution Record', () => {
    it('should create workflow execution record', async () => {
      const insertChain = createChainableMock({
        data: { id: 'wf-123', status: 'pending' },
        error: null,
      })
      const updateChain = createChainableMock({ data: null, error: null })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'ai_agent_workflows') {
          const chain = createChainableMock({
            data: { id: 'wf-123', status: 'pending' },
            error: null,
          })
          chain.update = vi.fn().mockReturnValue(updateChain)
          return chain
        }
        return insertChain
      })

      mockExecuteAgent.mockResolvedValue({
        success: true,
        output: { content: 'generated' },
      })

      const trigger: WorkflowTrigger = {
        event: 'listing.created',
        listingId: 'listing-456',
      }

      await executeWorkflow('simple-workflow', trigger)

      expect(mockSupabase.from).toHaveBeenCalledWith('ai_agent_workflows')
    })

    it('should throw error if execution record creation fails', async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: 'Database error' },
      })
      mockSupabase.from.mockReturnValue(chain)

      const trigger: WorkflowTrigger = {
        event: 'listing.created',
      }

      await expect(executeWorkflow('simple-workflow', trigger)).rejects.toThrow(
        'Failed to create workflow execution record'
      )
    })
  })

  describe('Step Execution', () => {
    it('should execute all steps in order', async () => {
      const insertChain = createChainableMock({
        data: { id: 'wf-123', status: 'pending' },
        error: null,
      })
      const updateChain = createChainableMock({ data: null, error: null })

      mockSupabase.from.mockImplementation(() => {
        const chain = createChainableMock({
          data: { id: 'wf-123', status: 'pending' },
          error: null,
        })
        chain.update = vi.fn().mockReturnValue(updateChain)
        return chain
      })

      mockExecuteAgent.mockResolvedValue({
        success: true,
        output: { result: 'success' },
      })

      const trigger: WorkflowTrigger = {
        event: 'listing.delivered',
      }

      const result = await executeWorkflow('multi-step-workflow', trigger)

      expect(mockExecuteAgent).toHaveBeenCalledTimes(3)
      expect(result.status).toBe('completed')
      expect(result.completedSteps).toBe(3)
    })

    it('should stop on required step failure when onError is stop', async () => {
      const stopWorkflow: WorkflowDefinition = {
        id: 'stop-on-error',
        name: 'Stop on Error',
        description: 'Stops on error',
        triggerEvent: 'test.stop',
        steps: [
          { agentSlug: 'step-1', required: true },
          { agentSlug: 'step-2', required: true },
        ],
        onError: 'stop',
      }
      registerWorkflow(stopWorkflow)

      const insertChain = createChainableMock({
        data: { id: 'wf-123', status: 'pending' },
        error: null,
      })
      const updateChain = createChainableMock({ data: null, error: null })

      mockSupabase.from.mockImplementation(() => {
        const chain = createChainableMock({
          data: { id: 'wf-123', status: 'pending' },
          error: null,
        })
        chain.update = vi.fn().mockReturnValue(updateChain)
        return chain
      })

      mockExecuteAgent.mockResolvedValueOnce({
        success: false,
        output: {},
        error: 'Step 1 failed',
      } as any)

      const trigger: WorkflowTrigger = { event: 'test.stop' }

      const result = await executeWorkflow('stop-on-error', trigger)

      expect(result.status).toBe('failed')
      expect(result.error).toContain('step-1 failed')
      expect(mockExecuteAgent).toHaveBeenCalledTimes(1)
    })

    it('should continue on step failure when onError is continue', async () => {
      const insertChain = createChainableMock({
        data: { id: 'wf-123', status: 'pending' },
        error: null,
      })
      const updateChain = createChainableMock({ data: null, error: null })

      mockSupabase.from.mockImplementation(() => {
        const chain = createChainableMock({
          data: { id: 'wf-123', status: 'pending' },
          error: null,
        })
        chain.update = vi.fn().mockReturnValue(updateChain)
        return chain
      })

      // First step fails, but it's optional (required: false in last step)
      mockExecuteAgent
        .mockResolvedValueOnce({ success: true, output: {} })
        .mockResolvedValueOnce({ success: true, output: {} })
        .mockResolvedValueOnce({ success: false, output: {}, error: 'Failed' } as any)

      const trigger: WorkflowTrigger = { event: 'listing.delivered' }

      const result = await executeWorkflow('multi-step-workflow', trigger)

      expect(mockExecuteAgent).toHaveBeenCalledTimes(3)
      expect(result.status).toBe('completed')
    })
  })

  describe('Conditional Steps', () => {
    it('should skip step when condition returns false', async () => {
      const conditionalWorkflow: WorkflowDefinition = {
        id: 'conditional-workflow',
        name: 'Conditional Workflow',
        description: 'Has conditional steps',
        triggerEvent: 'test.conditional',
        steps: [
          {
            agentSlug: 'always-run',
            required: true,
          },
          {
            agentSlug: 'skip-this',
            condition: () => false,
          },
          {
            agentSlug: 'run-this',
            condition: () => true,
          },
        ],
        onError: 'continue',
      }
      registerWorkflow(conditionalWorkflow)

      const insertChain = createChainableMock({
        data: { id: 'wf-123', status: 'pending' },
        error: null,
      })
      const updateChain = createChainableMock({ data: null, error: null })

      mockSupabase.from.mockImplementation(() => {
        const chain = createChainableMock({
          data: { id: 'wf-123', status: 'pending' },
          error: null,
        })
        chain.update = vi.fn().mockReturnValue(updateChain)
        return chain
      })

      mockExecuteAgent.mockResolvedValue({ success: true, output: {} })

      const trigger: WorkflowTrigger = { event: 'test.conditional' }

      await executeWorkflow('conditional-workflow', trigger)

      // Should only execute 2 agents (skip-this is skipped)
      expect(mockExecuteAgent).toHaveBeenCalledTimes(2)
      expect(mockExecuteAgent).toHaveBeenCalledWith(
        expect.objectContaining({ agentSlug: 'always-run' })
      )
      expect(mockExecuteAgent).toHaveBeenCalledWith(
        expect.objectContaining({ agentSlug: 'run-this' })
      )
    })

    it('should evaluate async conditions', async () => {
      const asyncConditionWorkflow: WorkflowDefinition = {
        id: 'async-condition',
        name: 'Async Condition',
        description: 'Has async condition',
        triggerEvent: 'test.async',
        steps: [
          {
            agentSlug: 'conditional-agent',
            condition: async () => {
              await Promise.resolve()
              return true
            },
          },
        ],
        onError: 'continue',
      }
      registerWorkflow(asyncConditionWorkflow)

      const insertChain = createChainableMock({
        data: { id: 'wf-123', status: 'pending' },
        error: null,
      })
      const updateChain = createChainableMock({ data: null, error: null })

      mockSupabase.from.mockImplementation(() => {
        const chain = createChainableMock({
          data: { id: 'wf-123', status: 'pending' },
          error: null,
        })
        chain.update = vi.fn().mockReturnValue(updateChain)
        return chain
      })

      mockExecuteAgent.mockResolvedValue({ success: true, output: {} })

      await executeWorkflow('async-condition', { event: 'test.async' })

      expect(mockExecuteAgent).toHaveBeenCalledTimes(1)
    })
  })

  describe('Input Mapping', () => {
    it('should use inputMapper to transform context', async () => {
      const mappedWorkflow: WorkflowDefinition = {
        id: 'mapped-workflow',
        name: 'Mapped Workflow',
        description: 'Uses input mapper',
        triggerEvent: 'test.mapped',
        steps: [
          {
            agentSlug: 'mapped-agent',
            inputMapper: (ctx) => ({
              transformedData: ctx.sharedContext.originalData,
              workflowId: ctx.workflowId,
            }),
          },
        ],
        onError: 'continue',
      }
      registerWorkflow(mappedWorkflow)

      const insertChain = createChainableMock({
        data: { id: 'wf-123', status: 'pending' },
        error: null,
      })
      const updateChain = createChainableMock({ data: null, error: null })

      mockSupabase.from.mockImplementation(() => {
        const chain = createChainableMock({
          data: { id: 'wf-123', status: 'pending' },
          error: null,
        })
        chain.update = vi.fn().mockReturnValue(updateChain)
        return chain
      })

      mockExecuteAgent.mockResolvedValue({ success: true, output: {} })

      const trigger: WorkflowTrigger = {
        event: 'test.mapped',
        data: { originalData: 'test-value' },
      }

      await executeWorkflow('mapped-workflow', trigger)

      expect(mockExecuteAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            transformedData: 'test-value',
            workflowId: 'wf-123',
          }),
        })
      )
    })
  })

  describe('Parallel Execution', () => {
    it('should execute steps with same parallel ID together', async () => {
      const parallelWorkflow: WorkflowDefinition = {
        id: 'parallel-workflow',
        name: 'Parallel Workflow',
        description: 'Has parallel steps',
        triggerEvent: 'test.parallel',
        steps: [
          { agentSlug: 'sequential-1', required: true },
          { agentSlug: 'parallel-a', parallel: 'group1' },
          { agentSlug: 'parallel-b', parallel: 'group1' },
          { agentSlug: 'sequential-2', required: true },
        ],
        onError: 'continue',
      }
      registerWorkflow(parallelWorkflow)

      const insertChain = createChainableMock({
        data: { id: 'wf-123', status: 'pending' },
        error: null,
      })
      const updateChain = createChainableMock({ data: null, error: null })

      mockSupabase.from.mockImplementation(() => {
        const chain = createChainableMock({
          data: { id: 'wf-123', status: 'pending' },
          error: null,
        })
        chain.update = vi.fn().mockReturnValue(updateChain)
        return chain
      })

      mockExecuteAgent.mockResolvedValue({ success: true, output: {} })

      await executeWorkflow('parallel-workflow', { event: 'test.parallel' })

      expect(mockExecuteAgent).toHaveBeenCalledTimes(4)
    })
  })

  describe('Workflow Result', () => {
    it('should return completed status on success', async () => {
      const insertChain = createChainableMock({
        data: { id: 'wf-123', status: 'pending' },
        error: null,
      })
      const updateChain = createChainableMock({ data: null, error: null })

      mockSupabase.from.mockImplementation(() => {
        const chain = createChainableMock({
          data: { id: 'wf-123', status: 'pending' },
          error: null,
        })
        chain.update = vi.fn().mockReturnValue(updateChain)
        return chain
      })

      mockExecuteAgent.mockResolvedValue({
        success: true,
        output: { data: 'test' },
      })

      const result = await executeWorkflow('simple-workflow', {
        event: 'listing.created',
      })

      expect(result.workflowId).toBe('wf-123')
      expect(result.status).toBe('completed')
      expect(result.completedSteps).toBeGreaterThan(0)
      expect(result.totalSteps).toBe(1)
      expect(result.startedAt).toBeDefined()
      expect(result.completedAt).toBeDefined()
    })

    it('should include step results in output', async () => {
      const insertChain = createChainableMock({
        data: { id: 'wf-123', status: 'pending' },
        error: null,
      })
      const updateChain = createChainableMock({ data: null, error: null })

      mockSupabase.from.mockImplementation(() => {
        const chain = createChainableMock({
          data: { id: 'wf-123', status: 'pending' },
          error: null,
        })
        chain.update = vi.fn().mockReturnValue(updateChain)
        return chain
      })

      mockExecuteAgent.mockResolvedValue({
        success: true,
        output: { generated: 'content' },
      })

      const result = await executeWorkflow('simple-workflow', {
        event: 'listing.created',
      })

      expect(result.stepResults).toBeDefined()
      expect(result.stepResults['content-writer']).toBeDefined()
      expect(result.stepResults['content-writer'].success).toBe(true)
    })
  })
})

describe('getWorkflowExecution', () => {
  it('should return workflow execution by ID', async () => {
    const chain = createChainableMock({
      data: {
        id: 'wf-123',
        name: 'Test Workflow',
        status: 'completed',
      },
      error: null,
    })
    mockSupabase.from.mockReturnValue(chain)

    const result = await getWorkflowExecution('wf-123')

    expect(chain.eq).toHaveBeenCalledWith('id', 'wf-123')
    expect(result?.id).toBe('wf-123')
  })

  it('should return null if execution not found', async () => {
    const chain = createChainableMock({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' },
    })
    mockSupabase.from.mockReturnValue(chain)

    const result = await getWorkflowExecution('nonexistent')

    expect(result).toBeNull()
  })
})

describe('pauseWorkflow', () => {
  it('should pause a running workflow', async () => {
    const updateChain = {
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: null }),
      }),
    }

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue(updateChain),
    })

    await expect(pauseWorkflow('wf-123')).resolves.toBeUndefined()

    expect(updateChain.eq).toHaveBeenCalledWith('id', 'wf-123')
  })

  it('should throw error if pause fails', async () => {
    const updateChain = {
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: { message: 'Error' } }),
      }),
    }

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue(updateChain),
    })

    await expect(pauseWorkflow('wf-123')).rejects.toThrow(
      'Failed to pause workflow'
    )
  })
})

describe('resumeWorkflow', () => {
  const resumableWorkflow: WorkflowDefinition = {
    id: 'resumable',
    name: 'resumable',
    description: 'Can be resumed',
    triggerEvent: 'test.resume',
    steps: [{ agentSlug: 'resume-agent', required: true }],
    onError: 'continue',
  }

  beforeEach(() => {
    registerWorkflow(resumableWorkflow)
  })

  it('should throw error if workflow not found', async () => {
    const chain = createChainableMock({
      data: null,
      error: { code: 'PGRST116' },
    })
    mockSupabase.from.mockReturnValue(chain)

    await expect(resumeWorkflow('nonexistent')).rejects.toThrow(
      'Workflow execution not found'
    )
  })

  it('should throw error if workflow is not paused', async () => {
    const chain = createChainableMock({
      data: { id: 'wf-123', status: 'running', name: 'resumable' },
      error: null,
    })
    mockSupabase.from.mockReturnValue(chain)

    await expect(resumeWorkflow('wf-123')).rejects.toThrow(
      'Cannot resume workflow in running status'
    )
  })

  it('should resume paused workflow', async () => {
    // First call returns paused execution
    const selectChain = createChainableMock({
      data: {
        id: 'wf-123',
        status: 'paused',
        name: 'resumable',
        trigger_event: 'test.resume',
        listing_id: null,
        campaign_id: null,
        context: {},
      },
      error: null,
    })

    // Second call creates new execution
    const insertChain = createChainableMock({
      data: { id: 'wf-456', status: 'pending' },
      error: null,
    })
    const updateChain = createChainableMock({ data: null, error: null })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return selectChain
      }
      const chain = createChainableMock({
        data: { id: 'wf-456', status: 'pending' },
        error: null,
      })
      chain.update = vi.fn().mockReturnValue(updateChain)
      return chain
    })

    mockExecuteAgent.mockResolvedValue({ success: true, output: {} })

    const result = await resumeWorkflow('wf-123')

    expect(result.status).toBe('completed')
  })
})

describe('getWorkflowsForResource', () => {
  it('should get workflows by listing ID', async () => {
    const chain = createChainableMock({
      data: [
        { id: 'wf-1', listing_id: 'listing-123' },
        { id: 'wf-2', listing_id: 'listing-123' },
      ],
      error: null,
    })
    // Remove .single() behavior for array result
    delete (chain as any).single
    chain.order = vi.fn().mockResolvedValue({
      data: [
        { id: 'wf-1', listing_id: 'listing-123' },
        { id: 'wf-2', listing_id: 'listing-123' },
      ],
      error: null,
    })
    mockSupabase.from.mockReturnValue(chain)

    const result = await getWorkflowsForResource('listing', 'listing-123')

    expect(chain.eq).toHaveBeenCalledWith('listing_id', 'listing-123')
    expect(result.length).toBe(2)
  })

  it('should get workflows by campaign ID', async () => {
    const chain = createChainableMock({
      data: [{ id: 'wf-1', campaign_id: 'campaign-456' }],
      error: null,
    })
    delete (chain as any).single
    chain.order = vi.fn().mockResolvedValue({
      data: [{ id: 'wf-1', campaign_id: 'campaign-456' }],
      error: null,
    })
    mockSupabase.from.mockReturnValue(chain)

    const result = await getWorkflowsForResource('campaign', 'campaign-456')

    expect(chain.eq).toHaveBeenCalledWith('campaign_id', 'campaign-456')
    expect(result.length).toBe(1)
  })

  it('should return empty array on error', async () => {
    const chain = createChainableMock({
      data: null,
      error: { message: 'Database error' },
    })
    delete (chain as any).single
    chain.order = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })
    mockSupabase.from.mockReturnValue(chain)

    const result = await getWorkflowsForResource('listing', 'listing-123')

    expect(result).toEqual([])
  })
})

describe('onComplete Callbacks', () => {
  it('should call onComplete callback after step execution', async () => {
    const onCompleteMock = vi.fn()

    const callbackWorkflow: WorkflowDefinition = {
      id: 'callback-workflow',
      name: 'Callback Workflow',
      description: 'Has onComplete callbacks',
      triggerEvent: 'test.callback',
      steps: [
        {
          agentSlug: 'callback-agent',
          onComplete: onCompleteMock,
        },
      ],
      onError: 'continue',
    }
    registerWorkflow(callbackWorkflow)

    const insertChain = createChainableMock({
      data: { id: 'wf-123', status: 'pending' },
      error: null,
    })
    const updateChain = createChainableMock({ data: null, error: null })

    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock({
        data: { id: 'wf-123', status: 'pending' },
        error: null,
      })
      chain.update = vi.fn().mockReturnValue(updateChain)
      return chain
    })

    mockExecuteAgent.mockResolvedValue({
      success: true,
      output: { result: 'data' },
    })

    await executeWorkflow('callback-workflow', { event: 'test.callback' })

    expect(onCompleteMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, output: { result: 'data' } }),
      expect.objectContaining({ workflowId: 'wf-123' })
    )
  })

  it('should continue workflow even if onComplete throws', async () => {
    const errorCallback = vi.fn().mockImplementation(() => {
      throw new Error('Callback error')
    })

    const errorCallbackWorkflow: WorkflowDefinition = {
      id: 'error-callback',
      name: 'Error Callback',
      description: 'Callback throws error',
      triggerEvent: 'test.error-callback',
      steps: [
        { agentSlug: 'agent-1', onComplete: errorCallback },
        { agentSlug: 'agent-2' },
      ],
      onError: 'continue',
    }
    registerWorkflow(errorCallbackWorkflow)

    const insertChain = createChainableMock({
      data: { id: 'wf-123', status: 'pending' },
      error: null,
    })
    const updateChain = createChainableMock({ data: null, error: null })

    mockSupabase.from.mockImplementation(() => {
      const chain = createChainableMock({
        data: { id: 'wf-123', status: 'pending' },
        error: null,
      })
      chain.update = vi.fn().mockReturnValue(updateChain)
      return chain
    })

    mockExecuteAgent.mockResolvedValue({ success: true, output: {} })

    const result = await executeWorkflow('error-callback', {
      event: 'test.error-callback',
    })

    // Should still complete despite callback error
    expect(result.status).toBe('completed')
    expect(mockExecuteAgent).toHaveBeenCalledTimes(2)
  })
})
