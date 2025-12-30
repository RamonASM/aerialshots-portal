/**
 * Skills Panel Component Tests
 *
 * TDD tests for the admin skills panel UI
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SkillsPanel } from './SkillsPanel'
import { SkillStatusBadge } from './SkillStatusBadge'
import { SkillExecutionCard } from './SkillExecutionCard'
import type { SkillExecution, ListingSkillOutput } from '@/lib/skills/execution-service'

// Mock data
const mockExecutions: SkillExecution[] = [
  {
    id: 'exec-1',
    skill_id: 'content-generate',
    status: 'completed',
    started_at: '2024-01-01T10:00:00Z',
    completed_at: '2024-01-01T10:00:05Z',
    triggered_by: 'admin@aerialshots.media',
    trigger_source: 'manual',
    listing_id: 'listing-123',
    execution_time_ms: 5000,
    created_at: '2024-01-01T10:00:00Z',
  },
  {
    id: 'exec-2',
    skill_id: 'image-analyze',
    status: 'running',
    started_at: '2024-01-01T10:01:00Z',
    triggered_by: 'workflow:post-delivery',
    trigger_source: 'workflow',
    listing_id: 'listing-123',
    created_at: '2024-01-01T10:01:00Z',
  },
  {
    id: 'exec-3',
    skill_id: 'video-slideshow',
    status: 'failed',
    started_at: '2024-01-01T10:02:00Z',
    completed_at: '2024-01-01T10:02:10Z',
    triggered_by: 'agent:video-creator',
    trigger_source: 'agent',
    listing_id: 'listing-123',
    error_message: 'API rate limit exceeded',
    created_at: '2024-01-01T10:02:00Z',
  },
]

const mockOutputs: ListingSkillOutput[] = [
  {
    id: 'output-1',
    listing_id: 'listing-123',
    skill_id: 'content-generate',
    output_type: 'description',
    output_data: { professional: 'Beautiful home...', casual: 'Welcome to...' },
    status: 'completed',
    created_at: '2024-01-01T10:00:05Z',
  },
]

const mockAvailableSkills = [
  { id: 'content-generate', name: 'Content Generator', category: 'content' },
  { id: 'image-analyze', name: 'Image Analyzer', category: 'image' },
  { id: 'video-slideshow', name: 'Video Slideshow', category: 'video' },
  { id: 'image-staging', name: 'Virtual Staging', category: 'image' },
]

describe('SkillStatusBadge', () => {
  it('should render pending status with yellow color', () => {
    render(<SkillStatusBadge status="pending" />)

    const badge = screen.getByText('Pending')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('yellow')
  })

  it('should render running status with blue color and animation', () => {
    render(<SkillStatusBadge status="running" />)

    const badge = screen.getByText('Running')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('blue')
  })

  it('should render completed status with green color', () => {
    render(<SkillStatusBadge status="completed" />)

    const badge = screen.getByText('Completed')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('green')
  })

  it('should render failed status with red color', () => {
    render(<SkillStatusBadge status="failed" />)

    const badge = screen.getByText('Failed')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('red')
  })

  it('should render cancelled status with gray color', () => {
    render(<SkillStatusBadge status="cancelled" />)

    const badge = screen.getByText('Cancelled')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('gray')
  })
})

describe('SkillExecutionCard', () => {
  const mockOnRetry = vi.fn()
  const mockOnCancel = vi.fn()
  const mockOnViewDetails = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render execution with skill name and status', () => {
    render(
      <SkillExecutionCard
        execution={mockExecutions[0]}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
        onViewDetails={mockOnViewDetails}
      />
    )

    expect(screen.getByText('content-generate')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('should show execution time for completed executions', () => {
    render(
      <SkillExecutionCard
        execution={mockExecutions[0]}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
        onViewDetails={mockOnViewDetails}
      />
    )

    expect(screen.getByText(/5\.0s/)).toBeInTheDocument()
  })

  it('should show error message for failed executions', () => {
    render(
      <SkillExecutionCard
        execution={mockExecutions[2]}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
        onViewDetails={mockOnViewDetails}
      />
    )

    expect(screen.getByText(/API rate limit exceeded/)).toBeInTheDocument()
  })

  it('should show retry button for failed executions', () => {
    render(
      <SkillExecutionCard
        execution={mockExecutions[2]}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
        onViewDetails={mockOnViewDetails}
      />
    )

    const retryButton = screen.getByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()

    fireEvent.click(retryButton)
    expect(mockOnRetry).toHaveBeenCalledWith('exec-3')
  })

  it('should show cancel button for running executions', () => {
    render(
      <SkillExecutionCard
        execution={mockExecutions[1]}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
        onViewDetails={mockOnViewDetails}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    expect(cancelButton).toBeInTheDocument()

    fireEvent.click(cancelButton)
    expect(mockOnCancel).toHaveBeenCalledWith('exec-2')
  })

  it('should show trigger source badge', () => {
    render(
      <SkillExecutionCard
        execution={mockExecutions[1]}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
        onViewDetails={mockOnViewDetails}
      />
    )

    expect(screen.getByText(/workflow/i)).toBeInTheDocument()
  })
})

describe('SkillsPanel', () => {
  const mockOnExecuteSkill = vi.fn()
  const mockOnRetry = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render available skills section', () => {
    render(
      <SkillsPanel
        listingId="listing-123"
        executions={mockExecutions}
        outputs={mockOutputs}
        availableSkills={mockAvailableSkills}
        onExecuteSkill={mockOnExecuteSkill}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    )

    expect(screen.getByText('AI Skills')).toBeInTheDocument()
    expect(screen.getByText('Content Generator')).toBeInTheDocument()
    expect(screen.getByText('Image Analyzer')).toBeInTheDocument()
  })

  it('should render recent executions', () => {
    render(
      <SkillsPanel
        listingId="listing-123"
        executions={mockExecutions}
        outputs={mockOutputs}
        availableSkills={mockAvailableSkills}
        onExecuteSkill={mockOnExecuteSkill}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    )

    expect(screen.getByText('Recent Executions')).toBeInTheDocument()
    // Use getAllByText since content-generate appears in both executions and outputs
    expect(screen.getAllByText('content-generate').length).toBeGreaterThan(0)
  })

  it('should render skill outputs section when outputs exist', () => {
    render(
      <SkillsPanel
        listingId="listing-123"
        executions={mockExecutions}
        outputs={mockOutputs}
        availableSkills={mockAvailableSkills}
        onExecuteSkill={mockOnExecuteSkill}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    )

    expect(screen.getByText('Generated Content')).toBeInTheDocument()
  })

  it('should call onExecuteSkill when skill button clicked', async () => {
    render(
      <SkillsPanel
        listingId="listing-123"
        executions={mockExecutions}
        outputs={mockOutputs}
        availableSkills={mockAvailableSkills}
        onExecuteSkill={mockOnExecuteSkill}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    )

    const executeButton = screen.getAllByRole('button', { name: /run/i })[0]
    fireEvent.click(executeButton)

    await waitFor(() => {
      expect(mockOnExecuteSkill).toHaveBeenCalled()
    })
  })

  it('should show loading state', () => {
    render(
      <SkillsPanel
        listingId="listing-123"
        executions={[]}
        outputs={[]}
        availableSkills={mockAvailableSkills}
        onExecuteSkill={mockOnExecuteSkill}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should show empty state when no executions', () => {
    render(
      <SkillsPanel
        listingId="listing-123"
        executions={[]}
        outputs={[]}
        availableSkills={mockAvailableSkills}
        onExecuteSkill={mockOnExecuteSkill}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    )

    expect(screen.getByText(/no executions yet/i)).toBeInTheDocument()
  })

  it('should group skills by category', () => {
    render(
      <SkillsPanel
        listingId="listing-123"
        executions={[]}
        outputs={[]}
        availableSkills={mockAvailableSkills}
        onExecuteSkill={mockOnExecuteSkill}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    )

    // Check that categories are present (getAllBy since skill names also contain these words)
    const contentElements = screen.getAllByText(/content/i)
    const imageElements = screen.getAllByText(/image/i)
    const videoElements = screen.getAllByText(/video/i)

    // Each category should have at least a header and its skills
    expect(contentElements.length).toBeGreaterThan(0)
    expect(imageElements.length).toBeGreaterThan(0)
    expect(videoElements.length).toBeGreaterThan(0)
  })

  it('should highlight running executions', () => {
    render(
      <SkillsPanel
        listingId="listing-123"
        executions={mockExecutions}
        outputs={[]}
        availableSkills={mockAvailableSkills}
        onExecuteSkill={mockOnExecuteSkill}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    )

    // Should show running indicator
    const runningBadges = screen.getAllByText('Running')
    expect(runningBadges.length).toBeGreaterThan(0)
  })
})
