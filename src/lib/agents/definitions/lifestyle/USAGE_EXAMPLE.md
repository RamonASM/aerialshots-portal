# Portfolio Stats Agent - Usage Examples

## Integration into Portfolio Page

Here's how to integrate the portfolio-stats agent into the existing `/agents/[agentSlug]/page.tsx`:

### Option 1: Direct Integration (Recommended for MVP)

```typescript
// src/app/agents/[agentSlug]/page.tsx
import { executeAgent } from '@/lib/agents'

export default async function AgentPortfolioPage({ params }: PageProps) {
  const { agentSlug } = await params
  const supabase = createAdminClient()

  // Get agent
  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('slug', agentSlug)
    .single()

  if (error || !agent) {
    notFound()
  }

  // NEW: Get enhanced portfolio stats using the agent
  const portfolioStatsResult = await executeAgent({
    agentSlug: 'portfolio-stats',
    triggerSource: 'manual',
    input: {
      agent_id: agent.id,
      include_summary: true
    }
  })

  const portfolioData = portfolioStatsResult.success
    ? portfolioStatsResult.output
    : null

  // Get listings (existing code)
  const { data: listingsData } = await supabase
    .from('listings')
    .select('*')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })

  // ... rest of existing code ...

  return (
    <div className="min-h-screen bg-white">
      {/* Header - existing */}
      <header>...</header>

      {/* Enhanced Stats Bar */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-neutral-900">
                {portfolioData?.stats.totalListings || listings?.length || 0}
              </p>
              <p className="text-sm text-neutral-600">Total Listings</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-neutral-900">
                {portfolioData?.stats.soldListings || soldListings.length}
              </p>
              <p className="text-sm text-neutral-600">Sold</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-neutral-900">
                {portfolioData?.stats.avgDaysOnMarket || avgDOM || '-'}
              </p>
              <p className="text-sm text-neutral-600">Avg Days on Market</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-neutral-900">
                ${((portfolioData?.stats.totalVolume || totalSoldVolume) / 1000000).toFixed(1)}M
              </p>
              <p className="text-sm text-neutral-600">Total Volume</p>
            </div>
          </div>

          {/* NEW: Additional Stats Row */}
          {portfolioData && (
            <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4 border-t border-neutral-100 pt-6">
              <div className="text-center">
                <p className="text-xl font-bold text-neutral-900">
                  {portfolioData.stats.quickWins}
                </p>
                <p className="text-xs text-neutral-500">Quick Sales (&lt;14 days)</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-neutral-900">
                  ${(portfolioData.stats.avgSoldPrice / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-neutral-500">Avg Sale Price</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-neutral-900">
                  ${(portfolioData.stats.priceRange.min / 1000).toFixed(0)}K - ${(portfolioData.stats.priceRange.max / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-neutral-500">Price Range</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-neutral-900">
                  {portfolioData.breakdown.performance.quickWinRate}%
                </p>
                <p className="text-xs text-neutral-500">Quick Win Rate</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NEW: AI-Generated Portfolio Summary */}
      {portfolioData?.portfolioSummary && (
        <div className="bg-neutral-50 border-b border-neutral-200">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <h2 className="text-lg font-semibold text-neutral-900 mb-3">
              Portfolio Highlights
            </h2>
            <p className="text-neutral-700 leading-relaxed">
              {portfolioData.portfolioSummary}
            </p>
          </div>
        </div>
      )}

      {/* NEW: Market Expertise Section */}
      {portfolioData && (
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-neutral-900 mb-4">
            Market Expertise
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Top Neighborhoods */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <h3 className="font-semibold text-neutral-900 mb-3">
                Top Neighborhoods
              </h3>
              <ul className="space-y-2">
                {portfolioData.stats.topNeighborhoods.slice(0, 5).map((neighborhood) => (
                  <li key={neighborhood} className="flex items-center justify-between">
                    <span className="text-neutral-700">{neighborhood}</span>
                    <span className="text-sm font-medium text-neutral-500">
                      {portfolioData.breakdown.byNeighborhood[neighborhood]} listings
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Property Types */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6">
              <h3 className="font-semibold text-neutral-900 mb-3">
                Property Types
              </h3>
              <ul className="space-y-2">
                {Object.entries(portfolioData.stats.propertyTypes)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <li key={type} className="flex items-center justify-between">
                      <span className="text-neutral-700">{type}</span>
                      <span className="text-sm font-medium text-neutral-500">
                        {count} listings
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Listings - existing code */}
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* ... existing listing sections ... */}
      </div>
    </div>
  )
}
```

### Option 2: API Endpoint + Client-Side Fetch

If you want to separate concerns or enable caching:

#### Step 1: Create API Route

```typescript
// src/app/api/agents/[slug]/stats/route.ts
import { executeAgent } from '@/lib/agents'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const result = await executeAgent({
      agentSlug: 'portfolio-stats',
      triggerSource: 'api',
      input: {
        agent_slug: params.slug,
        include_summary: true
      }
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(result.output, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

#### Step 2: Use in Page Component

```typescript
// src/app/agents/[agentSlug]/page.tsx
import { PortfolioStatsSection } from '@/components/agents/PortfolioStatsSection'

export default async function AgentPortfolioPage({ params }: PageProps) {
  const { agentSlug } = await params

  // Fetch stats from API
  const statsResponse = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/agents/${agentSlug}/stats`,
    { next: { revalidate: 3600 } } // Revalidate every hour
  )

  const portfolioStats = statsResponse.ok
    ? await statsResponse.json()
    : null

  return (
    <div>
      {/* ... */}
      {portfolioStats && (
        <PortfolioStatsSection stats={portfolioStats} />
      )}
      {/* ... */}
    </div>
  )
}
```

### Option 3: Scheduled Background Updates

For better performance, pre-calculate stats daily:

```typescript
// src/lib/cron/update-portfolio-stats.ts
import { executeAgent } from '@/lib/agents'
import { createAdminClient } from '@/lib/supabase/admin'

export async function updateAllPortfolioStats() {
  const supabase = createAdminClient()

  // Get all agents
  const { data: agents } = await supabase
    .from('agents')
    .select('id, slug')

  if (!agents) return

  // Update stats for each agent
  for (const agent of agents) {
    try {
      const result = await executeAgent({
        agentSlug: 'portfolio-stats',
        triggerSource: 'cron',
        input: {
          agent_id: agent.id,
          include_summary: true
        }
      })

      if (result.success) {
        // Store in cache or dedicated table
        await supabase
          .from('agent_portfolio_cache')
          .upsert({
            agent_id: agent.id,
            stats: result.output.stats,
            summary: result.output.portfolioSummary,
            breakdown: result.output.breakdown,
            updated_at: new Date().toISOString()
          })
      }
    } catch (error) {
      console.error(`Failed to update stats for ${agent.slug}:`, error)
    }
  }
}
```

Then add to your cron job (using Vercel Cron or similar):

```typescript
// src/app/api/cron/update-stats/route.ts
import { updateAllPortfolioStats } from '@/lib/cron/update-portfolio-stats'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  await updateAllPortfolioStats()

  return NextResponse.json({ success: true })
}
```

## Quick Start: Minimal Integration

For the fastest implementation, add just the AI summary to the existing page:

```typescript
// In src/app/agents/[agentSlug]/page.tsx
// After fetching agent and listings:

const portfolioStatsResult = await executeAgent({
  agentSlug: 'portfolio-stats',
  triggerSource: 'manual',
  input: { agent_id: agent.id, include_summary: true }
})

// Then in your JSX, after the stats bar:
{portfolioStatsResult.success && (
  <div className="mx-auto max-w-5xl px-4 py-6 bg-neutral-50">
    <p className="text-neutral-700 leading-relaxed">
      {portfolioStatsResult.output.portfolioSummary}
    </p>
  </div>
)}
```

## Testing the Agent

### Via Admin Panel

Once you've set up the admin panel (in progress), you can test from:
`https://portal.aerialshots.media/admin/agents`

### Via Code

```typescript
import { executeAgent } from '@/lib/agents'

// Test with a real agent
const result = await executeAgent({
  agentSlug: 'portfolio-stats',
  triggerSource: 'manual',
  input: {
    agent_slug: 'YOUR-AGENT-SLUG-HERE',
    include_summary: true
  }
})

console.log(JSON.stringify(result, null, 2))
```

### Expected Output

```json
{
  "success": true,
  "output": {
    "agentSlug": "jane-smith",
    "agentName": "Jane Smith",
    "stats": { /* ... */ },
    "portfolioSummary": "Jane Smith has...",
    "lastUpdated": "2024-12-21T21:00:00.000Z",
    "breakdown": { /* ... */ }
  },
  "error": null,
  "tokensUsed": 487
}
```

## Performance Optimization

### Caching Strategy

```typescript
// Use Next.js built-in caching
export const revalidate = 3600 // Revalidate every hour

// Or with Redis
import { redis } from '@/lib/redis'

async function getCachedPortfolioStats(agentId: string) {
  const cacheKey = `portfolio:${agentId}`
  const cached = await redis.get(cacheKey)

  if (cached) {
    return JSON.parse(cached)
  }

  const result = await executeAgent({
    agentSlug: 'portfolio-stats',
    triggerSource: 'manual',
    input: { agent_id: agentId, include_summary: true }
  })

  if (result.success) {
    await redis.setex(cacheKey, 3600, JSON.stringify(result.output))
  }

  return result.output
}
```

### Skip AI Summary for Speed

If you only need the stats (not the narrative):

```typescript
const result = await executeAgent({
  agentSlug: 'portfolio-stats',
  triggerSource: 'manual',
  input: {
    agent_id: agent.id,
    include_summary: false  // Skip AI generation
  }
})

// This will return stats only, ~2x faster
```

## Troubleshooting

### "Agent not found" error

Check that the agent_slug or agent_id is correct:

```typescript
const { data: agent } = await supabase
  .from('agents')
  .select('id, slug')
  .eq('slug', agentSlug)
  .single()

console.log('Agent:', agent) // Should not be null
```

### Empty stats returned

Agent has no listings. This is expected behavior. The agent returns zero values:

```json
{
  "stats": {
    "totalListings": 0,
    // ... all zeros
  },
  "portfolioSummary": "Jane Smith is building their portfolio..."
}
```

### AI summary is generic/poor quality

The AI uses Claude Haiku for speed. For better quality, you can:

1. Update the agent config to use a better model (in agent definition)
2. Improve the prompt (PORTFOLIO_SUMMARY_PROMPT constant)
3. Add more context to the prompt (recent wins, testimonials, etc.)

## Next Steps

1. Integrate into portfolio page (Option 1 recommended for MVP)
2. Test with real agent data
3. Style the new sections to match your design
4. Consider adding charts/graphs for visual appeal
5. Set up caching for production performance
