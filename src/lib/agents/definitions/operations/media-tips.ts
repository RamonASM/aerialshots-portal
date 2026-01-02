/**
 * Media Tips Generator Agent
 *
 * Analyzes media assets and generates actionable tips for improving
 * photo/video quality, composition, and presentation.
 */

import { registerAgent } from '@/lib/agents/registry'
import type { AgentExecutionContext, AgentExecutionResult } from '@/lib/agents/types'
import { executeSkill } from '@/lib/skills'

interface MediaAsset {
  url: string
  type: 'photo' | 'video' | 'tour' | 'floorplan'
  category?: string
}

interface MediaTip {
  assetIndex: number
  category: 'composition' | 'lighting' | 'staging' | 'technical' | 'presentation'
  severity: 'suggestion' | 'important' | 'critical'
  tip: string
  suggestion: string
}

interface MediaTipsInput {
  mediaAssets: MediaAsset[]
  listingId?: string
  propertyType?: string
}

interface MediaTipsOutput {
  tips: MediaTip[]
  overallScore: number
  summary: string
  prioritizedActions: string[]
}

/**
 * Generate media quality tips using AI analysis
 */
async function generateMediaTips(
  assets: MediaAsset[],
  propertyType?: string
): Promise<MediaTipsOutput> {
  const tips: MediaTip[] = []
  const analyses: string[] = []

  // Analyze each photo asset
  const photoAssets = assets.filter((a) => a.type === 'photo')

  for (let i = 0; i < Math.min(photoAssets.length, 10); i++) {
    const asset = photoAssets[i]

    try {
      const analysis = await executeSkill({
        skillId: 'image-analyze',
        input: {
          imageUrl: asset.url,
          detectObjects: true,
          analyzeComposition: true,
        },
      })

      if (analysis.success && analysis.data) {
        const { objects, composition, quality } = analysis.data as {
          objects?: string[]
          composition?: { score: number; issues: string[] }
          quality?: { score: number; issues: string[] }
        }

        // Generate tips based on analysis
        if (composition?.issues) {
          for (const issue of composition.issues) {
            tips.push({
              assetIndex: i,
              category: 'composition',
              severity: composition.score < 0.5 ? 'important' : 'suggestion',
              tip: issue,
              suggestion: getSuggestionForIssue(issue, 'composition'),
            })
          }
        }

        if (quality?.issues) {
          for (const issue of quality.issues) {
            tips.push({
              assetIndex: i,
              category: 'technical',
              severity: quality.score < 0.5 ? 'critical' : 'important',
              tip: issue,
              suggestion: getSuggestionForIssue(issue, 'technical'),
            })
          }
        }

        // Check for staging issues
        if (objects?.some((o) => ['clutter', 'personal_items', 'mess'].includes(o.toLowerCase()))) {
          tips.push({
            assetIndex: i,
            category: 'staging',
            severity: 'important',
            tip: 'Personal items or clutter visible in frame',
            suggestion: 'Consider virtual staging or decluttering before reshoot',
          })
        }

        analyses.push(`Photo ${i + 1}: ${composition?.score ?? 0.7 * 100}% quality`)
      }
    } catch {
      // Skip analysis errors, continue with other assets
      continue
    }
  }

  // Calculate overall score
  const avgScore = tips.length > 0
    ? Math.max(0.5, 1 - tips.filter((t) => t.severity === 'critical').length * 0.15 - tips.filter((t) => t.severity === 'important').length * 0.05)
    : 0.85

  // Generate summary and prioritized actions
  const criticalCount = tips.filter((t) => t.severity === 'critical').length
  const importantCount = tips.filter((t) => t.severity === 'important').length

  const summary = criticalCount > 0
    ? `Found ${criticalCount} critical and ${importantCount} important issues across ${photoAssets.length} photos. Immediate attention recommended.`
    : importantCount > 0
      ? `Found ${importantCount} areas for improvement. Overall quality is good with room for enhancement.`
      : `Photos meet quality standards. ${tips.length} minor suggestions available.`

  const prioritizedActions = [
    ...tips.filter((t) => t.severity === 'critical').map((t) => t.suggestion),
    ...tips.filter((t) => t.severity === 'important').slice(0, 3).map((t) => t.suggestion),
  ]

  return {
    tips,
    overallScore: Math.round(avgScore * 100),
    summary,
    prioritizedActions: prioritizedActions.slice(0, 5),
  }
}

/**
 * Get suggestion for specific issue type
 */
function getSuggestionForIssue(issue: string, category: string): string {
  const suggestions: Record<string, Record<string, string>> = {
    composition: {
      default: 'Consider reframing to follow the rule of thirds',
      'off-center': 'Center the main subject or use intentional asymmetry',
      'cluttered': 'Remove distracting elements from the frame',
      'empty': 'Add visual interest or move closer to the subject',
    },
    technical: {
      default: 'Consider HDR processing to improve dynamic range',
      'dark': 'Increase exposure or add lighting',
      'overexposed': 'Reduce exposure or adjust window treatments',
      'blurry': 'Use a tripod and ensure proper focus',
      'noise': 'Lower ISO or use noise reduction in post-processing',
    },
    lighting: {
      default: 'Ensure even lighting throughout the space',
      'harsh': 'Soften lighting or shoot during golden hour',
      'uneven': 'Add fill lighting to balance shadows',
    },
    staging: {
      default: 'Consider virtual staging to enhance the space',
      'empty': 'Add virtual furniture to help buyers visualize the space',
      'cluttered': 'Declutter and depersonalize the space',
    },
  }

  const categoryMap = suggestions[category] || {}
  const lowerIssue = issue.toLowerCase()

  for (const [key, value] of Object.entries(categoryMap)) {
    if (lowerIssue.includes(key)) {
      return value
    }
  }

  return categoryMap['default'] || 'Review and address this issue'
}

registerAgent({
  slug: 'media-tips',
  name: 'Media Tips Generator',
  description: 'Analyzes media assets and generates quality improvement tips for photos and videos',
  category: 'operations',
  executionMode: 'immediate',
  systemPrompt: `You are a media quality analyst for real estate photography and video.
Analyze media assets and provide actionable tips for improving quality, composition, and presentation.
Focus on: lighting, composition, staging, technical quality, and overall presentation.
Prioritize critical issues that affect buyer perception.`,

  execute: async (context: AgentExecutionContext): Promise<AgentExecutionResult> => {
    const { mediaAssets, propertyType } = context.input as unknown as MediaTipsInput

    if (!mediaAssets || !Array.isArray(mediaAssets) || mediaAssets.length === 0) {
      return {
        success: false,
        error: 'No media assets provided for analysis',
      }
    }

    try {
      const result = await generateMediaTips(mediaAssets, propertyType)

      return {
        success: true,
        output: result as unknown as Record<string, unknown>,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate media tips',
      }
    }
  },
})

export { generateMediaTips }
export type { MediaAsset, MediaTip, MediaTipsInput, MediaTipsOutput }
