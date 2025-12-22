# Neighborhood Data Agent

**Category:** Lifestyle
**Execution Mode:** Async
**Domain:** portal.aerialshots.media

## Purpose

The Neighborhood Data Agent aggregates comprehensive neighborhood information to power lifestyle pages with rich, localized content. It answers the question: "What's it like to live here?"

## What It Does

This agent fetches and synthesizes data from multiple sources to create a complete neighborhood profile:

1. **Google Places API** - Nearby amenities across 6 categories:
   - Dining (restaurants, cafes, bakeries)
   - Shopping (malls, grocery stores, retail)
   - Fitness (gyms, parks, spas)
   - Entertainment (theaters, nightlife)
   - Services (banks, hospitals, pharmacies)
   - Education (schools, universities, libraries)

2. **Ticketmaster API** - Upcoming events within 10 miles:
   - Concerts, sports, theater, festivals
   - Venue information and pricing
   - Next 30 days of events

3. **Walk Score API** - Walkability metrics:
   - Walk Score (0-100)
   - Transit Score (if available)
   - Bike Score (if available)
   - Descriptive categories (e.g., "Very Walkable")

4. **AI-Generated Summary** - Narrative description:
   - 2-3 paragraph lifestyle narrative
   - Highlights top amenities by name
   - Incorporates walkability data
   - References upcoming events
   - Warm, engaging tone for buyers

## Input

The agent accepts either a listing ID or coordinates:

### Option 1: Using Listing ID
```typescript
{
  listing_id: "uuid-of-listing"
}
```

### Option 2: Using Coordinates
```typescript
{
  lat: 28.5383,
  lng: -81.3792,
  address: "123 Main St, Orlando, FL 32801",
  city: "Orlando",
  state: "FL"
}
```

## Output

```typescript
{
  walkScore: 78,
  walkScoreDescription: "Very Walkable",
  transitScore: 65,
  transitScoreDescription: "Excellent Transit",
  bikeScore: 72,
  bikeScoreDescription: "Very Bikeable",
  nearbyPlaces: {
    dining: [
      {
        place_id: "ChIJ...",
        name: "The Rustic Table",
        vicinity: "456 Park Ave",
        rating: 4.5,
        user_ratings_total: 234,
        types: ["restaurant"],
        distance: 0.3,
        price_level: 2
      }
      // ... more places
    ],
    shopping: [...],
    fitness: [...],
    entertainment: [...],
    services: [...],
    education: [...]
  },
  upcomingEvents: [
    {
      id: "vv123",
      name: "Orlando Magic vs Heat",
      url: "https://ticketmaster.com/...",
      imageUrl: "https://...",
      date: "Fri, Dec 22",
      time: "7:00 PM",
      venue: "Amway Center",
      city: "Orlando",
      category: "Sports",
      genre: "Basketball",
      priceRange: "$45 - $350",
      distance: 2.1
    }
    // ... more events
  ],
  neighborhoodSummary: "Living in this vibrant neighborhood means being steps away from award-winning dining at The Rustic Table, boutique shopping along Park Avenue, and lush green spaces perfect for weekend strolls. With a Walk Score of 78, daily errands are a breeze, and the area's excellent transit options (Transit Score: 65) make commuting hassle-free.\n\nThe community comes alive with events like the upcoming Orlando Magic game at Amway Center and live music at The Beacham. Families will appreciate top-rated schools within walking distance and numerous parks where neighbors gather for farmer's markets and outdoor yoga...",
  researchedAt: "2024-12-21T21:30:00.000Z"
}
```

## Data Storage

If a `listing_id` is provided, the agent automatically stores the results in the `listing_campaigns` table under the `neighborhood_data` column. This allows the data to be:

- Cached for future use
- Associated with marketing campaigns
- Referenced in carousel generation
- Used for personalized question generation

## Environment Variables

The agent requires the following API keys:

```bash
GOOGLE_PLACES_API_KEY=your_key_here
TICKETMASTER_API_KEY=your_key_here
WALKSCORE_API_KEY=your_key_here          # Optional but recommended
ANTHROPIC_API_KEY=your_key_here           # For AI summary generation
```

**Note:** If Walk Score API is not configured, the agent will still function but won't include walkability metrics.

## Usage Examples

### Manual Execution

```typescript
import { executeAgent } from '@/lib/agents'

const result = await executeAgent({
  agentSlug: 'neighborhood-data',
  triggerSource: 'manual',
  input: {
    listing_id: '123e4567-e89b-12d3-a456-426614174000'
  }
})

console.log(result.output.neighborhoodSummary)
console.log(result.output.nearbyPlaces.dining)
```

### API Endpoint

```typescript
// pages/api/listings/[id]/neighborhood.ts
import { executeAgent } from '@/lib/agents'

export default async function handler(req, res) {
  const { id } = req.query

  const result = await executeAgent({
    agentSlug: 'neighborhood-data',
    triggerSource: 'api',
    input: { listing_id: id }
  })

  if (result.success) {
    res.json(result.output)
  } else {
    res.status(500).json({ error: result.error })
  }
}
```

### Workflow Integration

```typescript
import { registerWorkflow } from '@/lib/agents'

registerWorkflow({
  name: 'listing-campaign-complete',
  trigger: 'listing.created',
  steps: [
    {
      agentSlug: 'neighborhood-data',
      inputMapper: (ctx) => ({
        listing_id: ctx.listingId
      })
    },
    {
      agentSlug: 'question-generator',
      inputMapper: (ctx) => ({
        listing_id: ctx.listingId,
        neighborhood_data: ctx.stepResults['neighborhood-data'].output
      })
    }
  ]
})
```

## Performance

- **Execution Time:** 5-15 seconds (async)
- **API Calls:** 8-12 external API calls (run in parallel)
- **Token Usage:** ~300-600 tokens for AI summary
- **Rate Limits:**
  - Google Places: 1,000 requests/day (free tier)
  - Ticketmaster: 5,000 requests/day
  - Walk Score: 5,000 requests/day

## Error Handling

The agent is designed to be resilient:

- If Google Places fails, returns empty arrays for place categories
- If Ticketmaster fails, returns empty events array
- If Walk Score fails, omits walkability metrics
- If AI summary fails, uses fallback template
- Never fails completely - always returns best available data

## Integration Points

This agent is designed to integrate with:

1. **ListingLaunch System** - Provides neighborhood data for:
   - Personalized question generation
   - Carousel content creation
   - Blog post research

2. **Property Pages** - Powers `/property/[id]` lifestyle section

3. **Marketing Campaigns** - Stored in `listing_campaigns.neighborhood_data`

4. **Agent Dashboards** - Displays neighborhood insights to agents

## Best Practices

1. **Cache Results:** Data is automatically cached in the database when using `listing_id`
2. **Rate Limiting:** Consider implementing request throttling for high-volume usage
3. **Refresh Frequency:** Events change weekly, places monthly - refresh accordingly
4. **Error Monitoring:** Track API failures to ensure data quality
5. **Cost Management:** Monitor API usage across all three services

## Future Enhancements

Potential improvements:
- Add Yelp API for more detailed restaurant data
- Include school ratings from GreatSchools API
- Add crime statistics from local APIs
- Include real estate market trends
- Add weather/climate data
- Support multiple languages for summaries

## Related Agents

- `question-generator` - Uses this data to create personalized questions
- `carousel-generator` - Uses this data to create neighborhood carousel content
- `blog-generator` - Incorporates neighborhood data into blog posts
