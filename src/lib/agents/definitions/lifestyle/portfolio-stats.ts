// Portfolio Stats Agent
// Calculate agent portfolio statistics for their portfolio page

import { registerAgent } from '../../registry'
import { generateWithAI } from '@/lib/ai/client'
import type { AgentExecutionContext, AgentExecutionResult } from '../../types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

interface PortfolioStatsInput {
  agent_id?: string
  agent_slug?: string
  include_summary?: boolean
}

interface PropertyTypeCount {
  [key: string]: number
}

interface NeighborhoodCount {
  neighborhood: string
  count: number
}

interface PortfolioStats {
  totalListings: number
  activeListings: number
  soldListings: number
  pendingListings: number
  totalVolume: number
  avgListPrice: number
  avgSoldPrice: number
  avgDaysOnMarket: number
  priceRange: {
    min: number
    max: number
  }
  soldPriceRange?: {
    min: number
    max: number
  }
  topNeighborhoods: string[]
  propertyTypes: PropertyTypeCount
  quickWins: number // Sold in < 14 days
  avgBedsPerListing: number
  avgBathsPerListing: number
  avgSqftPerListing: number
}

const PORTFOLIO_SUMMARY_PROMPT = `You are a real estate marketing expert analyzing an agent's portfolio performance.

Generate a compelling 2-3 paragraph summary that highlights:
1. Overall performance metrics (volume, sales speed, property types)
2. Market expertise and specialties
3. Value proposition for potential clients

Make it engaging, professional, and data-driven. Focus on what makes this agent's track record valuable.
Keep it concise but impactful - this will be shown on their public portfolio page.

Respond with ONLY the summary text, no JSON or formatting.`

/**
 * Calculate comprehensive portfolio statistics
 */
function calculateStats(listings: Array<{
  id: string
  status: string
  price: number | null
  sold_price: number | null
  sold_date: string | null
  dom: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
  city: string | null
  address: string
}>): PortfolioStats {
  const active = listings.filter(l => l.status === 'active')
  const sold = listings.filter(l => l.status === 'sold')
  const pending = listings.filter(l => l.status === 'pending')

  // Price calculations
  const allPrices = listings.map(l => l.price || 0).filter(p => p > 0)
  const soldPrices = sold.map(l => l.sold_price || l.price || 0).filter(p => p > 0)

  const totalVolume = soldPrices.reduce((sum, price) => sum + price, 0)
  const avgListPrice = allPrices.length > 0
    ? Math.round(allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length)
    : 0
  const avgSoldPrice = soldPrices.length > 0
    ? Math.round(soldPrices.reduce((sum, p) => sum + p, 0) / soldPrices.length)
    : 0

  // Price ranges
  const priceRange = allPrices.length > 0
    ? { min: Math.min(...allPrices), max: Math.max(...allPrices) }
    : { min: 0, max: 0 }

  const soldPriceRange = soldPrices.length > 0
    ? { min: Math.min(...soldPrices), max: Math.max(...soldPrices) }
    : undefined

  // Days on market
  const domValues = sold.map(l => l.dom || 0).filter(d => d > 0)
  const avgDaysOnMarket = domValues.length > 0
    ? Math.round(domValues.reduce((sum, d) => sum + d, 0) / domValues.length)
    : 0

  // Quick wins (sold in < 14 days)
  const quickWins = sold.filter(l => l.dom && l.dom < 14).length

  // Property type distribution (inferred from beds)
  const propertyTypes: PropertyTypeCount = {}
  listings.forEach(l => {
    if (!l.beds) {
      propertyTypes['Unknown'] = (propertyTypes['Unknown'] || 0) + 1
      return
    }

    let type: string
    if (l.beds === 1) type = 'Condo/Apartment'
    else if (l.beds === 2) type = 'Condo/Townhouse'
    else if (l.beds === 3) type = 'Single Family'
    else if (l.beds >= 4) type = 'Large Home'
    else type = 'Other'

    propertyTypes[type] = (propertyTypes[type] || 0) + 1
  })

  // Top neighborhoods (from city field)
  const neighborhoodCounts: { [key: string]: number } = {}
  listings.forEach(l => {
    const neighborhood = l.city || 'Unknown'
    neighborhoodCounts[neighborhood] = (neighborhoodCounts[neighborhood] || 0) + 1
  })

  const topNeighborhoods = Object.entries(neighborhoodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name)

  // Average property specs
  const bedsValues = listings.map(l => l.beds || 0).filter(b => b > 0)
  const bathsValues = listings.map(l => l.baths || 0).filter(b => b > 0)
  const sqftValues = listings.map(l => l.sqft || 0).filter(s => s > 0)

  const avgBedsPerListing = bedsValues.length > 0
    ? Math.round((bedsValues.reduce((sum, b) => sum + b, 0) / bedsValues.length) * 10) / 10
    : 0
  const avgBathsPerListing = bathsValues.length > 0
    ? Math.round((bathsValues.reduce((sum, b) => sum + b, 0) / bathsValues.length) * 10) / 10
    : 0
  const avgSqftPerListing = sqftValues.length > 0
    ? Math.round(sqftValues.reduce((sum, s) => sum + s, 0) / sqftValues.length)
    : 0

  return {
    totalListings: listings.length,
    activeListings: active.length,
    soldListings: sold.length,
    pendingListings: pending.length,
    totalVolume,
    avgListPrice,
    avgSoldPrice,
    avgDaysOnMarket,
    priceRange,
    soldPriceRange,
    topNeighborhoods,
    propertyTypes,
    quickWins,
    avgBedsPerListing,
    avgBathsPerListing,
    avgSqftPerListing,
  }
}

/**
 * Generate AI summary of portfolio performance
 */
async function generatePortfolioSummary(
  stats: PortfolioStats,
  agentName: string
): Promise<{ summary: string; tokensUsed: number }> {
  const topPropertyType = Object.entries(stats.propertyTypes)
    .sort((a, b) => b[1] - a[1])[0]

  const prompt = `${PORTFOLIO_SUMMARY_PROMPT}

Agent: ${agentName}

Portfolio Statistics:
- Total Listings Photographed: ${stats.totalListings}
- Sold Listings: ${stats.soldListings} (${stats.quickWins} sold in under 14 days)
- Total Sales Volume: $${(stats.totalVolume / 1000000).toFixed(2)}M
- Average Days on Market: ${stats.avgDaysOnMarket} days
- Average Sale Price: $${stats.avgSoldPrice.toLocaleString()}
- Price Range: $${stats.priceRange.min.toLocaleString()} - $${stats.priceRange.max.toLocaleString()}
- Top Areas: ${stats.topNeighborhoods.slice(0, 3).join(', ')}
- Primary Property Type: ${topPropertyType?.[0] || 'Various'} (${topPropertyType?.[1] || 0} listings)
- Average Property: ${stats.avgBedsPerListing} bed, ${stats.avgBathsPerListing} bath, ${stats.avgSqftPerListing.toLocaleString()} sqft

Generate a compelling portfolio summary that positions ${agentName} as an expert in their market.`

  try {
    const response = await generateWithAI({
      prompt,
      maxTokens: 500,
      temperature: 0.7,
    })

    return { summary: response.content.trim(), tokensUsed: response.tokensUsed }
  } catch (error) {
    console.error('Failed to generate portfolio summary:', error)
    // Return a fallback summary
    return { summary: generateFallbackSummary(stats, agentName), tokensUsed: 0 }
  }
}

/**
 * Generate fallback summary if AI fails
 */
function generateFallbackSummary(stats: PortfolioStats, agentName: string): string {
  const volumeInMil = (stats.totalVolume / 1000000).toFixed(1)
  const topArea = stats.topNeighborhoods[0] || 'the area'

  return `${agentName} has an impressive portfolio of ${stats.totalListings} professionally photographed listings, with ${stats.soldListings} successful sales totaling $${volumeInMil}M in volume. With an average days on market of just ${stats.avgDaysOnMarket} days and ${stats.quickWins} quick sales (under 14 days), this track record demonstrates strong market expertise in ${topArea} and surrounding areas. Properties range from $${stats.priceRange.min.toLocaleString()} to $${stats.priceRange.max.toLocaleString()}, showcasing versatility across different price points and property types.`
}

/**
 * Main agent execution function
 */
async function execute(
  context: AgentExecutionContext
): Promise<AgentExecutionResult> {
  const { input, supabase } = context
  const portfolioInput = input as unknown as PortfolioStatsInput

  if (!portfolioInput.agent_id && !portfolioInput.agent_slug) {
    return {
      success: false,
      error: 'Either agent_id or agent_slug is required',
      errorCode: 'MISSING_AGENT_IDENTIFIER',
    }
  }

  try {
    const db = supabase as SupabaseClient<Database>

    // 1. Fetch agent details
    let agentQuery = db.from('agents').select('id, name, slug, email')

    if (portfolioInput.agent_id) {
      agentQuery = agentQuery.eq('id', portfolioInput.agent_id)
    } else if (portfolioInput.agent_slug) {
      agentQuery = agentQuery.eq('slug', portfolioInput.agent_slug)
    }

    const { data: agent, error: agentError } = await agentQuery.single()

    if (agentError || !agent) {
      return {
        success: false,
        error: `Agent not found: ${portfolioInput.agent_id || portfolioInput.agent_slug}`,
        errorCode: 'AGENT_NOT_FOUND',
      }
    }

    // 2. Fetch all listings for this agent
    const { data: listings, error: listingsError } = await db
      .from('listings')
      .select('id, status, price, sold_price, sold_date, dom, beds, baths, sqft, city, address')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })

    if (listingsError) {
      return {
        success: false,
        error: `Failed to fetch listings: ${listingsError.message}`,
        errorCode: 'LISTINGS_FETCH_FAILED',
      }
    }

    if (!listings || listings.length === 0) {
      // Return empty stats for agents with no listings
      return {
        success: true,
        output: {
          agentSlug: agent.slug,
          agentName: agent.name,
          stats: {
            totalListings: 0,
            activeListings: 0,
            soldListings: 0,
            pendingListings: 0,
            totalVolume: 0,
            avgListPrice: 0,
            avgSoldPrice: 0,
            avgDaysOnMarket: 0,
            priceRange: { min: 0, max: 0 },
            topNeighborhoods: [],
            propertyTypes: {},
            quickWins: 0,
            avgBedsPerListing: 0,
            avgBathsPerListing: 0,
            avgSqftPerListing: 0,
          },
          portfolioSummary: `${agent.name} is building their portfolio. Check back soon for listings and performance metrics.`,
          lastUpdated: new Date().toISOString(),
        },
        tokensUsed: 0,
      }
    }

    // 3. Calculate statistics
    const stats = calculateStats(listings)

    // 4. Generate AI summary (optional)
    let portfolioSummary = ''
    let tokensUsed = 0

    if (portfolioInput.include_summary !== false) {
      const summaryResult = await generatePortfolioSummary(stats, agent.name)
      portfolioSummary = summaryResult.summary
      tokensUsed = summaryResult.tokensUsed
    }

    // 5. Return complete portfolio data
    return {
      success: true,
      output: {
        agentSlug: agent.slug,
        agentName: agent.name,
        agentEmail: agent.email,
        stats,
        portfolioSummary,
        lastUpdated: new Date().toISOString(),
        breakdown: {
          byStatus: {
            active: stats.activeListings,
            sold: stats.soldListings,
            pending: stats.pendingListings,
          },
          byNeighborhood: stats.topNeighborhoods.reduce((acc, n) => {
            const count = listings.filter(l => l.city === n).length
            acc[n] = count
            return acc
          }, {} as { [key: string]: number }),
          byPropertyType: stats.propertyTypes,
          performance: {
            quickWins: stats.quickWins,
            quickWinRate: stats.soldListings > 0
              ? Math.round((stats.quickWins / stats.soldListings) * 100)
              : 0,
            avgDOM: stats.avgDaysOnMarket,
            totalVolume: stats.totalVolume,
            avgSoldPrice: stats.avgSoldPrice,
          },
        },
      },
      tokensUsed,
    }
  } catch (error) {
    console.error('Portfolio stats generator error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: 'EXECUTION_ERROR',
    }
  }
}

// Register the agent
registerAgent({
  slug: 'portfolio-stats',
  name: 'Portfolio Stats Generator',
  description:
    'Calculate comprehensive portfolio statistics for agent pages including total volume, average DOM, listing counts, top neighborhoods, and AI-generated performance summary.',
  category: 'lifestyle',
  executionMode: 'sync',
  systemPrompt: PORTFOLIO_SUMMARY_PROMPT,
  config: {
    maxTokens: 500,
    temperature: 0.7,
    timeout: 30000,
  },
  execute,
})
