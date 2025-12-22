# Neighborhood Data Agent - Quick Start Guide

## Setup

1. Add API keys to `.env`:
```bash
GOOGLE_PLACES_API_KEY=your_key
TICKETMASTER_API_KEY=your_key
WALKSCORE_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
```

2. Create database record:
```sql
INSERT INTO ai_agents (slug, name, description, category, is_active, execution_mode)
VALUES (
  'neighborhood-data',
  'Neighborhood Data',
  'Aggregates neighborhood data for lifestyle pages',
  'lifestyle',
  true,
  'async'
);
```

## Basic Usage

```typescript
import { executeAgent } from '@/lib/agents'

const result = await executeAgent({
  agentSlug: 'neighborhood-data',
  triggerSource: 'manual',
  input: { listing_id: 'your-listing-id' }
})

console.log(result.output.neighborhoodSummary)
```

## What You Get

- Walk Score + Transit Score + Bike Score
- 60+ nearby places (6 categories)
- 20 upcoming events
- AI-generated 2-3 paragraph summary
- Auto-cached in database

## More Info

- Full docs: `neighborhood-data.README.md`
- Examples: `neighborhood-data.example.ts`
- Tests: `__tests__/neighborhood-data.test.ts`
