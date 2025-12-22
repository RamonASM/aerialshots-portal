// CLAUDE.md Updater Agent
// Analyzes codebase changes and updates /CLAUDE.md documentation

import { registerAgent } from '../../registry'
import { generateWithAI } from '@/lib/ai/client'
import type { AgentExecutionContext, AgentExecutionResult } from '../../types'
import { glob } from 'glob'
import { readFile } from 'fs/promises'
import path from 'path'

interface CodebaseAnalysis {
  apiRoutes: RouteInfo[]
  databaseTables: string[]
  integrations: IntegrationInfo[]
  envVariables: string[]
  newFeatures: string[]
}

interface RouteInfo {
  path: string
  method: string
  description: string
}

interface IntegrationInfo {
  name: string
  type: string
  description: string
}

const CLAUDE_MD_UPDATER_PROMPT = `You are a documentation specialist for a Next.js/React codebase.
Your task is to analyze changes and update CLAUDE.md documentation.

The CLAUDE.md file follows this structure:
1. Project Overview - Brief description of the project
2. Commands - Common development commands (npm run dev, etc.)
3. Architecture - Key patterns, file structure, tech stack
4. API Routes - All API endpoints with their purpose
5. Database Schema - Tables and their relationships
6. Integrations - External services (Supabase, Aryeo, etc.)
7. Environment Variables - Required .env configuration
8. Key Workflows - Important business processes

When analyzing changes:
- Be concise but comprehensive
- Focus on what developers need to know
- Highlight breaking changes or new patterns
- Use consistent formatting

Return your analysis as JSON with suggested updates.`

/**
 * Analyze API routes in the codebase
 */
async function analyzeApiRoutes(basePath: string): Promise<RouteInfo[]> {
  const routes: RouteInfo[] = []

  try {
    const routeFiles = await glob('src/app/api/**/route.ts', { cwd: basePath })

    for (const file of routeFiles) {
      const content = await readFile(path.join(basePath, file), 'utf-8')

      // Extract route path from file path
      const routePath = file
        .replace('src/app/api', '')
        .replace('/route.ts', '')
        .replace(/\[([^\]]+)\]/g, ':$1')

      // Detect HTTP methods
      const methods: string[] = []
      if (content.includes('export async function GET')) methods.push('GET')
      if (content.includes('export async function POST')) methods.push('POST')
      if (content.includes('export async function PUT')) methods.push('PUT')
      if (content.includes('export async function DELETE')) methods.push('DELETE')
      if (content.includes('export async function PATCH')) methods.push('PATCH')

      // Try to extract description from comments
      const commentMatch = content.match(/\/\*\*[\s\S]*?\*\//)
      const description = commentMatch
        ? commentMatch[0]
            .replace(/\/\*\*|\*\//g, '')
            .replace(/\n\s*\*/g, ' ')
            .trim()
        : `${methods.join('/')} ${routePath}`

      routes.push({
        path: `/api${routePath}`,
        method: methods.join(', '),
        description: description.slice(0, 100),
      })
    }
  } catch (error) {
    console.error('Error analyzing API routes:', error)
  }

  return routes
}

/**
 * Analyze database schema from migrations
 */
async function analyzeDatabaseSchema(basePath: string): Promise<string[]> {
  const tables: string[] = []

  try {
    const migrationFiles = await glob('supabase/migrations/*.sql', { cwd: basePath })

    for (const file of migrationFiles) {
      const content = await readFile(path.join(basePath, file), 'utf-8')

      // Extract CREATE TABLE statements
      const tableMatches = content.matchAll(/CREATE TABLE (\w+)/gi)
      for (const match of tableMatches) {
        if (!tables.includes(match[1])) {
          tables.push(match[1])
        }
      }
    }
  } catch (error) {
    console.error('Error analyzing database schema:', error)
  }

  return tables.sort()
}

/**
 * Analyze environment variables from .env.example or codebase
 */
async function analyzeEnvVariables(basePath: string): Promise<string[]> {
  const envVars: Set<string> = new Set()

  try {
    // Try to read .env.example
    try {
      const envExample = await readFile(path.join(basePath, '.env.example'), 'utf-8')
      const matches = envExample.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)
      for (const match of matches) {
        envVars.add(match[1])
      }
    } catch {
      // .env.example doesn't exist
    }

    // Also scan source files for process.env usage
    const sourceFiles = await glob('src/**/*.{ts,tsx}', { cwd: basePath })

    for (const file of sourceFiles.slice(0, 50)) {
      // Limit to avoid too much scanning
      try {
        const content = await readFile(path.join(basePath, file), 'utf-8')
        const matches = content.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)
        for (const match of matches) {
          envVars.add(match[1])
        }
      } catch {
        // Skip files that can't be read
      }
    }
  } catch (error) {
    console.error('Error analyzing env variables:', error)
  }

  return Array.from(envVars).sort()
}

/**
 * Main agent execution function
 */
async function execute(
  context: AgentExecutionContext
): Promise<AgentExecutionResult> {
  const { input, config } = context
  const basePath = (input.basePath as string) || process.cwd()
  const focusArea = input.focusArea as string | undefined

  try {
    // Analyze the codebase
    const [apiRoutes, databaseTables, envVariables] = await Promise.all([
      analyzeApiRoutes(basePath),
      analyzeDatabaseSchema(basePath),
      analyzeEnvVariables(basePath),
    ])

    const analysis: CodebaseAnalysis = {
      apiRoutes,
      databaseTables,
      integrations: [], // Would need more complex analysis
      envVariables,
      newFeatures: [],
    }

    // Generate documentation update suggestions using AI
    const prompt = `${CLAUDE_MD_UPDATER_PROMPT}

Current codebase analysis:
${JSON.stringify(analysis, null, 2)}

${focusArea ? `Focus area: ${focusArea}` : 'Analyze all areas'}

${input.recentChanges ? `Recent changes:\n${input.recentChanges}` : ''}

Generate a JSON response with:
{
  "summary": "Brief summary of what should be updated",
  "sections": [
    {
      "name": "Section name (e.g., 'API Routes')",
      "action": "add|update|remove",
      "content": "The content to add/update"
    }
  ],
  "suggestedClaudeMd": "Full suggested CLAUDE.md content if major update needed"
}`

    const aiResponse = await generateWithAI({
      prompt,
      maxTokens: config.maxTokens || 2000,
      temperature: config.temperature || 0.3, // Lower for more consistent output
    })

    let parsedResponse: Record<string, unknown>
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/)
      parsedResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : { text: aiResponse.content }
    } catch {
      parsedResponse = { text: aiResponse.content }
    }

    return {
      success: true,
      output: {
        analysis,
        suggestions: parsedResponse,
        tokensUsed: aiResponse.tokensUsed,
      },
      tokensUsed: aiResponse.tokensUsed,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed',
    }
  }
}

// Register the agent
registerAgent({
  slug: 'claude-md-updater',
  name: 'CLAUDE.md Updater',
  description: 'Analyzes codebase changes and updates /CLAUDE.md documentation',
  category: 'development',
  executionMode: 'async',
  systemPrompt: CLAUDE_MD_UPDATER_PROMPT,
  config: {
    maxTokens: 2000,
    temperature: 0.3,
  },
  execute,
})
