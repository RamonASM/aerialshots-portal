// AI Agent System Types

import type { Tables } from '@/lib/supabase/types'

// Define agent types locally (match database enum values)
export type AIAgentCategory =
  | 'operations'
  | 'content'
  | 'development'
  | 'lifestyle'
  | 'analytics'
  | 'marketing'
  | 'communication'

export type AIAgentExecutionMode =
  | 'immediate'
  | 'scheduled'
  | 'triggered'
  | 'manual'

export type AIAgentExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type AIAgentTriggerSource =
  | 'manual'
  | 'schedule'
  | 'webhook'
  | 'event'
  | 'workflow'
  | 'api'

// Database row types
export type AIAgent = Tables<'ai_agents'>
export type AIAgentExecution = Tables<'ai_agent_executions'>
export type AIAgentWorkflow = Tables<'ai_agent_workflows'>

// Agent definition for code-level agents
export interface AgentDefinition {
  slug: string
  name: string
  description: string
  category: AIAgentCategory
  executionMode: AIAgentExecutionMode
  systemPrompt: string
  config?: AgentConfig
  execute: (context: AgentExecutionContext) => Promise<AgentExecutionResult>
}

// Configuration for agent execution
export interface AgentConfig {
  maxTokens?: number
  temperature?: number
  model?: 'claude-3-haiku-20240307' | 'claude-3-sonnet-20240229' | 'gpt-4o-mini' | 'gpt-4o'
  timeout?: number
  retryAttempts?: number
}

// Context passed to agent execution
export interface AgentExecutionContext {
  // Identifiers
  executionId: string
  agentSlug: string
  triggerSource: AIAgentTriggerSource

  // Optional relationships
  listingId?: string
  campaignId?: string
  triggeredBy?: string

  // Input data
  input: Record<string, unknown>

  // Database access (provided by executor)
  supabase: unknown // SupabaseClient type

  // System prompt from database (can override in definition)
  systemPrompt?: string

  // Agent configuration
  config: AgentConfig
}

// Result from agent execution
export interface AgentExecutionResult {
  success: boolean
  output?: Record<string, unknown>
  error?: string
  errorCode?: string
  tokensUsed?: number
  warnings?: string[]
}

// Request to execute an agent
export interface ExecuteAgentRequest {
  agentSlug: string
  triggerSource: AIAgentTriggerSource
  input: Record<string, unknown>
  listingId?: string
  campaignId?: string
  triggeredBy?: string
}

// Workflow Types
export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused'
export type WorkflowErrorBehavior = 'continue' | 'stop'

export interface WorkflowDefinition {
  id: string
  name: string
  description: string
  triggerEvent: string
  steps: WorkflowStep[]
  onError: WorkflowErrorBehavior
}

export interface WorkflowStep {
  agentSlug: string
  condition?: (context: WorkflowContext) => boolean | Promise<boolean>
  inputMapper?: (context: WorkflowContext) => Record<string, unknown> | Promise<Record<string, unknown>>
  required?: boolean
  parallel?: string // Group ID for parallel execution
  onComplete?: (result: AgentExecutionResult, context: WorkflowContext) => void | Promise<void>
}

export interface WorkflowContext {
  workflowId: string
  triggerEvent: string
  triggerData?: Record<string, unknown>
  listingId?: string
  campaignId?: string
  currentStep: number
  stepResults: Record<string, AgentExecutionResult>
  sharedContext: Record<string, unknown>
}

export interface WorkflowTrigger {
  event: string
  listingId?: string
  campaignId?: string
  data?: Record<string, unknown>
}

export interface WorkflowResult {
  workflowId: string
  status: WorkflowStatus
  completedSteps: number
  totalSteps: number
  stepResults: Record<string, AgentExecutionResult>
  error?: string
  startedAt: string
  completedAt?: string
}

export interface WorkflowExecutionStep {
  agentSlug: string
  status: AIAgentExecutionStatus
  executionId?: string
  output?: Record<string, unknown>
  error?: string
  startedAt?: string
  completedAt?: string
}

// Agent metrics for dashboard
export interface AgentMetrics {
  slug: string
  name: string
  category: AIAgentCategory
  isActive: boolean
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  avgDurationMs: number | null
  totalTokensUsed: number
  lastExecution: string | null
}
