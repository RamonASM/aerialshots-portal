# Portfolio Stats Agent

Calculate comprehensive portfolio statistics for agent pages at `/agents/[slug]`.

## Purpose

The Portfolio Stats Agent analyzes an agent's listing history to provide:
- Performance metrics (total volume, average DOM, listing counts)
- Market insights (top neighborhoods, property types)
- AI-generated portfolio summary for public-facing pages

This data powers the portfolio page stats bar and demonstrates an agent's track record to potential clients.

## Features

### Statistics Calculated

**Volume Metrics:**
- Total sales volume (sum of all sold prices)
- Average list price
- Average sold price
- Price range (min/max)

**Performance Metrics:**
- Average days on market (DOM)
- Quick wins (listings sold in < 14 days)
- Quick win rate (% of sales under 14 days)

**Listing Breakdown:**
- Total listings photographed
- Active listings count
- Sold listings count
- Pending listings count

**Market Insights:**
- Top 5 neighborhoods by listing count
- Property type distribution (inferred from beds)
- Average property specs (beds, baths, sqft)

**AI Summary:**
- 2-3 paragraph compelling narrative about the agent's portfolio
- Data-driven insights highlighting expertise and performance
- Professional tone suitable for public portfolio pages

## Usage

### Manual Execution

```typescript
import { executeAgent } from '@/lib/agents'

const result = await executeAgent({
  agentSlug: 'portfolio-stats',
  triggerSource: 'manual',
  input: {
    agent_slug: 'jane-smith',
    include_summary: true
  }
})
```

### In Portfolio Page

```typescript
// src/app/agents/[agentSlug]/page.tsx
import { executeAgent } from '@/lib/agents'

export default async function AgentPortfolioPage({ params }) {
  const { agentSlug } = await params

  // Get portfolio stats
  const statsResult = await executeAgent({
    agentSlug: 'portfolio-stats',
    triggerSource: 'manual',
    input: {
      agent_slug: agentSlug,
      include_summary: true
    }
  })

  if (statsResult.success) {
    const { stats, portfolioSummary } = statsResult.output
    // Use stats to display on the page
  }
}
```

## Input Schema

```typescript
interface PortfolioStatsInput {
  agent_id?: string          // Agent UUID (optional if agent_slug provided)
  agent_slug?: string        // Agent slug (optional if agent_id provided)
  include_summary?: boolean  // Generate AI summary? Default: true
}
```

**Note:** Either `agent_id` OR `agent_slug` is required.

## Output Schema

```typescript
interface PortfolioStatsOutput {
  agentSlug: string
  agentName: string
  agentEmail: string
  stats: {
    totalListings: number
    activeListings: number
    soldListings: number
    pendingListings: number
    totalVolume: number
    avgListPrice: number
    avgSoldPrice: number
    avgDaysOnMarket: number
    priceRange: { min: number; max: number }
    soldPriceRange?: { min: number; max: number }
    topNeighborhoods: string[]
    propertyTypes: { [type: string]: number }
    quickWins: number
    avgBedsPerListing: number
    avgBathsPerListing: number
    avgSqftPerListing: number
  }
  portfolioSummary: string  // AI-generated narrative
  lastUpdated: string       // ISO timestamp
  breakdown: {
    byStatus: { active: number; sold: number; pending: number }
    byNeighborhood: { [neighborhood: string]: number }
    byPropertyType: { [type: string]: number }
    performance: {
      quickWins: number
      quickWinRate: number  // Percentage
      avgDOM: number
      totalVolume: number
      avgSoldPrice: number
    }
  }
}
```

## Example Output

```json
{
  "agentSlug": "jane-smith",
  "agentName": "Jane Smith",
  "agentEmail": "jane@example.com",
  "stats": {
    "totalListings": 47,
    "activeListings": 5,
    "soldListings": 38,
    "pendingListings": 4,
    "totalVolume": 18500000,
    "avgListPrice": 425000,
    "avgSoldPrice": 487000,
    "avgDaysOnMarket": 12,
    "priceRange": { "min": 275000, "max": 1200000 },
    "soldPriceRange": { "min": 285000, "max": 1150000 },
    "topNeighborhoods": ["Cherry Creek", "Highlands", "RiNo", "LoHi", "Capitol Hill"],
    "propertyTypes": {
      "Single Family": 32,
      "Condo/Apartment": 10,
      "Condo/Townhouse": 5
    },
    "quickWins": 15,
    "avgBedsPerListing": 3.2,
    "avgBathsPerListing": 2.5,
    "avgSqftPerListing": 2150
  },
  "portfolioSummary": "Jane Smith has an impressive portfolio of 47 professionally photographed listings, with 38 successful sales totaling $18.5M in volume. Her average days on market of just 12 days and 15 quick sales (under 14 days) demonstrate exceptional market expertise, particularly in Denver's Cherry Creek, Highlands, and RiNo neighborhoods. With a strong track record selling properties ranging from $275,000 to $1.2M, Jane specializes in single-family homes averaging 3.2 bedrooms and 2,150 square feet, positioning her as a trusted expert for buyers and sellers across diverse price points.",
  "lastUpdated": "2024-12-21T21:00:00.000Z",
  "breakdown": {
    "byStatus": { "active": 5, "sold": 38, "pending": 4 },
    "byNeighborhood": {
      "Cherry Creek": 12,
      "Highlands": 10,
      "RiNo": 8,
      "LoHi": 9,
      "Capitol Hill": 8
    },
    "byPropertyType": {
      "Single Family": 32,
      "Condo/Apartment": 10,
      "Condo/Townhouse": 5
    },
    "performance": {
      "quickWins": 15,
      "quickWinRate": 39,
      "avgDOM": 12,
      "totalVolume": 18500000,
      "avgSoldPrice": 487000
    }
  }
}
```

## Technical Details

### Property Type Inference

Since property type is not explicitly stored, it's inferred from bedroom count:
- 1 bed → "Condo/Apartment"
- 2 beds → "Condo/Townhouse"
- 3 beds → "Single Family"
- 4+ beds → "Large Home"

### Neighborhood Data

Uses the `city` field from listings table as neighborhood identifier.

### Quick Win Definition

Listings with `dom < 14` (sold in under 14 days).

### AI Summary Generation

- Uses Claude Haiku via `generateWithAI()`
- Fallback to template-based summary if AI fails
- ~500 tokens per generation
- Professional tone optimized for public portfolio pages

## Performance

- **Execution Mode:** Sync (immediate response)
- **Typical Duration:** 2-5 seconds (with AI summary)
- **Token Usage:** ~500 tokens per execution (AI summary only)
- **Database Queries:** 2 (agent lookup + listings fetch)

## Caching Recommendations

For production use, consider caching the results:

```typescript
// Cache in Redis or similar
const cacheKey = `portfolio_stats:${agentSlug}`
const cached = await redis.get(cacheKey)

if (cached) {
  return JSON.parse(cached)
}

const result = await executeAgent({ /* ... */ })

if (result.success) {
  // Cache for 24 hours
  await redis.setex(cacheKey, 86400, JSON.stringify(result.output))
}
```

Or use Next.js revalidation:

```typescript
// In page.tsx
export const revalidate = 3600 // Revalidate every hour
```

## Integration Points

### Portfolio Page Display

```tsx
// Example: Stats bar component
<div className="grid grid-cols-4 gap-6">
  <StatCard
    label="Total Listings"
    value={stats.totalListings}
  />
  <StatCard
    label="Sold"
    value={stats.soldListings}
  />
  <StatCard
    label="Avg Days on Market"
    value={stats.avgDaysOnMarket}
  />
  <StatCard
    label="Total Volume"
    value={`$${(stats.totalVolume / 1000000).toFixed(1)}M`}
  />
</div>

<p className="mt-8 text-neutral-600">
  {portfolioSummary}
</p>
```

### API Endpoint

Create a dedicated endpoint for frontend consumption:

```typescript
// src/app/api/agents/[slug]/stats/route.ts
import { executeAgent } from '@/lib/agents'

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const result = await executeAgent({
    agentSlug: 'portfolio-stats',
    triggerSource: 'api',
    input: {
      agent_slug: params.slug,
      include_summary: true
    }
  })

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 })
  }

  return Response.json(result.output)
}
```

## Future Enhancements

- [ ] Year-over-year growth metrics
- [ ] Market share in specific neighborhoods
- [ ] Price trend analysis (listing vs. sold price ratios)
- [ ] Seasonal performance patterns
- [ ] Comparison to market averages
- [ ] Client testimonial integration
- [ ] Social proof metrics (reviews, ratings)
- [ ] Time-series data for performance charts

## Error Handling

The agent handles these error cases:

1. **Missing Agent Identifier** (`MISSING_AGENT_IDENTIFIER`)
   - Neither agent_id nor agent_slug provided

2. **Agent Not Found** (`AGENT_NOT_FOUND`)
   - Invalid agent_id or agent_slug

3. **Listings Fetch Failed** (`LISTINGS_FETCH_FAILED`)
   - Database query error

4. **Execution Error** (`EXECUTION_ERROR`)
   - Unexpected runtime error

Empty portfolios (0 listings) return successfully with zero stats and a placeholder summary.

## Testing

```typescript
// Example test
import { executeAgent } from '@/lib/agents'

describe('Portfolio Stats Agent', () => {
  it('should calculate stats for agent with listings', async () => {
    const result = await executeAgent({
      agentSlug: 'portfolio-stats',
      triggerSource: 'manual',
      input: {
        agent_slug: 'test-agent',
        include_summary: true
      }
    })

    expect(result.success).toBe(true)
    expect(result.output.stats.totalListings).toBeGreaterThan(0)
    expect(result.output.portfolioSummary).toBeTruthy()
  })
})
```

## Related Agents

- **care-task-generator:** Uses order count (similar to listing count)
- Future: **market-insights:** Could build on this for comparative analysis
- Future: **agent-ranking:** Could use these metrics for leaderboards
