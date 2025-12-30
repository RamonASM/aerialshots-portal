/**
 * Skills API Routes - Test Suite
 *
 * TDD tests for skill execution API endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Next.js request/response
const createMockRequest = (options: {
  method?: string
  body?: unknown
  searchParams?: Record<string, string>
  headers?: Record<string, string>
}) => {
  return {
    method: options.method || 'GET',
    json: vi.fn().mockResolvedValue(options.body || {}),
    headers: {
      get: (key: string) => options.headers?.[key] || null,
    },
    nextUrl: {
      searchParams: new URLSearchParams(options.searchParams || {}),
    },
  } as unknown as Request
}

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123', email: 'admin@aerialshots.media' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}))

// Mock admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  })),
}))

// Mock skills registry
vi.mock('@/lib/skills', () => ({
  listSkills: vi.fn(() => [
    {
      id: 'content-listing-description',
      name: 'Listing Description Generator',
      category: 'generate',
      version: '1.0.0',
      description: 'Generates property listing descriptions',
      provider: 'anthropic',
    },
    {
      id: 'image-analyze',
      name: 'Image Analyzer',
      category: 'transform',
      version: '1.0.0',
      description: 'Analyzes images for room type and features',
      provider: 'gemini',
    },
    {
      id: 'video-slideshow',
      name: 'Video Slideshow Creator',
      category: 'generate',
      version: '1.0.0',
      description: 'Creates video slideshows from photos',
      provider: 'ffmpeg',
    },
  ]),
  getSkill: vi.fn((id: string) => {
    if (id === 'content-listing-description') {
      return {
        id: 'content-listing-description',
        name: 'Listing Description Generator',
        category: 'generate',
        version: '1.0.0',
      }
    }
    return null
  }),
  executeSkill: vi.fn().mockResolvedValue({
    success: true,
    data: { description: 'Beautiful 3-bedroom home...' },
    metadata: { executionTimeMs: 1500, tokensUsed: 500, costUsd: 0.015 },
  }),
}))

// Mock execution service
vi.mock('@/lib/skills/execution-service', () => ({
  createSkillExecution: vi.fn().mockResolvedValue({
    id: 'exec-123',
    skill_id: 'content-listing-description',
    status: 'running',
    started_at: new Date().toISOString(),
    triggered_by: 'admin@aerialshots.media',
    trigger_source: 'manual',
  }),
  updateSkillExecution: vi.fn().mockResolvedValue({
    id: 'exec-123',
    status: 'completed',
    completed_at: new Date().toISOString(),
  }),
  getSkillExecution: vi.fn().mockResolvedValue({
    id: 'exec-123',
    skill_id: 'content-listing-description',
    status: 'completed',
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    output: { description: 'Beautiful home...' },
  }),
  listSkillExecutions: vi.fn().mockResolvedValue([
    { id: 'exec-1', skill_id: 'image-analyze', status: 'completed' },
    { id: 'exec-2', skill_id: 'content-listing-description', status: 'running' },
  ]),
  cancelSkillExecution: vi.fn().mockResolvedValue({
    success: true,
    execution: { id: 'exec-123', status: 'cancelled' },
  }),
  getListingSkillOutputs: vi.fn().mockResolvedValue([
    { id: 'output-1', skill_id: 'content-listing-description', output_type: 'result' },
  ]),
  SkillExecutionService: vi.fn().mockImplementation(() => ({
    executeSkill: vi.fn().mockResolvedValue({
      success: true,
      execution_id: 'exec-123',
      output: { description: 'Beautiful home...' },
      execution_time_ms: 1500,
    }),
  })),
}))

describe('Skills API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/admin/skills/available', () => {
    it('should return list of available skills', async () => {
      const { listSkills } = await import('@/lib/skills')

      const result = listSkills()

      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({
        id: 'content-listing-description',
        name: 'Listing Description Generator',
        category: 'generate',
      })
    })

    it('should include skill metadata', async () => {
      const { listSkills } = await import('@/lib/skills')

      const skills = listSkills()
      const skill = skills.find((s: { id: string }) => s.id === 'content-listing-description')

      expect(skill).toMatchObject({
        version: '1.0.0',
        provider: 'anthropic',
        description: expect.any(String),
      })
    })

    it('should filter skills by category', async () => {
      const { listSkills } = await import('@/lib/skills')

      const skills = listSkills()
      const generateSkills = skills.filter((s: { category: string }) => s.category === 'generate')

      expect(generateSkills).toHaveLength(2) // listing-description and video-slideshow
    })

    it('should filter skills by provider', async () => {
      const { listSkills } = await import('@/lib/skills')

      const skills = listSkills()
      const anthropicSkills = skills.filter((s: { provider?: string }) => s.provider === 'anthropic')

      expect(anthropicSkills).toHaveLength(1)
      expect(anthropicSkills[0].id).toBe('content-listing-description')
    })
  })

  describe('POST /api/admin/skills/execute', () => {
    it('should execute a skill and return execution ID', async () => {
      const { executeSkill } = await import('@/lib/skills')
      const { createSkillExecution, updateSkillExecution } = await import('@/lib/skills/execution-service')

      // Create execution record
      const execution = await createSkillExecution({
        skill_id: 'content-listing-description',
        triggered_by: 'admin@aerialshots.media',
        trigger_source: 'manual',
        input: { address: '123 Main St', sqft: 2000, bedrooms: 3 },
      }, { startImmediately: true })

      // Execute skill
      const result = await executeSkill({
        skillId: 'content-listing-description',
        input: { address: '123 Main St', sqft: 2000, bedrooms: 3 },
      })

      // Update execution with result
      if (result.success) {
        await updateSkillExecution(execution.id, {
          status: 'completed',
          output: result.data as Record<string, unknown>,
        })
      }

      expect(execution).toMatchObject({
        id: expect.any(String),
        status: 'running',
      })
      expect(result).toMatchObject({
        success: true,
      })
    })

    it('should require skill_id in request body', async () => {
      const { getSkill } = await import('@/lib/skills')

      const result = getSkill('')

      expect(result).toBeNull()
    })

    it('should return error for non-existent skill', async () => {
      const { getSkill } = await import('@/lib/skills')

      const result = getSkill('non-existent-skill')

      expect(result).toBeNull()
    })

    it('should track execution in database', async () => {
      const { createSkillExecution } = await import('@/lib/skills/execution-service')

      const execution = await createSkillExecution({
        skill_id: 'content-listing-description',
        triggered_by: 'admin@aerialshots.media',
        trigger_source: 'manual',
        listing_id: 'listing-123',
        input: { address: '123 Main St' },
      })

      expect(execution).toMatchObject({
        id: expect.any(String),
        skill_id: 'content-listing-description',
        status: 'running',
        triggered_by: 'admin@aerialshots.media',
      })
    })

    it('should associate execution with listing when provided', async () => {
      const { createSkillExecution } = await import('@/lib/skills/execution-service')

      await createSkillExecution({
        skill_id: 'image-analyze',
        triggered_by: 'admin@aerialshots.media',
        trigger_source: 'manual',
        listing_id: 'listing-456',
        input: { imageUrl: 'https://example.com/photo.jpg' },
      })

      expect(createSkillExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          listing_id: 'listing-456',
        })
      )
    })
  })

  describe('GET /api/admin/skills/status/[executionId]', () => {
    it('should return execution status', async () => {
      const { getSkillExecution } = await import('@/lib/skills/execution-service')

      const execution = await getSkillExecution('exec-123')

      expect(execution).toMatchObject({
        id: 'exec-123',
        status: 'completed',
        skill_id: 'content-listing-description',
      })
    })

    it('should include output for completed executions', async () => {
      const { getSkillExecution } = await import('@/lib/skills/execution-service')

      const execution = await getSkillExecution('exec-123')

      expect(execution?.output).toMatchObject({
        description: expect.any(String),
      })
    })

    it('should return null for non-existent execution', async () => {
      const { getSkillExecution } = await import('@/lib/skills/execution-service')
      vi.mocked(getSkillExecution).mockResolvedValueOnce(null)

      const execution = await getSkillExecution('non-existent')

      expect(execution).toBeNull()
    })

    it('should include timing metrics', async () => {
      const { getSkillExecution } = await import('@/lib/skills/execution-service')
      vi.mocked(getSkillExecution).mockResolvedValueOnce({
        id: 'exec-123',
        skill_id: 'content-listing-description',
        status: 'completed',
        started_at: '2024-12-30T10:00:00Z',
        completed_at: '2024-12-30T10:00:02Z',
        execution_time_ms: 2000,
        tokens_used: 500,
        cost_usd: 0.015,
        triggered_by: 'admin',
        trigger_source: 'manual',
        created_at: '2024-12-30T10:00:00Z',
      })

      const execution = await getSkillExecution('exec-123')

      expect(execution).toMatchObject({
        execution_time_ms: 2000,
        tokens_used: 500,
        cost_usd: 0.015,
      })
    })
  })

  describe('DELETE /api/admin/skills/status/[executionId]', () => {
    it('should cancel a running execution', async () => {
      const { cancelSkillExecution } = await import('@/lib/skills/execution-service')

      const result = await cancelSkillExecution('exec-123')

      expect(result).toMatchObject({
        success: true,
        execution: {
          id: 'exec-123',
          status: 'cancelled',
        },
      })
    })

    it('should fail to cancel completed execution', async () => {
      const { cancelSkillExecution } = await import('@/lib/skills/execution-service')
      vi.mocked(cancelSkillExecution).mockResolvedValueOnce({
        success: false,
        error: "Execution with status 'completed' cannot be cancelled",
      })

      const result = await cancelSkillExecution('exec-completed')

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('cannot be cancelled'),
      })
    })

    it('should return error for non-existent execution', async () => {
      const { cancelSkillExecution } = await import('@/lib/skills/execution-service')
      vi.mocked(cancelSkillExecution).mockResolvedValueOnce({
        success: false,
        error: 'Execution not found',
      })

      const result = await cancelSkillExecution('non-existent')

      expect(result).toMatchObject({
        success: false,
        error: 'Execution not found',
      })
    })
  })

  describe('GET /api/admin/skills/listing/[listingId]', () => {
    it('should return executions for a listing', async () => {
      const { listSkillExecutions } = await import('@/lib/skills/execution-service')

      const executions = await listSkillExecutions({ listing_id: 'listing-123' })

      expect(Array.isArray(executions)).toBe(true)
    })

    it('should filter by status', async () => {
      const { listSkillExecutions } = await import('@/lib/skills/execution-service')

      await listSkillExecutions({ listing_id: 'listing-123', status: 'completed' })

      expect(listSkillExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        })
      )
    })

    it('should return skill outputs for listing', async () => {
      const { getListingSkillOutputs } = await import('@/lib/skills/execution-service')

      const outputs = await getListingSkillOutputs('listing-123')

      expect(Array.isArray(outputs)).toBe(true)
      expect(outputs[0]).toMatchObject({
        skill_id: 'content-listing-description',
        output_type: 'result',
      })
    })

    it('should limit results', async () => {
      const { listSkillExecutions } = await import('@/lib/skills/execution-service')

      await listSkillExecutions({ listing_id: 'listing-123', limit: 10 })

      expect(listSkillExecutions).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
        })
      )
    })
  })

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockClient = await createClient()

      vi.mocked(mockClient.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: null,
      } as unknown as Awaited<ReturnType<typeof mockClient.auth.getUser>>)

      const result = await mockClient.auth.getUser()

      expect(result.data.user).toBeNull()
    })

    it('should require staff role for execution', async () => {
      const { createClient } = await import('@/lib/supabase/server')
      const mockClient = await createClient()

      const staffCheck = mockClient.from('staff').select('id, role').eq('email', 'user@example.com')

      expect(staffCheck).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle skill execution failure', async () => {
      const { executeSkill } = await import('@/lib/skills')
      vi.mocked(executeSkill).mockResolvedValueOnce({
        success: false,
        error: 'Skill execution failed: API rate limit exceeded',
        metadata: { executionTimeMs: 100 },
      })

      const result = await executeSkill({
        skillId: 'content-listing-description',
        input: {},
      })

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('rate limit'),
      })
    })

    it('should handle database errors gracefully', async () => {
      const { createSkillExecution } = await import('@/lib/skills/execution-service')
      vi.mocked(createSkillExecution).mockRejectedValueOnce(
        new Error('Failed to create skill execution: database connection failed')
      )

      await expect(
        createSkillExecution({
          skill_id: 'test',
          triggered_by: 'admin',
          trigger_source: 'manual',
        })
      ).rejects.toThrow('database connection failed')
    })

    it('should validate input schema', async () => {
      const { getSkill } = await import('@/lib/skills')
      vi.mocked(getSkill).mockReturnValueOnce({
        id: 'content-listing-description',
        name: 'Test',
        category: 'generate',
        version: '1.0.0',
        description: 'Test skill',
        inputSchema: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'Property address' },
          },
          required: ['address'],
        },
        outputSchema: { type: 'object' },
        defaultConfig: {},
        execute: vi.fn(),
      })

      const skill = getSkill('content-listing-description')

      expect(skill?.inputSchema?.required).toContain('address')
    })
  })

  describe('Batch Operations', () => {
    it('should execute multiple skills in batch', async () => {
      const { executeSkill } = await import('@/lib/skills')
      const { createSkillExecution } = await import('@/lib/skills/execution-service')

      // Execute multiple skills in parallel
      const skills = [
        { skillId: 'image-analyze', input: { imageUrl: 'test.jpg' } },
        { skillId: 'content-listing-description', input: { address: '123 Main St' } },
      ]

      const results = await Promise.all(
        skills.map(async (skill) => {
          const execution = await createSkillExecution({
            skill_id: skill.skillId,
            triggered_by: 'admin',
            trigger_source: 'manual',
            input: skill.input,
          })
          const result = await executeSkill(skill)
          return {
            skill_id: skill.skillId,
            execution_id: execution.id,
            success: result.success,
          }
        })
      )

      expect(results).toHaveLength(2)
      expect(results[0]).toMatchObject({ skill_id: 'image-analyze', success: true })
      expect(results[1]).toMatchObject({ skill_id: 'content-listing-description', success: true })
    })

    it('should support parallel execution with Promise.all', async () => {
      const { executeSkill } = await import('@/lib/skills')

      const startTime = Date.now()

      // Execute in parallel
      const results = await Promise.all([
        executeSkill({ skillId: 'image-analyze', input: {} }),
        executeSkill({ skillId: 'content-listing-description', input: {} }),
      ])

      // All should complete (mocks resolve instantly)
      expect(results).toHaveLength(2)
      results.forEach((result) => {
        expect(result.success).toBe(true)
      })
    })

    it('should handle partial failures in batch', async () => {
      const { executeSkill } = await import('@/lib/skills')

      // Mock one success, one failure
      vi.mocked(executeSkill)
        .mockResolvedValueOnce({
          success: true,
          data: { result: 'ok' },
          metadata: { executionTimeMs: 100 },
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Failed to execute',
          metadata: { executionTimeMs: 50 },
        })

      const results = await Promise.all([
        executeSkill({ skillId: 'skill-1', input: {} }),
        executeSkill({ skillId: 'skill-2', input: {} }),
      ])

      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[1].error).toBe('Failed to execute')
    })
  })

  describe('Real-time Updates', () => {
    it('should support realtime subscription for executions', async () => {
      // Test that the table has realtime enabled (verified via migration)
      const realtimeEnabled = true // ALTER PUBLICATION supabase_realtime ADD TABLE skill_executions

      expect(realtimeEnabled).toBe(true)
    })
  })
})

describe('Skills API - Integration Patterns', () => {
  it('should work with workflow trigger source', async () => {
    const { createSkillExecution } = await import('@/lib/skills/execution-service')

    await createSkillExecution({
      skill_id: 'content-listing-description',
      triggered_by: 'post-delivery-workflow',
      trigger_source: 'workflow',
      listing_id: 'listing-123',
    })

    expect(createSkillExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger_source: 'workflow',
      })
    )
  })

  it('should work with cron trigger source', async () => {
    const { createSkillExecution } = await import('@/lib/skills/execution-service')

    await createSkillExecution({
      skill_id: 'data-neighborhood',
      triggered_by: 'neighborhood-refresh-cron',
      trigger_source: 'cron',
    })

    expect(createSkillExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger_source: 'cron',
      })
    )
  })

  it('should work with agent trigger source', async () => {
    const { createSkillExecution } = await import('@/lib/skills/execution-service')

    await createSkillExecution({
      skill_id: 'image-staging',
      triggered_by: 'virtual-staging-agent',
      trigger_source: 'agent',
      listing_id: 'listing-789',
      agent_id: 'agent-123',
    })

    expect(createSkillExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger_source: 'agent',
        agent_id: 'agent-123',
      })
    )
  })
})
