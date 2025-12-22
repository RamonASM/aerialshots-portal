// AI Agent System - Main Entry Point
//
// This module provides the agent framework for automating operations,
// content generation, and development tasks.
//
// Usage:
//   import { executeAgent, registerAgent, getAllAgents } from '@/lib/agents'
//
//   // Execute a registered agent
//   const result = await executeAgent({
//     agentSlug: 'listing-description',
//     triggerSource: 'manual',
//     input: { address: '123 Main St', beds: 3, baths: 2, sqft: 1500 }
//   })
//
//   // Register a custom agent
//   registerAgent({
//     slug: 'my-agent',
//     name: 'My Agent',
//     description: 'Does something useful',
//     category: 'content',
//     executionMode: 'sync',
//     systemPrompt: 'You are...',
//     execute: async (context) => ({
//       success: true,
//       output: { result: 'hello' }
//     })
//   })

// Types
export type {
  AgentDefinition,
  AgentConfig,
  AgentExecutionContext,
  AgentExecutionResult,
  ExecuteAgentRequest,
  WorkflowDefinition,
  WorkflowStep,
  WorkflowContext,
  WorkflowTrigger,
  WorkflowResult,
  WorkflowStatus,
  WorkflowErrorBehavior,
  WorkflowExecutionStep,
  AgentMetrics,
  AIAgent,
  AIAgentExecution,
  AIAgentWorkflow,
  AIAgentCategory,
  AIAgentExecutionMode,
  AIAgentExecutionStatus,
  AIAgentTriggerSource,
} from './types'

// Registry
export {
  registerAgent,
  getAgentDefinition,
  getAllAgentDefinitions,
  getAgent,
  getAllAgents,
  getAgentMetrics,
  getRecentExecutions,
  updateAgentStatus,
  updateAgentConfig,
  getAgentsByCategory,
} from './registry'

// Executor
export {
  executeAgent,
  getExecution,
  cancelExecution,
  retryExecution,
} from './executor'

// Orchestrator
export {
  registerWorkflow,
  getWorkflowDefinition,
  getAllWorkflowDefinitions,
  executeWorkflow,
  getWorkflowExecution,
  pauseWorkflow,
  resumeWorkflow,
  getWorkflowsForResource,
} from './orchestrator'

// Import and register all agent definitions
import './definitions/development/claude-md-updater'
import './definitions/operations/qc-assistant'
import './definitions/operations/care-task-generator'
import './definitions/operations/delivery-notifier'
import './definitions/lifestyle/portfolio-stats'
import './definitions/lifestyle/seo-meta'
import './definitions/lifestyle/neighborhood-data'
import './definitions/content/campaign-launcher'
// Future agent definitions will be imported here:
// import './definitions/content/listing-description'
// etc.

// Import and register all workflow definitions
import './workflows'
