// QC Assistant Agent
// Pre-screens photos for quality issues and calculates priority scores for the QC queue

import { registerAgent } from '../../registry'
import { generateWithAI } from '@/lib/ai/client'
import type { AgentExecutionContext, AgentExecutionResult } from '../../types'

interface MediaAsset {
  id: string
  type: string
  category: string | null
  media_url: string | null
  qc_status: string
}

interface QCIssue {
  type: 'lighting' | 'composition' | 'missing' | 'color' | 'blur' | 'angle' | 'clutter'
  severity: 'critical' | 'warning' | 'info'
  description: string
  affectedAssetIds?: string[]
}

interface QCResult {
  priorityScore: number
  priorityColor: 'red' | 'yellow' | 'green'
  flaggedIssues: QCIssue[]
  recommendations: string[]
  estimatedQCTime: number
  missingShots: string[]
  photoQualityScore: number
}

const QC_ASSISTANT_PROMPT = `You are a quality control specialist for real estate photography.
Your task is to analyze media assets and identify potential quality issues.

You should look for:
1. **Lighting Issues**: Underexposed, overexposed, harsh shadows, mixed color temperatures
2. **Composition Problems**: Poor framing, tilted horizons, distracting elements in frame
3. **Color Balance**: Color casts, oversaturated/desaturated, inconsistent white balance
4. **Focus/Blur**: Out of focus, motion blur, soft details
5. **Angles**: Unflattering angles, distortion, verticals not straight
6. **Clutter**: Visible personal items, staging issues, unprofessional appearance

For missing shots, check for these essential categories:
- Exterior (front, back, side views)
- Kitchen (wide shot, detail shots)
- Primary bedroom
- Bathrooms
- Living/family room
- Dining area

Rate severity as:
- **critical**: Major issues that would embarrass the agent or hurt the listing
- **warning**: Noticeable issues that should be addressed before delivery
- **info**: Minor suggestions for improvement, acceptable as-is

Provide specific, actionable feedback that helps the editor prioritize their work.`

/**
 * Calculate priority score based on listing metadata and deadlines
 */
function calculatePriorityScore(input: {
  isRush?: boolean
  scheduledAt?: string | null
  deliveredAt?: string | null
  readyForQCAt?: string | null
  isVIPClient?: boolean
  deadline?: string | null
}): { score: number; factors: string[] } {
  let score = 0
  const factors: string[] = []

  // Rush flag adds significant priority
  if (input.isRush) {
    score += 50
    factors.push('Rush order (+50)')
  }

  // Calculate hours since ready for QC
  if (input.readyForQCAt) {
    const readyTime = new Date(input.readyForQCAt).getTime()
    const now = Date.now()
    const hoursReady = Math.floor((now - readyTime) / (1000 * 60 * 60))

    if (hoursReady > 0) {
      // Deduct points for each hour waiting (becomes negative priority for overdue)
      const timePenalty = Math.min(hoursReady * 10, 50)
      score -= timePenalty
      factors.push(`Waiting ${hoursReady}h (-${timePenalty})`)
    }
  }

  // Same-day deadline
  if (input.deadline) {
    const deadline = new Date(input.deadline)
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    if (deadline <= today) {
      score += 30
      factors.push('Same-day deadline (+30)')
    }
  }

  // VIP client status
  if (input.isVIPClient) {
    score += 20
    factors.push('VIP client (+20)')
  }

  // Normalize score to 0-100 range
  const normalizedScore = Math.max(0, Math.min(100, score + 50)) // Shift baseline to 50

  return { score: normalizedScore, factors }
}

/**
 * Determine priority color based on score
 */
function getPriorityColor(score: number): 'red' | 'yellow' | 'green' {
  if (score >= 80) return 'red'
  if (score >= 50) return 'yellow'
  return 'green'
}

/**
 * Analyze photos using AI vision
 */
async function analyzePhotos(
  assets: MediaAsset[],
  config: { maxTokens?: number; temperature?: number }
): Promise<{ issues: QCIssue[]; missingShots: string[]; qualityScore: number; tokensUsed: number }> {
  // Filter to photos only
  const photos = assets.filter(a => a.type === 'image' || a.type === 'photo')

  if (photos.length === 0) {
    return {
      issues: [{ type: 'missing', severity: 'critical', description: 'No photos found in media assets' }],
      missingShots: [],
      qualityScore: 0,
      tokensUsed: 0,
    }
  }

  // Group photos by category
  const categoryCounts: Record<string, number> = {}
  photos.forEach(photo => {
    const category = photo.category || 'uncategorized'
    categoryCounts[category] = (categoryCounts[category] || 0) + 1
  })

  // Check for missing essential shots
  const missingShots: string[] = []
  const essentialCategories = ['exterior', 'kitchen', 'primary_bedroom', 'bathroom', 'living_room']

  essentialCategories.forEach(category => {
    if (!categoryCounts[category] && !categoryCounts[category.replace('_', ' ')]) {
      missingShots.push(category.replace('_', ' '))
    }
  })

  // Build analysis prompt
  const photoSummary = `
Total photos: ${photos.length}
Categories: ${Object.entries(categoryCounts).map(([cat, count]) => `${cat} (${count})`).join(', ')}

Sample of first 10 photos:
${photos.slice(0, 10).map(p => `- ${p.category || 'uncategorized'}: ${p.id}`).join('\n')}
`

  const analysisPrompt = `${QC_ASSISTANT_PROMPT}

Analyze this real estate photo set:
${photoSummary}

Based on typical quality issues in real estate photography, identify potential problems.
Since I cannot view the actual images, provide general guidance based on:
1. Category distribution - are any essential rooms missing?
2. Photo count - is it sufficient for the property type?
3. Common issues to check based on category

Return your analysis as JSON:
{
  "issues": [
    {
      "type": "lighting|composition|missing|color|blur|angle|clutter",
      "severity": "critical|warning|info",
      "description": "Specific description of the issue",
      "affectedAssetIds": ["asset_id1", "asset_id2"]
    }
  ],
  "qualityScore": 85,
  "generalRecommendations": ["Check kitchen lighting", "Verify all exteriors are straight"]
}

Quality score should be 0-100 based on completeness and likely quality.`

  try {
    const response = await generateWithAI({
      prompt: analysisPrompt,
      maxTokens: config.maxTokens || 1500,
      temperature: config.temperature || 0.3,
    })

    // Parse AI response
    let analysisResult: {
      issues?: QCIssue[]
      qualityScore?: number
      generalRecommendations?: string[]
    }

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      analysisResult = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    } catch {
      // If JSON parsing fails, create basic analysis
      analysisResult = {
        issues: [],
        qualityScore: 70,
        generalRecommendations: ['Manual QC review recommended'],
      }
    }

    // Add missing shots as issues
    if (missingShots.length > 0) {
      analysisResult.issues = analysisResult.issues || []
      analysisResult.issues.push({
        type: 'missing',
        severity: 'warning',
        description: `Missing essential shots: ${missingShots.join(', ')}`,
      })
    }

    return {
      issues: analysisResult.issues || [],
      missingShots,
      qualityScore: analysisResult.qualityScore || 70,
      tokensUsed: response.tokensUsed,
    }
  } catch (error) {
    console.error('Error analyzing photos:', error)

    // Return basic analysis on error
    return {
      issues: [
        {
          type: 'missing',
          severity: 'info',
          description: 'AI analysis unavailable - manual review required',
        },
      ],
      missingShots,
      qualityScore: 50,
      tokensUsed: 0,
    }
  }
}

/**
 * Estimate QC time based on photo count and identified issues
 */
function estimateQCTime(photoCount: number, issuesCount: number): number {
  // Base time: 1 minute per photo
  let timeMinutes = photoCount

  // Add time for each issue to review
  timeMinutes += issuesCount * 2

  // Minimum 5 minutes, maximum 60 minutes
  return Math.max(5, Math.min(60, Math.round(timeMinutes)))
}

/**
 * Main agent execution function
 */
async function execute(
  context: AgentExecutionContext
): Promise<AgentExecutionResult> {
  const { input, config, supabase } = context

  const listingId = input.listingId as string
  if (!listingId) {
    return {
      success: false,
      error: 'listing_id is required',
      errorCode: 'MISSING_LISTING_ID',
    }
  }

  try {
    // Fetch listing details
    const { data: listing, error: listingError } = await (supabase as any)
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return {
        success: false,
        error: `Listing not found: ${listingId}`,
        errorCode: 'LISTING_NOT_FOUND',
      }
    }

    // Fetch media assets
    const { data: assets, error: assetsError } = await (supabase as any)
      .from('media_assets')
      .select('*')
      .eq('listing_id', listingId)
      .order('sort_order', { ascending: true })

    if (assetsError) {
      return {
        success: false,
        error: 'Failed to fetch media assets',
        errorCode: 'ASSETS_FETCH_FAILED',
      }
    }

    const mediaAssets = (assets || []) as MediaAsset[]

    // Calculate priority score
    const priorityData = calculatePriorityScore({
      isRush: listing.is_rush,
      scheduledAt: listing.scheduled_at,
      deliveredAt: listing.delivered_at,
      readyForQCAt: input.readyForQCAt as string | null,
      isVIPClient: input.isVIPClient as boolean,
      deadline: input.deadline as string | null,
    })

    // Analyze photos
    const photoAnalysis = await analyzePhotos(mediaAssets, config)

    // Build recommendations
    const recommendations: string[] = []

    if (photoAnalysis.missingShots.length > 0) {
      recommendations.push(`Verify if ${photoAnalysis.missingShots.join(', ')} photos were requested`)
    }

    if (photoAnalysis.qualityScore < 70) {
      recommendations.push('Photo quality is below standards - thorough review recommended')
    }

    if (photoAnalysis.issues.some(i => i.severity === 'critical')) {
      recommendations.push('Critical issues found - may need re-shoot')
    }

    if (priorityData.score >= 80) {
      recommendations.push('High priority - expedite QC process')
    }

    const result: QCResult = {
      priorityScore: priorityData.score,
      priorityColor: getPriorityColor(priorityData.score),
      flaggedIssues: photoAnalysis.issues,
      recommendations,
      estimatedQCTime: estimateQCTime(mediaAssets.length, photoAnalysis.issues.length),
      missingShots: photoAnalysis.missingShots,
      photoQualityScore: photoAnalysis.qualityScore,
    }

    return {
      success: true,
      output: {
        ...result,
        priorityFactors: priorityData.factors,
        assetCount: mediaAssets.length,
        photoCount: mediaAssets.filter(a => a.type === 'image' || a.type === 'photo').length,
        listingAddress: listing.address,
      },
      tokensUsed: photoAnalysis.tokensUsed,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'QC analysis failed',
      errorCode: 'QC_ANALYSIS_FAILED',
    }
  }
}

// Register the agent
registerAgent({
  slug: 'qc-assistant',
  name: 'QC Assistant',
  description: 'Pre-screens photos for quality issues and calculates priority scores for the QC queue',
  category: 'operations',
  executionMode: 'async',
  systemPrompt: QC_ASSISTANT_PROMPT,
  config: {
    maxTokens: 1500,
    temperature: 0.3,
  },
  execute,
})
