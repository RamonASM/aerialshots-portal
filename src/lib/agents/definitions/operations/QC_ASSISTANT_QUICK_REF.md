# QC Assistant - Quick Reference

## Basic Usage

```typescript
import { executeAgent } from '@/lib/agents'

const result = await executeAgent({
  agentSlug: 'qc-assistant',
  triggerSource: 'manual',
  input: {
    listingId: 'listing-uuid',
    readyForQCAt: '2024-12-21T14:30:00Z',
    isVIPClient: true,
    deadline: '2024-12-21T18:00:00Z'
  }
})
```

## Priority Scores

| Score | Color | Meaning |
|-------|-------|---------|
| 80-100 | 🔴 Red | URGENT - Immediate attention |
| 50-79 | 🟡 Yellow | MODERATE - Address soon |
| 0-49 | 🟢 Green | STANDARD - Normal queue |

## Priority Factors

- **+50**: Rush order
- **+30**: Same-day deadline
- **+20**: VIP client
- **-10/hour**: Time waiting in queue (max -50)

## Output Structure

```typescript
{
  priorityScore: 85,
  priorityColor: 'red',
  flaggedIssues: [
    { type: 'lighting', severity: 'warning', description: '...' }
  ],
  recommendations: ['...'],
  estimatedQCTime: 15,
  missingShots: ['exterior'],
  photoQualityScore: 78
}
```

## Issue Types

- `lighting` - Exposure, shadows, color temp
- `composition` - Framing, horizons
- `missing` - Required shots not found
- `color` - Color balance issues
- `blur` - Focus problems
- `angle` - Distortion, verticals
- `clutter` - Staging issues

## Severity Levels

- `critical` - Major problems, may need re-shoot
- `warning` - Should fix before delivery
- `info` - Minor suggestions, acceptable as-is

## Essential Shots Checked

- Exterior (front, back, side)
- Kitchen (wide + details)
- Primary bedroom
- Bathrooms
- Living/family room
- Dining area

## Quick Integration

### Webhook
```typescript
// When media ready
await executeAgent({
  agentSlug: 'qc-assistant',
  triggerSource: 'webhook',
  input: { listingId }
})
```

### Cron (Every 30min)
```typescript
// Update all pending
for (const listing of pendingListings) {
  await executeAgent({
    agentSlug: 'qc-assistant',
    triggerSource: 'cron',
    input: { listingId: listing.id }
  })
}
```

### Manual Dashboard
```typescript
// Load queue
const results = await loadQCQueue()
const sorted = results.sort((a,b) => b.priorityScore - a.priorityScore)
```

## Performance

- Execution: 2-5 seconds
- Tokens: ~1000-1500
- Batch: Up to 50 concurrent

## Files

- Agent: `src/lib/agents/definitions/operations/qc-assistant.ts`
- Docs: `QC_ASSISTANT_README.md`
- Examples: `qc-assistant-example.tsx`
- Tests: `__tests__/qc-assistant.test.ts`
- Migration: `supabase/migrations/20241221_qc_assistant_agent.sql`
