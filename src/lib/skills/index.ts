/**
 * Skills Framework
 *
 * Enterprise-level composable AI skills architecture.
 *
 * @example
 * ```typescript
 * import { registerSkill, executeSkill, createComposition } from '@/lib/skills'
 *
 * // Register a skill
 * registerSkill({
 *   id: 'my-skill',
 *   name: 'My Skill',
 *   category: 'generate',
 *   version: '1.0.0',
 *   inputSchema: { type: 'object' },
 *   outputSchema: { type: 'object' },
 *   defaultConfig: {},
 *   execute: async (input, context) => {
 *     return { success: true, data: { result: 'done' }, metadata: { executionTimeMs: 100 } }
 *   },
 * })
 *
 * // Execute a skill
 * const result = await executeSkill({
 *   skillId: 'my-skill',
 *   input: { prompt: 'Hello' },
 * })
 *
 * // Create a composition
 * createComposition('my-workflow', 'My Workflow')
 *   .addStep('skill-1', { required: true })
 *   .addParallelSteps('analysis', [
 *     { skillId: 'skill-2' },
 *     { skillId: 'skill-3' },
 *   ])
 *   .addStep('skill-4')
 *   .onError('continue')
 *   .register()
 * ```
 */

// Types
export type {
  // Core types
  SkillCategory,
  SkillStatus,
  AIProvider,
  SkillConfig,
  SkillResult,
  SkillResultMetadata,
  SkillExecutionContext,
  IOSchema,
  SkillDefinition,
  SkillRequirement,
  ValidationError,
  // Composition types
  SkillComposition,
  CompositionStep,
  CompositionContext,
  ErrorHandlingPolicy,
  CompositionResult,
  // Record types
  SkillExecutionRecord,
  SkillMetrics,
  ProviderConfig,
  SkillRegistryOptions,
  BuiltInSkillId,
} from './types'

// Registry
export {
  registerSkill,
  getSkill,
  hasSkill,
  listSkills,
  getSkillsByCategory,
  getSkillsByProvider,
  unregisterSkill,
  clearRegistry,
  getRegistryStats,
  // Provider management
  registerProvider,
  getProvider,
  isProviderConfigured,
  getConfiguredProviders,
  // Database integration
  saveSkillExecution,
  updateSkillExecution,
  getSkillMetrics,
  getRecentExecutions,
} from './registry'

// Executor
export {
  executeSkill,
  executeSkillsParallel,
  executeSkillsSequential,
  cancelSkillExecution,
  estimateSkillCost,
  type ExecuteSkillOptions,
} from './executor'

// Composer
export {
  registerComposition,
  getComposition,
  listCompositions,
  executeComposition,
  CompositionBuilder,
  createComposition,
} from './composer'

// Render skills
export { renderTemplateSkill, renderCarouselSkill } from './render'
export type {
  RenderTemplateInput,
  RenderTemplateOutput,
  RenderCarouselInput,
  RenderCarouselOutput,
  CarouselSlideInput,
  CarouselSlideOutput,
  ComposeTextOverlayInput,
  ComposeTextOverlayOutput,
  ApplyBrandKitInput,
  ApplyBrandKitOutput,
  OptimizeImageInput,
  OptimizeImageOutput,
} from './render'

// Data skills
export { integrateLifeHereSkill } from './data'
export type {
  IntegrateLifeHereInput,
  IntegrateLifeHereOutput,
  LifeHereDataType,
  LifestyleProfile,
  DiningData,
  CommuteData,
  EventData,
  AttractionData,
  EssentialsData,
  LifestyleData,
  OverviewData,
} from './data'
