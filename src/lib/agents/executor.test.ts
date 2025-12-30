/**
 * Agent Executor Tests
 *
 * TDD tests for agent execution, logging, cancellation, and retry
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  executeAgent,
  getExecution,
  cancelExecution,
  retryExecution,
} from './executor'
import type { ExecuteAgentRequest, AgentExecutionResult } from './types'

// Mock dependencies
const mockSupabase = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockSupabase,
}))

const mockGenerateWithAI = vi.fn()
vi.mock('@/lib/ai/client', () => ({
  generateWithAI: (...args: unknown[]) => mockGenerateWithAI(...args),
}))

const mockGetAgent = vi.fn()
const mockGetAgentDefinition = vi.fn()
vi.mock('./registry', () => ({
  getAgent: (...args: unknown[]) => mockGetAgent(...args),
  getAgentDefinition: (...args: unknown[]) => mockGetAgentDefinition(...args),
}))

vi.mock('@/lib/logger', () => ({
  agentLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  formatError: (error: unknown) => String(error),
}))

// Helper to create chainable mock for Supabase
function createChainableMock(finalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.from = vi.fn().mockReturnValue(chain)
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(finalResult)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// Shared base request for tests
const baseRequest: ExecuteAgentRequest = {
  agentSlug: 'test-agent',
  triggerSource: 'manual',
  input: { foo: 'bar' },
}

describe('executeAgent', () => {
  describe('Execution Record Creation', () => {
    it('should create execution record before running agent', async () => {
      const chain = createChainableMock({
        data: { id: 'exec-123', status: 'running' },
        error: null,
      })
      mockSupabase.from.mockReturnValue(chain)
      mockGetAgent.mockResolvedValue({
        slug: 'test-agent',
        is_active: true,
        system_prompt: 'Test prompt',
        config: {},
      })
      mockGetAgentDefinition.mockReturnValue(null)
      mockGenerateWithAI.mockResolvedValue({
        content: '{"result": "success"}',
        tokensUsed: 100,
      })

      await executeAgent(baseRequest)

      expect(chain.insert).toHaveBeenCalledWith({
        agent_slug: 'test-agent',
        trigger_source: 'manual',
        listing_id: undefined,
        campaign_id: undefined,
        triggered_by: undefined,
        status: 'running',
        input: { foo: 'bar' },
      })
    })

    it('should return error if execution record creation fails', async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: 'Database error', code: 'DB_ERROR' },
      })
      mockSupabase.from.mockReturnValue(chain)

      const result = await executeAgent(baseRequest)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database error')
    })

    it('should include optional fields when provided', async () => {
      const chain = createChainableMock({
        data: { id: 'exec-123', status: 'running' },
        error: null,
      })
      mockSupabase.from.mockReturnValue(chain)
      mockGetAgent.mockResolvedValue({
        slug: 'test-agent',
        is_active: true,
        system_prompt: 'Test prompt',
        config: {},
      })
      mockGetAgentDefinition.mockReturnValue(null)
      mockGenerateWithAI.mockResolvedValue({
        content: '{"result": "success"}',
        tokensUsed: 100,
      })

      await executeAgent({
        ...baseRequest,
        listingId: 'listing-456',
        campaignId: 'campaign-789',
        triggeredBy: 'user-abc',
      })

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          listing_id: 'listing-456',
          campaign_id: 'campaign-789',
          triggered_by: 'user-abc',
        })
      )
    })
  })

  describe('Agent Resolution', () => {
    it('should return error if agent not found', async () => {
      const insertChain = createChainableMock({
        data: { id: 'exec-123', status: 'running' },
        error: null,
      })
      const updateChain = createChainableMock({ data: null, error: null })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'ai_agent_executions') {
          // Return different chains based on the operation
          const chain = createChainableMock({
            data: { id: 'exec-123', status: 'running' },
            error: null,
          })
          chain.update = vi.fn().mockReturnValue(updateChain)
          return chain
        }
        return insertChain
      })

      mockGetAgent.mockResolvedValue(null)

      const result = await executeAgent(baseRequest)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should return error if agent is inactive', async () => {
      const chain = createChainableMock({
        data: { id: 'exec-123', status: 'running' },
        error: null,
      })
      mockSupabase.from.mockReturnValue(chain)
      mockGetAgent.mockResolvedValue({
        slug: 'test-agent',
        is_active: false,
        system_prompt: 'Test prompt',
        config: {},
      })

      const result = await executeAgent(baseRequest)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not active')
    })
  })

  describe('Code-defined Agent Execution', () => {
    it('should execute code-defined agent when definition exists', async () => {
      const chain = createChainableMock({
        data: { id: 'exec-123', status: 'running' },
        error: null,
      })
      mockSupabase.from.mockReturnValue(chain)
      mockGetAgent.mockResolvedValue({
        slug: 'test-agent',
        is_active: true,
        system_prompt: 'DB prompt',
        config: { maxTokens: 500 },
      })

      const mockExecute = vi.fn().mockResolvedValue({
        success: true,
        output: { generated: 'content' },
        tokensUsed: 50,
      })

      mockGetAgentDefinition.mockReturnValue({
        slug: 'test-agent',
        execute: mockExecute,
        systemPrompt: 'Definition prompt',
        config: { temperature: 0.5 },
      })

      const result = await executeAgent(baseRequest)

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: 'exec-123',
          agentSlug: 'test-agent',
          input: { foo: 'bar' },
        })
      )
      expect(result.success).toBe(true)
      expect(result.output).toEqual({ generated: 'content' })
    })

    it('should merge config from database and definition', async () => {
      const chain = createChainableMock({
        data: { id: 'exec-123', status: 'running' },
        error: null,
      })
      mockSupabase.from.mockReturnValue(chain)
      mockGetAgent.mockResolvedValue({
        slug: 'test-agent',
        is_active: true,
        system_prompt: null,
        config: { maxTokens: 500 },
      })

      const mockExecute = vi.fn().mockResolvedValue({ success: true })

      mockGetAgentDefinition.mockReturnValue({
        slug: 'test-agent',
        execute: mockExecute,
        systemPrompt: 'Definition prompt',
        config: { temperature: 0.5 },
      })

      await executeAgent(baseRequest)

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            maxTokens: 500,
            temperature: 0.5,
          }),
        })
      )
    })
  })

  describe('Prompt-based Agent Execution', () => {
    it('should execute prompt-based agent when no definition exists', async () => {
      const chain = createChainableMock({
        data: { id: 'exec-123', status: 'running' },
        error: null,
      })
      mockSupabase.from.mockReturnValue(chain)
      mockGetAgent.mockResolvedValue({
        slug: 'test-agent',
        is_active: true,
        system_prompt: 'You are a helpful assistant',
        config: { maxTokens: 1000 },
      })
      mockGetAgentDefinition.mockReturnValue(null)
      mockGenerateWithAI.mockResolvedValue({
        content: '{"response": "Hello!"}',
        tokensUsed: 50,
      })

      const result = await executeAgent(baseRequest)

      expect(mockGenerateWithAI).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('You are a helpful assistant'),
          maxTokens: 1000,
        })
      )
      expect(result.success).toBe(true)
      expect(result.output).toEqual({ response: 'Hello!' })
    })

    it('should return error if agent has no system prompt', async () => {
      const chain = createChainableMock({
        data: { id: 'exec-123', status: 'running' },
        error: null,
      })
      mockSupabase.from.mockReturnValue(chain)
      mockGetAgent.mockResolvedValue({
        slug: 'test-agent',
        is_active: true,
        system_prompt: null,
        config: {},
      })
      mockGetAgentDefinition.mockReturnValue(null)

      const result = await executeAgent(baseRequest)

      expect(result.success).toBe(false)
      expect(result.error).toContain('system prompt')
    })

    it('should handle non-JSON AI response as text', async () => {
      const chain = createChainableMock({
        data: { id: 'exec-123', status: 'running' },
        error: null,
      })
      mockSupabase.from.mockReturnValue(chain)
      mockGetAgent.mockResolvedValue({
        slug: 'test-agent',
        is_active: true,
        system_prompt: 'Generate text',
        config: {},
      })
      mockGetAgentDefinition.mockReturnValue(null)
      mockGenerateWithAI.mockResolvedValue({
        content: 'This is plain text response',
        tokensUsed: 20,
      })

      const result = await executeAgent(baseRequest)

      expect(result.success).toBe(true)
      expect(result.output).toEqual({ text: 'This is plain text response' })
    })

    it('should handle AI generation error', async () => {
      const chain = createChainableMock({
        data: { id: 'exec-123', status: 'running' },
        error: null,
      })
      mockSupabase.from.mockReturnValue(chain)
      mockGetAgent.mockResolvedValue({
        slug: 'test-agent',
        is_active: true,
        system_prompt: 'Test prompt',
        config: {},
      })
      mockGetAgentDefinition.mockReturnValue(null)
      mockGenerateWithAI.mockRejectedValue(new Error('AI service unavailable'))

      const result = await executeAgent(baseRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Execution Record Update', () => {
    it('should update execution record on success', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      const chain = createChainableMock({
        data: { id: 'exec-123', status: 'running' },
        error: null,
      })
      chain.update = updateMock
      mockSupabase.from.mockReturnValue(chain)

      mockGetAgent.mockResolvedValue({
        slug: 'test-agent',
        is_active: true,
        system_prompt: 'Test',
        config: {},
      })
      mockGetAgentDefinition.mockReturnValue({
        slug: 'test-agent',
        execute: vi.fn().mockResolvedValue({
          success: true,
          output: { result: 'done' },
          tokensUsed: 100,
        }),
      })

      await executeAgent(baseRequest)

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          output: { result: 'done' },
          tokens_used: 100,
        })
      )
    })

    it('should update execution record on failure', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      const chain = createChainableMock({
        data: { id: 'exec-123', status: 'running' },
        error: null,
      })
      chain.update = updateMock
      mockSupabase.from.mockReturnValue(chain)

      mockGetAgent.mockResolvedValue({
        slug: 'test-agent',
        is_active: true,
        system_prompt: 'Test',
        config: {},
      })
      mockGetAgentDefinition.mockReturnValue({
        slug: 'test-agent',
        execute: vi.fn().mockResolvedValue({
          success: false,
          error: 'Agent failed',
        }),
      })

      await executeAgent(baseRequest)

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error_message: 'Agent failed',
        })
      )
    })
  })
})

describe('getExecution', () => {
  it('should return execution by ID', async () => {
    const chain = createChainableMock({
      data: {
        id: 'exec-123',
        agent_slug: 'test-agent',
        status: 'completed',
      },
      error: null,
    })
    mockSupabase.from.mockReturnValue(chain)

    const result = await getExecution('exec-123')

    expect(chain.eq).toHaveBeenCalledWith('id', 'exec-123')
    expect(result.id).toBe('exec-123')
  })

  it('should throw error if execution not found', async () => {
    const chain = createChainableMock({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' },
    })
    mockSupabase.from.mockReturnValue(chain)

    await expect(getExecution('nonexistent')).rejects.toThrow('not found')
  })

  it('should throw database error for other errors', async () => {
    const chain = createChainableMock({
      data: null,
      error: { code: 'OTHER', message: 'Database error' },
    })
    mockSupabase.from.mockReturnValue(chain)

    await expect(getExecution('exec-123')).rejects.toThrow()
  })
})

describe('cancelExecution', () => {
  it('should cancel pending execution', async () => {
    // First call for getExecution
    const selectChain = createChainableMock({
      data: { id: 'exec-123', status: 'pending' },
      error: null,
    })
    // Second call for update
    const updateChain = {
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: null }),
      }),
    }

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return selectChain
      }
      return { update: vi.fn().mockReturnValue(updateChain) }
    })

    await cancelExecution('exec-123')

    expect(updateChain.eq).toHaveBeenCalledWith('id', 'exec-123')
  })

  it('should cancel running execution', async () => {
    const selectChain = createChainableMock({
      data: { id: 'exec-123', status: 'running' },
      error: null,
    })
    const updateChain = {
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: null }),
      }),
    }

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return selectChain
      }
      return { update: vi.fn().mockReturnValue(updateChain) }
    })

    await expect(cancelExecution('exec-123')).resolves.toBeUndefined()
  })

  it('should throw error for completed execution', async () => {
    const chain = createChainableMock({
      data: { id: 'exec-123', status: 'completed' },
      error: null,
    })
    mockSupabase.from.mockReturnValue(chain)

    await expect(cancelExecution('exec-123')).rejects.toThrow(
      'Cannot cancel execution in completed status'
    )
  })

  it('should throw error for failed execution', async () => {
    const chain = createChainableMock({
      data: { id: 'exec-123', status: 'failed' },
      error: null,
    })
    mockSupabase.from.mockReturnValue(chain)

    await expect(cancelExecution('exec-123')).rejects.toThrow(
      'Cannot cancel execution in failed status'
    )
  })
})

describe('retryExecution', () => {
  it('should retry failed execution', async () => {
    // First call to get the execution
    const selectChain = createChainableMock({
      data: {
        id: 'exec-123',
        agent_slug: 'test-agent',
        status: 'failed',
        trigger_source: 'manual',
        input: { foo: 'bar' },
        listing_id: null,
        campaign_id: null,
        triggered_by: null,
      },
      error: null,
    })

    // Second call to create new execution
    const insertChain = createChainableMock({
      data: { id: 'exec-456', status: 'running' },
      error: null,
    })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return selectChain
      }
      return insertChain
    })

    mockGetAgent.mockResolvedValue({
      slug: 'test-agent',
      is_active: true,
      system_prompt: 'Test',
      config: {},
    })
    mockGetAgentDefinition.mockReturnValue({
      slug: 'test-agent',
      execute: vi.fn().mockResolvedValue({ success: true }),
    })

    const result = await retryExecution('exec-123')

    expect(result.success).toBe(true)
  })

  it('should throw error for non-failed execution', async () => {
    const chain = createChainableMock({
      data: { id: 'exec-123', status: 'completed' },
      error: null,
    })
    mockSupabase.from.mockReturnValue(chain)

    await expect(retryExecution('exec-123')).rejects.toThrow(
      'Cannot retry execution in completed status'
    )
  })

  it('should throw error for pending execution', async () => {
    const chain = createChainableMock({
      data: { id: 'exec-123', status: 'pending' },
      error: null,
    })
    mockSupabase.from.mockReturnValue(chain)

    await expect(retryExecution('exec-123')).rejects.toThrow(
      'Cannot retry execution in pending status'
    )
  })

  it('should preserve original execution parameters', async () => {
    const selectChain = createChainableMock({
      data: {
        id: 'exec-123',
        agent_slug: 'test-agent',
        status: 'failed',
        trigger_source: 'webhook',
        input: { data: 'original' },
        listing_id: 'listing-789',
        campaign_id: 'campaign-abc',
        triggered_by: 'user-xyz',
      },
      error: null,
    })

    const insertChain = createChainableMock({
      data: { id: 'exec-456', status: 'running' },
      error: null,
    })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return selectChain
      }
      return insertChain
    })

    mockGetAgent.mockResolvedValue({
      slug: 'test-agent',
      is_active: true,
      system_prompt: 'Test',
      config: {},
    })
    mockGetAgentDefinition.mockReturnValue({
      slug: 'test-agent',
      execute: vi.fn().mockResolvedValue({ success: true }),
    })

    await retryExecution('exec-123')

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_slug: 'test-agent',
        trigger_source: 'webhook',
        input: { data: 'original' },
        listing_id: 'listing-789',
        campaign_id: 'campaign-abc',
        triggered_by: 'user-xyz',
      })
    )
  })
})

describe('User Prompt Building', () => {
  it('should format input data correctly in prompt', async () => {
    const chain = createChainableMock({
      data: { id: 'exec-123', status: 'running' },
      error: null,
    })
    mockSupabase.from.mockReturnValue(chain)
    mockGetAgent.mockResolvedValue({
      slug: 'test-agent',
      is_active: true,
      system_prompt: 'Process the following:',
      config: {},
    })
    mockGetAgentDefinition.mockReturnValue(null)
    mockGenerateWithAI.mockResolvedValue({
      content: '{"done": true}',
      tokensUsed: 10,
    })

    await executeAgent({
      ...baseRequest,
      input: {
        propertyAddress: '123 Main St',
        sqft: 2500,
        bedrooms: 3,
      },
    })

    expect(mockGenerateWithAI).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('property address: 123 Main St'),
      })
    )
  })

  it('should handle nested object input', async () => {
    const chain = createChainableMock({
      data: { id: 'exec-123', status: 'running' },
      error: null,
    })
    mockSupabase.from.mockReturnValue(chain)
    mockGetAgent.mockResolvedValue({
      slug: 'test-agent',
      is_active: true,
      system_prompt: 'Process:',
      config: {},
    })
    mockGetAgentDefinition.mockReturnValue(null)
    mockGenerateWithAI.mockResolvedValue({
      content: '{}',
      tokensUsed: 5,
    })

    await executeAgent({
      ...baseRequest,
      input: {
        property: {
          address: '123 Main St',
          features: ['pool', 'garage'],
        },
      },
    })

    expect(mockGenerateWithAI).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('"address": "123 Main St"'),
      })
    )
  })

  it('should skip null and undefined values', async () => {
    const chain = createChainableMock({
      data: { id: 'exec-123', status: 'running' },
      error: null,
    })
    mockSupabase.from.mockReturnValue(chain)
    mockGetAgent.mockResolvedValue({
      slug: 'test-agent',
      is_active: true,
      system_prompt: 'Test',
      config: {},
    })
    mockGetAgentDefinition.mockReturnValue(null)
    mockGenerateWithAI.mockResolvedValue({
      content: '{}',
      tokensUsed: 5,
    })

    await executeAgent({
      ...baseRequest,
      input: {
        validField: 'present',
        nullField: null,
        undefinedField: undefined,
      },
    })

    const callArg = mockGenerateWithAI.mock.calls[0][0]
    expect(callArg.prompt).toContain('valid field: present')
    expect(callArg.prompt).not.toContain('null field')
    expect(callArg.prompt).not.toContain('undefined field')
  })
})

describe('Error Handling', () => {
  it('should handle AppError with proper code', async () => {
    const chain = createChainableMock({
      data: { id: 'exec-123', status: 'running' },
      error: null,
    })
    mockSupabase.from.mockReturnValue(chain)
    mockGetAgent.mockResolvedValue({
      slug: 'test-agent',
      is_active: true,
      system_prompt: 'Test',
      config: {},
    })
    mockGetAgentDefinition.mockReturnValue({
      slug: 'test-agent',
      execute: vi.fn().mockRejectedValue({
        message: 'Custom error',
        code: 'CUSTOM_ERROR',
        status: 400,
      }),
    })

    const result = await executeAgent(baseRequest)

    expect(result.success).toBe(false)
  })

  it('should handle unknown errors gracefully', async () => {
    const chain = createChainableMock({
      data: { id: 'exec-123', status: 'running' },
      error: null,
    })
    mockSupabase.from.mockReturnValue(chain)
    mockGetAgent.mockResolvedValue({
      slug: 'test-agent',
      is_active: true,
      system_prompt: 'Test',
      config: {},
    })
    mockGetAgentDefinition.mockReturnValue({
      slug: 'test-agent',
      execute: vi.fn().mockRejectedValue('string error'),
    })

    const result = await executeAgent(baseRequest)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should continue returning result even if update fails', async () => {
    const insertChain = createChainableMock({
      data: { id: 'exec-123', status: 'running' },
      error: null,
    })
    const updateChain = {
      eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
    }
    insertChain.update = vi.fn().mockReturnValue(updateChain)
    mockSupabase.from.mockReturnValue(insertChain)

    mockGetAgent.mockResolvedValue({
      slug: 'test-agent',
      is_active: true,
      system_prompt: 'Test',
      config: {},
    })
    mockGetAgentDefinition.mockReturnValue({
      slug: 'test-agent',
      execute: vi.fn().mockResolvedValue({
        success: true,
        output: { result: 'data' },
      }),
    })

    const result = await executeAgent(baseRequest)

    // Should still return the execution result despite update failure
    expect(result.success).toBe(true)
    expect(result.output).toEqual({ result: 'data' })
  })
})
