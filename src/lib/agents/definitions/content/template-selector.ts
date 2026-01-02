// Template Selector Agent
// Automatically selects the best marketing templates for a listing based on property characteristics

import { registerAgent } from '../../registry'
import { generateWithAI } from '@/lib/ai/client'
import type { AgentExecutionContext, AgentExecutionResult } from '../../types'
import { createAdminClient } from '@/lib/supabase/admin'

interface TemplateSelectorInput {
  listingId: string
  propertyType?: string
  pricePoint?: 'budget' | 'mid-range' | 'luxury' | 'ultra-luxury'
  style?: string // modern, traditional, farmhouse, etc.
  features?: string[]
}

interface TemplateRecommendation {
  templateId: string
  templateName: string
  matchScore: number
  reason: string
}

interface TemplateSelectorOutput {
  listingId: string
  propertyType: string
  pricePoint: string
  recommendedTemplates: {
    carousel: TemplateRecommendation | null
    video: TemplateRecommendation | null
    social: TemplateRecommendation | null
    flyer: TemplateRecommendation | null
  }
  rationale: string
}

const TEMPLATE_SELECTOR_PROMPT = `You are a real estate marketing expert selecting the best visual templates for property listings.

Based on the property characteristics, recommend the most appropriate template style for different marketing materials.

Consider:
1. Property type (single-family, condo, townhouse, luxury estate)
2. Price point (budget, mid-range, luxury, ultra-luxury)
3. Architectural style (modern, traditional, farmhouse, Mediterranean, etc.)
4. Key features (pool, waterfront, golf course, etc.)

Template style guidelines:
- LUXURY properties: Clean, minimalist designs with gold/black accents, elegant typography
- MODERN properties: Bold geometric shapes, high contrast, contemporary fonts
- TRADITIONAL properties: Classic layouts, serif fonts, warm color tones
- WATERFRONT/POOL: Blue color accents, lifestyle imagery emphasis
- FARMHOUSE/RANCH: Rustic touches, earth tones, warm typography

Respond with a JSON object containing:
{
  "carouselStyle": "modern|classic|luxury|minimal",
  "videoStyle": "cinematic|dynamic|elegant|casual",
  "socialStyle": "bold|elegant|playful|professional",
  "flyerStyle": "classic|modern|luxury|minimal",
  "rationale": "Brief explanation of template choices"
}`

/**
 * Determine price point from price value
 */
function getPricePoint(price: number | null): 'budget' | 'mid-range' | 'luxury' | 'ultra-luxury' {
  if (!price) return 'mid-range'
  if (price < 300000) return 'budget'
  if (price < 750000) return 'mid-range'
  if (price < 2000000) return 'luxury'
  return 'ultra-luxury'
}

/**
 * Infer property style from description and features
 */
function inferPropertyStyle(
  description: string | null,
  features: string[]
): string {
  const text = (description || '').toLowerCase() + ' ' + features.join(' ').toLowerCase()

  if (text.includes('modern') || text.includes('contemporary')) return 'modern'
  if (text.includes('farmhouse') || text.includes('country')) return 'farmhouse'
  if (text.includes('mediterranean') || text.includes('spanish')) return 'mediterranean'
  if (text.includes('colonial') || text.includes('traditional')) return 'traditional'
  if (text.includes('craftsman') || text.includes('bungalow')) return 'craftsman'
  if (text.includes('victorian')) return 'victorian'
  if (text.includes('mid-century')) return 'mid-century-modern'
  if (text.includes('minimalist')) return 'minimalist'

  return 'traditional' // Default
}

/**
 * Map AI style recommendations to actual template IDs
 */
function mapStyleToTemplate(
  templateType: 'carousel' | 'video' | 'social' | 'flyer',
  style: string,
  pricePoint: string
): TemplateRecommendation | null {
  // Template naming convention: {type}_{style}_{variant}
  const styleMap: Record<string, Record<string, string>> = {
    carousel: {
      modern: 'carousel_modern_01',
      classic: 'carousel_classic_01',
      luxury: 'carousel_luxury_gold',
      minimal: 'carousel_minimal_01',
    },
    video: {
      cinematic: 'video_cinematic_01',
      dynamic: 'video_dynamic_01',
      elegant: 'video_elegant_01',
      casual: 'video_casual_01',
    },
    social: {
      bold: 'social_bold_01',
      elegant: 'social_elegant_01',
      playful: 'social_playful_01',
      professional: 'social_professional_01',
    },
    flyer: {
      classic: 'flyer_classic_01',
      modern: 'flyer_modern_01',
      luxury: 'flyer_luxury_01',
      minimal: 'flyer_minimal_01',
    },
  }

  const templateId = styleMap[templateType]?.[style.toLowerCase()]

  if (!templateId) return null

  // Upgrade to luxury variant for high-end properties
  const adjustedTemplateId = pricePoint === 'ultra-luxury' || pricePoint === 'luxury'
    ? templateId.replace('_01', '_luxury')
    : templateId

  return {
    templateId: adjustedTemplateId,
    templateName: `${templateType.charAt(0).toUpperCase() + templateType.slice(1)} - ${style.charAt(0).toUpperCase() + style.slice(1)}`,
    matchScore: 85, // Base score, could be refined
    reason: `Selected for ${pricePoint} ${style} property`,
  }
}

/**
 * Main agent execution function
 */
async function execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
  const { input, config } = context
  const selectorInput = input as unknown as TemplateSelectorInput

  if (!selectorInput.listingId) {
    return {
      success: false,
      error: 'listingId is required',
      errorCode: 'MISSING_LISTING_ID',
    }
  }

  const supabase = createAdminClient()

  try {
    // 1. Fetch listing data
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('price, beds, baths, sqft, city')
      .eq('id', selectorInput.listingId)
      .single()

    if (listingError || !listing) {
      return {
        success: false,
        error: 'Listing not found',
        errorCode: 'LISTING_NOT_FOUND',
      }
    }

    // 2. Determine property characteristics
    const pricePoint = selectorInput.pricePoint || getPricePoint(listing.price ?? null)

    // Infer property type from beds/sqft
    let propertyType = selectorInput.propertyType || 'single-family'
    if (!selectorInput.propertyType) {
      const beds = listing.beds || 0
      const sqft = listing.sqft || 0
      if (beds <= 2 && sqft < 1500) propertyType = 'condo'
      else if (beds >= 5 || sqft > 4000) propertyType = 'luxury-estate'
      else if (sqft > 2500) propertyType = 'executive-home'
    }

    const style = selectorInput.style || inferPropertyStyle(
      null, // Description not available in listings table
      selectorInput.features || []
    )

    // 3. Use AI to recommend template styles
    const prompt = `${TEMPLATE_SELECTOR_PROMPT}

Property Details:
- Type: ${propertyType}
- Price Point: ${pricePoint}
- Style: ${style}
- Size: ${listing.sqft?.toLocaleString() || 'Unknown'} sqft
- Beds/Baths: ${listing.beds || '?'}/${listing.baths || '?'}
- Location: ${listing.city || 'Unknown'}
${selectorInput.features?.length ? `- Features: ${selectorInput.features.join(', ')}` : ''}

Select the best template style for each marketing material type.`

    const aiResponse = await generateWithAI({
      prompt,
      maxTokens: config.maxTokens || 600,
      temperature: config.temperature || 0.4,
      maxRetries: config.retryAttempts || 3,
    })

    // 4. Parse AI response
    let aiRecommendation: {
      carouselStyle?: string
      videoStyle?: string
      socialStyle?: string
      flyerStyle?: string
      rationale?: string
    } = {}

    try {
      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiRecommendation = JSON.parse(jsonMatch[0])
      }
    } catch {
      // Use defaults if parsing fails
      aiRecommendation = {
        carouselStyle: pricePoint.includes('luxury') ? 'luxury' : 'modern',
        videoStyle: pricePoint.includes('luxury') ? 'cinematic' : 'dynamic',
        socialStyle: pricePoint.includes('luxury') ? 'elegant' : 'bold',
        flyerStyle: pricePoint.includes('luxury') ? 'luxury' : 'modern',
        rationale: 'Default selection based on price point',
      }
    }

    // 5. Map styles to actual templates
    const output: TemplateSelectorOutput = {
      listingId: selectorInput.listingId,
      propertyType,
      pricePoint,
      recommendedTemplates: {
        carousel: mapStyleToTemplate('carousel', aiRecommendation.carouselStyle || 'modern', pricePoint),
        video: mapStyleToTemplate('video', aiRecommendation.videoStyle || 'dynamic', pricePoint),
        social: mapStyleToTemplate('social', aiRecommendation.socialStyle || 'bold', pricePoint),
        flyer: mapStyleToTemplate('flyer', aiRecommendation.flyerStyle || 'modern', pricePoint),
      },
      rationale: aiRecommendation.rationale || 'Templates selected based on property characteristics',
    }

    // 6. Optionally store recommendations in listing_campaigns
    const { data: existingCampaign } = await supabase
      .from('listing_campaigns')
      .select('id')
      .eq('listing_id', selectorInput.listingId)
      .single()

    if (existingCampaign) {
      await supabase
        .from('listing_campaigns')
        .update({
          template_recommendations: output.recommendedTemplates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCampaign.id)
    }

    return {
      success: true,
      output: output as unknown as Record<string, unknown>,
      tokensUsed: aiResponse.tokensUsed,
    }
  } catch (error) {
    console.error('Template selector error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Template selection failed',
      errorCode: 'TEMPLATE_SELECTOR_ERROR',
    }
  }
}

// Register the agent
registerAgent({
  slug: 'template-selector',
  name: 'Template Selector',
  description: 'Automatically selects the best marketing templates for a listing based on property characteristics (type, price point, style)',
  category: 'content',
  executionMode: 'immediate',
  systemPrompt: TEMPLATE_SELECTOR_PROMPT,
  config: {
    maxTokens: 600,
    temperature: 0.4,
  },
  execute,
})
