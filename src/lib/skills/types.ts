/**
 * Skills Framework - Core Types
 *
 * Enterprise-level composable skills architecture for AI operations.
 * Skills are atomic units that do one thing well and can be composed
 * into workflows by expert agents.
 */

/**
 * Skill categories
 */
export type SkillCategory =
  | 'generate'    // Content/image/video creation (LLM, Gemini)
  | 'transform'   // Modify existing assets (HDR, inpaint, encode)
  | 'integrate'   // External APIs (FoundDR, Bannerbear, MLS)
  | 'data'        // Fetch/aggregate data (Places, Ticketmaster)
  | 'notify'      // Send notifications (email, SMS, push)
  | 'decision'    // Conditional logic (QC scoring, routing)

/**
 * Skill execution status
 */
export type SkillStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

/**
 * AI provider types
 */
export type AIProvider =
  | 'gemini'
  | 'anthropic'
  | 'openai'
  | 'founddr'
  | 'ffmpeg'
  | 'bannerbear'
  | 'stable_diffusion'
  | 'satori_sharp'      // Text-to-image rendering (Satori + Sharp)
  | 'puppeteer_chrome'  // Complex template rendering
  | 'life_here'         // Location data API

/**
 * Skill configuration
 */
export interface SkillConfig {
  timeout?: number           // Execution timeout in ms (default 30000)
  retries?: number           // Max retry attempts (default 3)
  temperature?: number       // For LLM skills (0-1)
  maxTokens?: number         // For LLM skills
  model?: string             // Specific model to use
  provider?: AIProvider      // Override default provider
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

/**
 * Skill execution result
 */
export interface SkillResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
  metadata: SkillResultMetadata
}

/**
 * Skill result metadata
 */
export interface SkillResultMetadata {
  executionTimeMs: number
  tokensUsed?: number
  costUsd?: number
  provider?: AIProvider
  warnings?: string[]
  retryCount?: number
}

/**
 * Skill execution context
 */
export interface SkillExecutionContext {
  executionId: string
  skillId: string
  triggeredBy: string
  triggerSource: 'manual' | 'agent' | 'workflow' | 'cron' | 'webhook'
  startedAt: Date
  config: SkillConfig
  listingId?: string
  campaignId?: string
  parentExecutionId?: string   // For nested skill calls
  sharedContext?: Record<string, unknown>  // For workflow data passing
  abortSignal?: AbortSignal    // For cancellation support
}

/**
 * Input/Output schema for validation
 */
export interface IOSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean'
  properties?: Record<string, IOSchema>
  items?: IOSchema
  required?: string[]
  enum?: string[]
  format?: string
  description?: string
}

/**
 * Skill definition - the core interface all skills implement
 */
export interface SkillDefinition<TInput = unknown, TOutput = unknown> {
  // Identity
  id: string
  name: string
  description: string
  category: SkillCategory
  version: string           // Semantic version (e.g., "1.0.0")

  // Capability metadata
  inputSchema: IOSchema
  outputSchema: IOSchema

  // Configuration
  defaultConfig: SkillConfig
  provider?: AIProvider
  requirements?: SkillRequirement[]

  // Execution
  execute: (
    input: TInput,
    context: SkillExecutionContext
  ) => Promise<SkillResult<TOutput>>

  // Optional lifecycle hooks
  validate?: (input: TInput) => ValidationError[]
  cleanup?: (context: SkillExecutionContext) => Promise<void>
  estimateCost?: (input: TInput) => Promise<number>
}

/**
 * Skill requirement (dependencies)
 */
export interface SkillRequirement {
  type: 'api_key' | 'environment' | 'service' | 'capability'
  name: string
  configKey: string         // Environment variable or config path
  required: boolean
  description?: string
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string
  message: string
  code: string
}

/**
 * Skill composition - multiple skills chained together
 */
export interface SkillComposition {
  id: string
  name: string
  description: string
  steps: CompositionStep[]
  errorHandling: ErrorHandlingPolicy
  version: string
}

/**
 * Composition step configuration
 */
export interface CompositionStep {
  skillId: string
  stepName?: string          // Optional human-readable name

  // Execution control
  parallel?: string          // Group ID for parallel execution
  required?: boolean         // If false, failure doesn't stop workflow
  condition?: (context: CompositionContext) => Promise<boolean>

  // Data wiring
  inputMapper?: (context: CompositionContext) => Promise<unknown>
  outputCapture?: string     // Store output with this key

  // Callbacks
  onSuccess?: (result: SkillResult, context: CompositionContext) => Promise<void>
  onError?: (error: string, context: CompositionContext) => Promise<void>

  // Per-step overrides
  timeout?: number
  retries?: number
}

/**
 * Composition execution context
 */
export interface CompositionContext {
  compositionId: string
  executionId: string
  currentStep: number
  stepResults: Record<string, SkillResult>
  sharedData: Record<string, unknown>
  input: unknown
  startedAt: Date

  // Helper methods (implemented by executor)
  getData: (path: string) => unknown
  setData: (path: string, value: unknown) => void
}

/**
 * Error handling policy for compositions
 */
export interface ErrorHandlingPolicy {
  mode: 'stop' | 'continue' | 'partial'
  requiredSteps?: string[]   // These must succeed
  fallbacks?: Record<string, string | (() => Promise<unknown>)>
  onError?: (error: string, step: string, context: CompositionContext) => Promise<void>
}

/**
 * Composition execution result
 */
export interface CompositionResult {
  success: boolean
  completedSteps: string[]
  failedSteps: string[]
  skippedSteps: string[]
  stepResults: Record<string, SkillResult>
  totalExecutionTimeMs: number
  totalCostUsd?: number
  errors?: string[]
}

/**
 * Skill execution record (for database)
 */
export interface SkillExecutionRecord {
  id: string
  skillId: string
  startedAt: Date
  completedAt?: Date
  status: SkillStatus
  input: unknown
  output?: unknown
  errorMessage?: string
  executionTimeMs?: number
  tokensUsed?: number
  costUsd?: number
  triggeredBy: string
  triggerSource: string
  listingId?: string
  campaignId?: string
  parentExecutionId?: string
  metadata?: Record<string, unknown>
}

/**
 * Skill metrics (aggregated stats)
 */
export interface SkillMetrics {
  skillId: string
  totalExecutions: number
  successCount: number
  failureCount: number
  successRate: number
  avgExecutionTimeMs: number
  p50ExecutionTimeMs: number
  p95ExecutionTimeMs: number
  totalTokensUsed: number
  totalCostUsd: number
  lastExecutedAt?: Date
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  id: AIProvider
  name: string
  apiKeyEnvVar: string
  isConfigured: boolean
  rateLimits?: {
    requestsPerMinute: number
    tokensPerMinute?: number
  }
  costPerUnit?: {
    inputTokens?: number    // Cost per 1K tokens
    outputTokens?: number
    imageGeneration?: number
    videoSecond?: number
    apiCall?: number        // Cost per API call (for internal/external APIs)
  }
}

/**
 * Skill registry options
 */
export interface SkillRegistryOptions {
  category?: SkillCategory
  provider?: AIProvider
  activeOnly?: boolean
}

/**
 * Built-in skill IDs for type safety
 */
export type BuiltInSkillId =
  // Image skills
  | 'image-generate'
  | 'image-analyze'
  | 'image-inpaint'
  | 'image-twilight'
  | 'image-staging'
  // Content skills
  | 'content-listing-description'
  | 'content-social-caption'
  | 'content-email-copy'
  // Video skills
  | 'video-slideshow'
  | 'video-motion'
  | 'video-audio-sync'
  | 'video-encode'
  // Data skills
  | 'data-asset-fetch'
  | 'data-listing-fetch'
  | 'data-neighborhood'
  // Integration skills
  | 'integrate-founddr-hdr'
  | 'integrate-bannerbear'
  | 'integrate-storage-upload'
  | 'integrate-life-here'
  // Render skills
  | 'render-template'
  | 'render-carousel'
  | 'render-compose-text'
  | 'render-apply-brand-kit'
  | 'render-optimize-image'
  // Notification skills
  | 'notify-email'
  | 'notify-sms'
  | 'notify-push'
  // Decision skills
  | 'decision-qc-score'
  | 'decision-route'
