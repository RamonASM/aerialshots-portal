/**
 * Skill Execution Service Tests
 *
 * TDD tests for skill execution tracking and management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  SkillExecutionService,
  createSkillExecution,
  updateSkillExecution,
  getSkillExecution,
  listSkillExecutions,
  getListingSkillOutputs,
  saveSkillOutput,
  cancelSkillExecution,
  retrySkillExecution,
  getSkillUsageStats,
  type SkillExecution,
  type SkillExecutionInput,
  type ListingSkillOutput,
  type SkillUsageStats,
} from './execution-service'

// Mock Supabase - the query builder returns a thenable object at the end of the chain
const mockSupabase: any = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  upsert: vi.fn(() => mockSupabase),
  delete: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  in: vi.fn(() => mockSupabase),
  gte: vi.fn(() => mockSupabase),
  lte: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
  maybeSingle: vi.fn(() => mockSupabase),
  returns: vi.fn(),
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockSupabase),
}))

describe('Skill Execution Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Create Execution', () => {
    it('should create a new skill execution', async () => {
      const input: SkillExecutionInput = {
        skill_id: 'image-analyze',
        triggered_by: 'user@example.com',
        trigger_source: 'manual',
        listing_id: 'listing-123',
        input: { imageUrl: 'https://example.com/photo.jpg' },
      }

      const mockExecution: SkillExecution = {
        id: 'exec-123',
        skill_id: 'image-analyze',
        status: 'pending',
        started_at: new Date().toISOString(),
        triggered_by: 'user@example.com',
        trigger_source: 'manual',
        listing_id: 'listing-123',
        input: { imageUrl: 'https://example.com/photo.jpg' },
        created_at: new Date().toISOString(),
      }

      mockSupabase.returns.mockResolvedValueOnce({ data: mockExecution, error: null })

      const result = await createSkillExecution(input)

      expect(result.id).toBe('exec-123')
      expect(result.status).toBe('pending')
      expect(result.skill_id).toBe('image-analyze')
    })

    it('should set status to running when execution starts', async () => {
      const input: SkillExecutionInput = {
        skill_id: 'content-generate',
        triggered_by: 'workflow:post-delivery',
        trigger_source: 'workflow',
        input: { listingId: 'listing-456' },
      }

      const mockExecution: SkillExecution = {
        id: 'exec-456',
        skill_id: 'content-generate',
        status: 'running',
        started_at: new Date().toISOString(),
        triggered_by: 'workflow:post-delivery',
        trigger_source: 'workflow',
        input: { listingId: 'listing-456' },
        created_at: new Date().toISOString(),
      }

      mockSupabase.returns.mockResolvedValueOnce({ data: mockExecution, error: null })

      const result = await createSkillExecution(input, { startImmediately: true })

      expect(result.status).toBe('running')
    })

    it('should include metadata when provided', async () => {
      const input: SkillExecutionInput = {
        skill_id: 'video-slideshow',
        triggered_by: 'agent:video-creator',
        trigger_source: 'agent',
        metadata: {
          workflow_id: 'wf-123',
          step: 3,
          parent_execution_id: 'exec-parent',
        },
      }

      mockSupabase.returns.mockResolvedValueOnce({
        data: { ...input, id: 'exec-789', status: 'pending' },
        error: null,
      })

      const result = await createSkillExecution(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: input.metadata,
        })
      )
    })
  })

  describe('Update Execution', () => {
    it('should update execution status to completed', async () => {
      const executionId = 'exec-123'
      const output = { description: 'A beautiful 3-bedroom home...' }

      mockSupabase.returns.mockResolvedValueOnce({
        data: {
          id: executionId,
          status: 'completed',
          output,
          completed_at: new Date().toISOString(),
          execution_time_ms: 1500,
        },
        error: null,
      })

      const result = await updateSkillExecution(executionId, {
        status: 'completed',
        output,
        execution_time_ms: 1500,
      })

      expect(result.status).toBe('completed')
      expect(result.output).toEqual(output)
      expect(result.completed_at).toBeDefined()
    })

    it('should update execution status to failed with error', async () => {
      const executionId = 'exec-456'
      const errorMessage = 'API rate limit exceeded'

      mockSupabase.returns.mockResolvedValueOnce({
        data: {
          id: executionId,
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        },
        error: null,
      })

      const result = await updateSkillExecution(executionId, {
        status: 'failed',
        error_message: errorMessage,
      })

      expect(result.status).toBe('failed')
      expect(result.error_message).toBe(errorMessage)
    })

    it('should track tokens and cost', async () => {
      const executionId = 'exec-789'

      mockSupabase.returns.mockResolvedValueOnce({
        data: {
          id: executionId,
          status: 'completed',
          tokens_used: 1500,
          cost_usd: 0.0045,
        },
        error: null,
      })

      const result = await updateSkillExecution(executionId, {
        status: 'completed',
        tokens_used: 1500,
        cost_usd: 0.0045,
      })

      expect(result.tokens_used).toBe(1500)
      expect(result.cost_usd).toBe(0.0045)
    })
  })

  describe('Get Execution', () => {
    it('should get execution by ID', async () => {
      const mockExecution: SkillExecution = {
        id: 'exec-123',
        skill_id: 'image-inpaint',
        status: 'completed',
        started_at: '2024-01-01T10:00:00Z',
        completed_at: '2024-01-01T10:00:05Z',
        triggered_by: 'staff@aerialshots.media',
        trigger_source: 'manual',
        input: { imageUrl: 'https://example.com/photo.jpg' },
        output: { resultUrl: 'https://example.com/result.jpg' },
        execution_time_ms: 5000,
        created_at: '2024-01-01T10:00:00Z',
      }

      mockSupabase.returns.mockResolvedValueOnce({ data: mockExecution, error: null })

      const result = await getSkillExecution('exec-123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('exec-123')
      expect(result?.status).toBe('completed')
    })

    it('should return null for non-existent execution', async () => {
      mockSupabase.returns.mockResolvedValueOnce({ data: null, error: null })

      const result = await getSkillExecution('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('List Executions', () => {
    it('should list executions for a listing', async () => {
      const mockExecutions: SkillExecution[] = [
        {
          id: 'exec-1',
          skill_id: 'image-analyze',
          status: 'completed',
          started_at: '2024-01-01T10:00:00Z',
          triggered_by: 'workflow',
          trigger_source: 'workflow',
          listing_id: 'listing-123',
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          id: 'exec-2',
          skill_id: 'content-generate',
          status: 'completed',
          started_at: '2024-01-01T10:01:00Z',
          triggered_by: 'workflow',
          trigger_source: 'workflow',
          listing_id: 'listing-123',
          created_at: '2024-01-01T10:01:00Z',
        },
      ]

      mockSupabase.returns.mockResolvedValueOnce({ data: mockExecutions, error: null })

      const result = await listSkillExecutions({ listing_id: 'listing-123' })

      expect(result).toHaveLength(2)
      expect(result[0].skill_id).toBe('image-analyze')
    })

    it('should filter by status', async () => {
      const mockExecutions: SkillExecution[] = [
        {
          id: 'exec-1',
          skill_id: 'video-slideshow',
          status: 'running',
          started_at: '2024-01-01T10:00:00Z',
          triggered_by: 'agent',
          trigger_source: 'agent',
          created_at: '2024-01-01T10:00:00Z',
        },
      ]

      mockSupabase.returns.mockResolvedValueOnce({ data: mockExecutions, error: null })

      const result = await listSkillExecutions({ status: 'running' })

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('running')
    })

    it('should filter by skill_id', async () => {
      mockSupabase.returns.mockResolvedValueOnce({ data: [], error: null })

      await listSkillExecutions({ skill_id: 'image-staging' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('skill_id', 'image-staging')
    })

    it('should limit results', async () => {
      // Mock the chain properly for limit
      mockSupabase.limit.mockReturnValueOnce(mockSupabase)
      mockSupabase.order.mockReturnValueOnce(mockSupabase)
      mockSupabase.returns.mockResolvedValueOnce({ data: [], error: null })

      await listSkillExecutions({ limit: 10 })

      expect(mockSupabase.limit).toHaveBeenCalledWith(10)
    })
  })

  describe('Listing Skill Outputs', () => {
    it('should get skill outputs for a listing', async () => {
      const mockOutputs: ListingSkillOutput[] = [
        {
          id: 'output-1',
          listing_id: 'listing-123',
          skill_id: 'content-generate',
          output_type: 'description',
          output_data: {
            professional: 'Stunning 4-bedroom home...',
            casual: 'Welcome to your new home...',
          },
          status: 'completed',
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          id: 'output-2',
          listing_id: 'listing-123',
          skill_id: 'content-generate',
          output_type: 'social_captions',
          output_data: {
            instagram: 'Just listed! 🏠',
            facebook: 'New listing alert!',
          },
          status: 'completed',
          created_at: '2024-01-01T10:01:00Z',
        },
      ]

      mockSupabase.returns.mockResolvedValueOnce({ data: mockOutputs, error: null })

      const result = await getListingSkillOutputs('listing-123')

      expect(result).toHaveLength(2)
      expect(result[0].output_type).toBe('description')
    })

    it('should filter outputs by skill_id', async () => {
      mockSupabase.returns.mockResolvedValueOnce({ data: [], error: null })

      await getListingSkillOutputs('listing-123', { skill_id: 'video-slideshow' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('skill_id', 'video-slideshow')
    })

    it('should filter outputs by output_type', async () => {
      mockSupabase.returns.mockResolvedValueOnce({ data: [], error: null })

      await getListingSkillOutputs('listing-123', { output_type: 'description' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('output_type', 'description')
    })
  })

  describe('Save Skill Output', () => {
    it('should save skill output for listing', async () => {
      const output: Omit<ListingSkillOutput, 'id' | 'created_at' | 'updated_at'> = {
        listing_id: 'listing-123',
        skill_id: 'content-generate',
        output_type: 'description',
        output_data: { text: 'Beautiful home...' },
        status: 'completed',
        execution_id: 'exec-123',
      }

      mockSupabase.returns.mockResolvedValueOnce({
        data: { ...output, id: 'output-new', created_at: new Date().toISOString() },
        error: null,
      })

      const result = await saveSkillOutput(output)

      expect(result.id).toBe('output-new')
      expect(result.output_data).toEqual(output.output_data)
    })

    it('should upsert existing output', async () => {
      const output: Omit<ListingSkillOutput, 'id' | 'created_at' | 'updated_at'> = {
        listing_id: 'listing-123',
        skill_id: 'content-generate',
        output_type: 'description',
        output_data: { text: 'Updated description...' },
        status: 'completed',
      }

      mockSupabase.returns.mockResolvedValueOnce({
        data: { ...output, id: 'output-existing', updated_at: new Date().toISOString() },
        error: null,
      })

      const result = await saveSkillOutput(output)

      expect(mockSupabase.upsert).toHaveBeenCalled()
    })

    it('should set expiration for temporary outputs', async () => {
      const output: Omit<ListingSkillOutput, 'id' | 'created_at' | 'updated_at'> = {
        listing_id: 'listing-123',
        skill_id: 'video-slideshow',
        output_type: 'preview',
        output_data: { previewUrl: 'https://example.com/preview.mp4' },
        status: 'completed',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

      mockSupabase.returns.mockResolvedValueOnce({
        data: { ...output, id: 'output-temp' },
        error: null,
      })

      const result = await saveSkillOutput(output)

      expect(result.expires_at).toBeDefined()
    })
  })

  describe('Cancel Execution', () => {
    it('should cancel pending execution', async () => {
      mockSupabase.returns.mockResolvedValueOnce({
        data: { id: 'exec-123', status: 'pending' },
        error: null,
      })
      mockSupabase.returns.mockResolvedValueOnce({
        data: { id: 'exec-123', status: 'cancelled' },
        error: null,
      })

      const result = await cancelSkillExecution('exec-123')

      expect(result.success).toBe(true)
      expect(result.execution?.status).toBe('cancelled')
    })

    it('should cancel running execution', async () => {
      mockSupabase.returns.mockResolvedValueOnce({
        data: { id: 'exec-456', status: 'running' },
        error: null,
      })
      mockSupabase.returns.mockResolvedValueOnce({
        data: { id: 'exec-456', status: 'cancelled' },
        error: null,
      })

      const result = await cancelSkillExecution('exec-456')

      expect(result.success).toBe(true)
    })

    it('should not cancel completed execution', async () => {
      mockSupabase.returns.mockResolvedValueOnce({
        data: { id: 'exec-789', status: 'completed' },
        error: null,
      })

      const result = await cancelSkillExecution('exec-789')

      expect(result.success).toBe(false)
      expect(result.error).toContain('cannot be cancelled')
    })

    it('should return error for non-existent execution', async () => {
      mockSupabase.returns.mockResolvedValueOnce({ data: null, error: null })

      const result = await cancelSkillExecution('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('Retry Execution', () => {
    it('should retry failed execution', async () => {
      const originalExecution: SkillExecution = {
        id: 'exec-original',
        skill_id: 'image-staging',
        status: 'failed',
        started_at: '2024-01-01T10:00:00Z',
        triggered_by: 'user@example.com',
        trigger_source: 'manual',
        input: { imageUrl: 'https://example.com/photo.jpg' },
        error_message: 'API timeout',
        created_at: '2024-01-01T10:00:00Z',
      }

      mockSupabase.returns.mockResolvedValueOnce({ data: originalExecution, error: null })
      mockSupabase.returns.mockResolvedValueOnce({
        data: {
          id: 'exec-retry',
          skill_id: 'image-staging',
          status: 'pending',
          input: originalExecution.input,
          metadata: { retry_of: 'exec-original', retry_count: 1 },
        },
        error: null,
      })

      const result = await retrySkillExecution('exec-original')

      expect(result.success).toBe(true)
      expect(result.execution?.id).toBe('exec-retry')
      expect(result.execution?.metadata?.retry_of).toBe('exec-original')
    })

    it('should not retry completed execution', async () => {
      mockSupabase.returns.mockResolvedValueOnce({
        data: { id: 'exec-completed', status: 'completed' },
        error: null,
      })

      const result = await retrySkillExecution('exec-completed')

      expect(result.success).toBe(false)
      expect(result.error).toContain('cannot be retried')
    })

    it('should increment retry count', async () => {
      const originalExecution: SkillExecution = {
        id: 'exec-retry-1',
        skill_id: 'content-generate',
        status: 'failed',
        started_at: '2024-01-01T10:00:00Z',
        triggered_by: 'workflow',
        trigger_source: 'workflow',
        input: {},
        metadata: { retry_of: 'exec-original', retry_count: 1 },
        created_at: '2024-01-01T10:00:00Z',
      }

      mockSupabase.returns.mockResolvedValueOnce({ data: originalExecution, error: null })
      mockSupabase.returns.mockResolvedValueOnce({
        data: {
          id: 'exec-retry-2',
          metadata: { retry_of: 'exec-original', retry_count: 2 },
        },
        error: null,
      })

      const result = await retrySkillExecution('exec-retry-1')

      expect(result.execution?.metadata?.retry_count).toBe(2)
    })
  })

  describe('Usage Stats', () => {
    it('should get usage stats for agent', async () => {
      // Mock returns raw usage records that get aggregated
      const mockUsageRecords = [
        {
          skill_id: 'content-generate',
          executions_count: 100,
          tokens_used: 200000,
          cost_usd: '0.60',
        },
        {
          skill_id: 'image-analyze',
          executions_count: 50,
          tokens_used: 50000,
          cost_usd: '0.15',
        },
      ]

      mockSupabase.returns.mockResolvedValueOnce({ data: mockUsageRecords, error: null })

      const result = await getSkillUsageStats('agent-123', {
        period_start: '2024-01-01',
        period_end: '2024-01-31',
      })

      expect(result.total_executions).toBe(150)
      expect(result.total_cost).toBe(0.75)
      expect(result.by_skill['content-generate'].executions).toBe(100)
    })

    it('should default to current month', async () => {
      const mockUsageRecords = [
        {
          skill_id: 'content-generate',
          executions_count: 50,
          tokens_used: 100000,
          cost_usd: '0.30',
        },
      ]

      mockSupabase.returns.mockResolvedValueOnce({ data: mockUsageRecords, error: null })

      const result = await getSkillUsageStats('agent-123')

      expect(result).toBeDefined()
      expect(result.total_executions).toBe(50)
    })
  })

  describe('SkillExecutionService Class', () => {
    it('should initialize service', () => {
      const service = new SkillExecutionService()

      expect(service).toBeDefined()
    })

    it('should execute skill and track execution', async () => {
      const service = new SkillExecutionService()

      // Mock the skill registry
      vi.spyOn(service, 'executeSkill').mockResolvedValueOnce({
        success: true,
        execution_id: 'exec-123',
        output: { result: 'test' },
        execution_time_ms: 1000,
      })

      const result = await service.executeSkill('image-analyze', {
        imageUrl: 'https://example.com/photo.jpg',
      }, {
        listing_id: 'listing-123',
        triggered_by: 'test',
      })

      expect(result.success).toBe(true)
      expect(result.execution_id).toBeDefined()
    })

    it('should handle skill execution failure', async () => {
      const service = new SkillExecutionService()

      vi.spyOn(service, 'executeSkill').mockResolvedValueOnce({
        success: false,
        execution_id: 'exec-456',
        error: 'Skill execution failed',
      })

      const result = await service.executeSkill('failing-skill', {}, {
        triggered_by: 'test',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should batch execute multiple skills', async () => {
      const service = new SkillExecutionService()

      vi.spyOn(service, 'batchExecute').mockResolvedValueOnce({
        success: true,
        results: [
          { skill_id: 'skill-1', success: true, execution_id: 'exec-1' },
          { skill_id: 'skill-2', success: true, execution_id: 'exec-2' },
        ],
      })

      const result = await service.batchExecute([
        { skill_id: 'skill-1', input: {} },
        { skill_id: 'skill-2', input: {} },
      ], { triggered_by: 'test' })

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(2)
    })
  })
})
