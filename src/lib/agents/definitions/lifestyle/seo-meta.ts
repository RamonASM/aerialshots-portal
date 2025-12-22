// SEO Meta Agent
// Generates SEO-optimized meta tags for property and portfolio pages

import { registerAgent } from '../../registry'
import { generateWithAI } from '@/lib/ai/client'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AgentExecutionContext, AgentExecutionResult } from '../../types'

interface SEOMetaInput {
  pageType: 'property' | 'agent' | 'listing'
  entityId: string // listing ID or agent ID
}

interface SEOMetaOutput {
  title: string
  description: string
  openGraph: {
    title: string
    description: string
    images: Array<{ url: string; width: number; height: number }>
    type: string
    url?: string
  }
  twitter: {
    card: string
    title: string
    description: string
    images?: string[]
  }
  jsonLd: Record<string, unknown>
}

const SEO_META_PROMPT = `You are an SEO expert specializing in real estate websites. Your goal is to generate optimized meta tags that:
1. Improve search engine rankings
2. Increase click-through rates from search results
3. Are compelling and keyword-rich
4. Follow SEO best practices

Guidelines:
- Title tags: 50-60 characters, include primary keyword at start
- Meta descriptions: 150-160 characters, include call-to-action
- Use location-based keywords naturally
- Include property features and price when relevant
- Make descriptions compelling and unique
- Focus on what makes the property/agent stand out

Return your response as valid JSON only, with no additional text.`

/**
 * Fetch property data for SEO generation
 */
async function fetchPropertyData(listingId: string) {
  const supabase = createAdminClient()

  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      *,
      agent:agents(*),
      media_assets(*)
    `)
    .eq('id', listingId)
    .single()

  if (error || !listing) {
    throw new Error(`Failed to fetch listing: ${error?.message}`)
  }

  return listing
}

/**
 * Fetch agent data for SEO generation
 */
async function fetchAgentData(agentId: string) {
  const supabase = createAdminClient()

  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single()

  if (agentError || !agent) {
    throw new Error(`Failed to fetch agent: ${agentError?.message}`)
  }

  // Get agent's listings for stats
  const { data: listings } = await supabase
    .from('listings')
    .select('id, status, price, sold_price')
    .eq('agent_id', agentId)

  return {
    agent,
    listingsCount: listings?.length || 0,
    soldCount: listings?.filter(l => l.status === 'sold').length || 0,
  }
}

/**
 * Generate SEO meta tags using AI
 */
async function generateSEOMeta(
  pageType: 'property' | 'agent' | 'listing',
  data: any,
  config: { maxTokens?: number; temperature?: number }
): Promise<SEOMetaOutput> {
  let prompt = ''

  if (pageType === 'property') {
    const { listing, agent, media_assets } = data
    const priceStr = listing.price ? `$${listing.price.toLocaleString()}` : ''
    const bedsStr = listing.beds ? `${listing.beds}BR` : ''
    const bathsStr = listing.baths ? `${listing.baths}BA` : ''
    const sqftStr = listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : ''
    const features = [bedsStr, bathsStr, sqftStr].filter(Boolean).join(', ')

    const heroImage = media_assets?.find((m: any) => m.type === 'photo')?.aryeo_url || ''

    prompt = `${SEO_META_PROMPT}

Page Type: Property Listing
Property Address: ${listing.address}
City: ${listing.city || 'Florida'}
State: ${listing.state || 'FL'}
Features: ${features}
Price: ${priceStr}
Property Type: ${listing.property_type || 'Residential'}
Status: ${listing.status}
Description: ${listing.description || 'Beautiful property in a prime location'}

Agent Name: ${agent?.name || 'Aerial Shots Media'}
Has Virtual Tour: ${media_assets?.some((m: any) => m.type === 'matterport') ? 'Yes' : 'No'}
Has Video: ${media_assets?.some((m: any) => m.type === 'video') ? 'Yes' : 'No'}
Hero Image URL: ${heroImage}

Generate SEO meta tags optimized for this property listing. Focus on location, features, and unique selling points.

Return JSON in this exact format:
{
  "title": "Optimized title tag (50-60 chars)",
  "description": "Compelling meta description (150-160 chars)",
  "openGraph": {
    "title": "OG title (can be slightly longer)",
    "description": "OG description (compelling, shareable)",
    "images": [{"url": "${heroImage}", "width": 1200, "height": 630}],
    "type": "website",
    "url": "https://app.aerialshots.media/property/${listing.id}"
  },
  "twitter": {
    "card": "summary_large_image",
    "title": "Twitter title",
    "description": "Twitter description",
    "images": ["${heroImage}"]
  },
  "jsonLd": {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": "${listing.address}",
    "description": "Property description",
    "url": "https://app.aerialshots.media/property/${listing.id}",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "${listing.address}",
      "addressLocality": "${listing.city}",
      "addressRegion": "${listing.state}",
      "postalCode": "${listing.zip || ''}"
    },
    "numberOfRooms": ${listing.beds || 0},
    "numberOfBathroomsTotal": ${listing.baths || 0},
    "floorSize": {
      "@type": "QuantitativeValue",
      "value": ${listing.sqft || 0},
      "unitCode": "SQF"
    }${priceStr ? `,
    "offers": {
      "@type": "Offer",
      "price": "${listing.price}",
      "priceCurrency": "USD"
    }` : ''}${heroImage ? `,
    "image": "${heroImage}"` : ''}
  }
}`
  } else if (pageType === 'agent') {
    const { agent, listingsCount, soldCount } = data

    prompt = `${SEO_META_PROMPT}

Page Type: Agent Portfolio
Agent Name: ${agent.name}
Bio: ${agent.bio || 'Professional real estate agent'}
Location: ${agent.city || 'Central Florida'}, ${agent.state || 'FL'}
Total Listings: ${listingsCount}
Sold Listings: ${soldCount}
Agent Photo: ${agent.headshot_url || ''}
Brokerage: ${agent.brokerage_name || 'Independent'}

Generate SEO meta tags optimized for this agent's portfolio page. Focus on credibility, expertise, and local market knowledge.

Return JSON in this exact format:
{
  "title": "Optimized title tag (50-60 chars)",
  "description": "Compelling meta description (150-160 chars)",
  "openGraph": {
    "title": "OG title",
    "description": "OG description",
    "images": [{"url": "${agent.headshot_url || ''}", "width": 1200, "height": 630}],
    "type": "profile",
    "url": "https://app.aerialshots.media/agents/${agent.slug}"
  },
  "twitter": {
    "card": "summary",
    "title": "Twitter title",
    "description": "Twitter description"
  },
  "jsonLd": {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": "${agent.name}",
    "description": "${agent.bio || 'Professional real estate agent'}",
    "url": "https://app.aerialshots.media/agents/${agent.slug}",
    "email": "${agent.email || ''}",
    "telephone": "${agent.phone || ''}"${agent.headshot_url ? `,
    "image": "${agent.headshot_url}"` : ''}
  }
}`
  }

  try {
    const aiResponse = await generateWithAI({
      prompt,
      maxTokens: config.maxTokens || 1500,
      temperature: config.temperature || 0.5,
    })

    // Parse AI response - extract JSON from response
    const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response as JSON')
    }

    const seoMeta = JSON.parse(jsonMatch[0]) as SEOMetaOutput

    return {
      ...seoMeta,
      tokensUsed: aiResponse.tokensUsed,
    } as any
  } catch (error) {
    console.error('Error generating SEO meta with AI:', error)
    // Fallback to basic meta tags
    return generateFallbackMeta(pageType, data)
  }
}

/**
 * Generate fallback meta tags if AI fails
 */
function generateFallbackMeta(
  pageType: 'property' | 'agent' | 'listing',
  data: any
): SEOMetaOutput {
  if (pageType === 'property') {
    const { listing, agent, media_assets } = data
    const priceStr = listing.price ? ` | $${listing.price.toLocaleString()}` : ''
    const bedsStr = listing.beds ? `${listing.beds} bed` : ''
    const bathsStr = listing.baths ? `${listing.baths} bath` : ''
    const sqftStr = listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : ''
    const features = [bedsStr, bathsStr, sqftStr].filter(Boolean).join(' | ')
    const heroImage = media_assets?.find((m: any) => m.type === 'photo')?.aryeo_url || ''

    return {
      title: `${listing.address}${priceStr} | ${listing.city || 'Florida'}`,
      description: `${features}. View photos, virtual tour, and neighborhood info for this beautiful property at ${listing.address}.`,
      openGraph: {
        title: listing.address,
        description: `${features}${priceStr}`,
        type: 'website',
        images: heroImage ? [{ url: heroImage, width: 1200, height: 630 }] : [],
        url: `https://app.aerialshots.media/property/${listing.id}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: listing.address,
        description: `${features}${priceStr}`,
        images: heroImage ? [heroImage] : [],
      },
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: listing.address,
        description: listing.description || `${features} property`,
        url: `https://app.aerialshots.media/property/${listing.id}`,
        address: {
          '@type': 'PostalAddress',
          streetAddress: listing.address,
          addressLocality: listing.city,
          addressRegion: listing.state,
          postalCode: listing.zip || '',
        },
      },
    }
  } else {
    const { agent } = data
    return {
      title: `${agent.name} | Real Estate Agent Portfolio`,
      description: agent.bio || `View listings and contact ${agent.name}`,
      openGraph: {
        title: `${agent.name} - Real Estate Agent`,
        description: agent.bio || `Professional real estate services`,
        type: 'profile',
        images: agent.headshot_url ? [{ url: agent.headshot_url, width: 1200, height: 630 }] : [],
        url: `https://app.aerialshots.media/agents/${agent.slug}`,
      },
      twitter: {
        card: 'summary',
        title: agent.name,
        description: agent.bio || 'Real Estate Agent',
      },
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'RealEstateAgent',
        name: agent.name,
        description: agent.bio || 'Professional real estate agent',
      },
    }
  }
}

/**
 * Main agent execution function
 */
async function execute(
  context: AgentExecutionContext
): Promise<AgentExecutionResult> {
  const { input, config } = context

  try {
    const seoInput = input as unknown as SEOMetaInput

    if (!seoInput.pageType || !seoInput.entityId) {
      return {
        success: false,
        error: 'Missing required fields: pageType and entityId',
        errorCode: 'INVALID_INPUT',
      }
    }

    let data: any
    let tokensUsed = 0

    // Fetch data based on page type
    if (seoInput.pageType === 'property' || seoInput.pageType === 'listing') {
      data = await fetchPropertyData(seoInput.entityId)
    } else if (seoInput.pageType === 'agent') {
      data = await fetchAgentData(seoInput.entityId)
    } else {
      return {
        success: false,
        error: `Invalid page type: ${seoInput.pageType}`,
        errorCode: 'INVALID_PAGE_TYPE',
      }
    }

    // Generate SEO meta tags
    const seoMeta: any = await generateSEOMeta(seoInput.pageType, data, config)
    tokensUsed = seoMeta.tokensUsed || 0
    delete seoMeta.tokensUsed

    // Log the generated meta tags
    console.log('=== SEO META GENERATED ===')
    console.log('Page Type:', seoInput.pageType)
    console.log('Entity ID:', seoInput.entityId)
    console.log('Title:', seoMeta.title)
    console.log('Description:', seoMeta.description)
    console.log('==========================\n')

    return {
      success: true,
      output: {
        pageType: seoInput.pageType,
        entityId: seoInput.entityId,
        meta: seoMeta,
      },
      tokensUsed,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SEO generation failed',
      errorCode: 'SEO_GENERATION_ERROR',
    }
  }
}

// Register the agent
registerAgent({
  slug: 'seo-meta',
  name: 'SEO Meta Generator',
  description: 'Generates SEO-optimized meta tags for property and portfolio pages',
  category: 'lifestyle',
  executionMode: 'sync',
  systemPrompt: SEO_META_PROMPT,
  config: {
    maxTokens: 1500,
    temperature: 0.5,
  },
  execute,
})
