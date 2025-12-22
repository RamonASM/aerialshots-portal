# QC Assistant Agent

## Overview

The QC Assistant agent pre-screens photos for quality issues and calculates priority scores for the QC queue. It helps prioritize which listings need immediate attention and flags potential issues before manual QC review.

## Purpose

- **Input**: Listing ID and media assets (after Fotello enhancement)
- **Output**: QC recommendations, flagged issues, priority score
- **Priority Calculation**: Based on rush flag, time since ready, deadline, and VIP client status

## Agent Details

- **Slug**: `qc-assistant`
- **Category**: `operations`
- **Execution Mode**: `async`
- **Model**: Claude 3 Haiku (via AI client fallback)

## Input Parameters

```typescript
{
  listingId: string              // Required - the listing to analyze
  readyForQCAt?: string         // ISO timestamp when assets became ready
  isVIPClient?: boolean         // Whether this is a VIP client
  deadline?: string             // ISO timestamp of delivery deadline
}
```

## Output Format

```typescript
{
  priorityScore: number,        // 0-100 (higher = more urgent)
  priorityColor: 'red' | 'yellow' | 'green',
  flaggedIssues: [
    {
      type: 'lighting' | 'composition' | 'missing' | 'color' | 'blur' | 'angle' | 'clutter',
      severity: 'critical' | 'warning' | 'info',
      description: string,
      affectedAssetIds?: string[]
    }
  ],
  recommendations: string[],
  estimatedQCTime: number,      // minutes
  missingShots: string[],
  photoQualityScore: number,    // 0-100
  priorityFactors: string[],
  assetCount: number,
  photoCount: number,
  listingAddress: string
}
```

## Priority Scoring

The priority score is calculated based on multiple factors:

### Scoring Factors

| Factor | Points | Description |
|--------|--------|-------------|
| Rush Order | +50 | Listing marked as rush |
| Waiting Time | -10/hour | Deducted for each hour waiting in queue (max -50) |
| Same-Day Deadline | +30 | Deadline is today |
| VIP Client | +20 | Client flagged as VIP |

Base score starts at 50, then adjusted by factors and normalized to 0-100 range.

### Priority Colors

- **Red (80-100)**: Rush or overdue, needs immediate attention
- **Yellow (50-79)**: Approaching deadline, should be addressed soon
- **Green (0-49)**: Standard priority, no urgency

## Quality Checks

The agent analyzes photos for:

1. **Lighting Issues**: Under/overexposed, harsh shadows, mixed color temps
2. **Composition**: Poor framing, tilted horizons, distracting elements
3. **Color Balance**: Color casts, oversaturation, inconsistent white balance
4. **Focus/Blur**: Out of focus, motion blur, soft details
5. **Angles**: Unflattering angles, distortion, non-straight verticals
6. **Clutter**: Personal items, staging issues, unprofessional appearance

### Essential Shots Checked

- Exterior (front, back, side views)
- Kitchen (wide shot, detail shots)
- Primary bedroom
- Bathrooms
- Living/family room
- Dining area

## Usage Examples

### Execute via API

```typescript
import { executeAgent } from '@/lib/agents'

const result = await executeAgent({
  agentSlug: 'qc-assistant',
  triggerSource: 'manual',
  input: {
    listingId: 'listing-uuid-here',
    readyForQCAt: '2024-12-21T14:30:00Z',
    isVIPClient: true,
    deadline: '2024-12-21T18:00:00Z'
  }
})

if (result.success) {
  console.log('Priority Score:', result.output.priorityScore)
  console.log('Priority Color:', result.output.priorityColor)
  console.log('Issues Found:', result.output.flaggedIssues.length)
  console.log('Estimated QC Time:', result.output.estimatedQCTime, 'minutes')
}
```

### Execute via API Route

```bash
curl -X POST https://your-domain.com/api/admin/agents/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agentSlug": "qc-assistant",
    "triggerSource": "api",
    "input": {
      "listingId": "listing-uuid-here",
      "readyForQCAt": "2024-12-21T14:30:00Z",
      "isVIPClient": true
    }
  }'
```

### Webhook Integration

The agent can be triggered automatically when media assets are marked as ready for QC:

```typescript
// In your webhook handler
await executeAgent({
  agentSlug: 'qc-assistant',
  triggerSource: 'webhook',
  input: {
    listingId: listing.id,
    readyForQCAt: new Date().toISOString(),
    isVIPClient: listing.agent?.tier === 'vip',
    deadline: listing.deadline
  }
})
```

## Integration with QC Dashboard

The agent's output can be used to build a prioritized QC queue:

```typescript
// Fetch all listings ready for QC
const readyListings = await getListingsReadyForQC()

// Run QC assistant for each
const qcResults = await Promise.all(
  readyListings.map(listing =>
    executeAgent({
      agentSlug: 'qc-assistant',
      triggerSource: 'cron',
      input: {
        listingId: listing.id,
        readyForQCAt: listing.ready_for_qc_at,
        isVIPClient: listing.is_vip
      }
    })
  )
)

// Sort by priority score (highest first)
const sortedQueue = qcResults
  .filter(r => r.success)
  .sort((a, b) => b.output.priorityScore - a.output.priorityScore)

// Display in QC dashboard with color coding
sortedQueue.forEach(item => {
  displayQCItem({
    address: item.output.listingAddress,
    priority: item.output.priorityScore,
    color: item.output.priorityColor,
    issues: item.output.flaggedIssues,
    estimatedTime: item.output.estimatedQCTime
  })
})
```

## Example Output

```json
{
  "success": true,
  "output": {
    "priorityScore": 75,
    "priorityColor": "yellow",
    "flaggedIssues": [
      {
        "type": "lighting",
        "severity": "warning",
        "description": "Kitchen photo appears underexposed - check exposure levels",
        "affectedAssetIds": ["asset-123"]
      },
      {
        "type": "missing",
        "severity": "info",
        "description": "Missing essential shots: exterior back, dining area"
      }
    ],
    "recommendations": [
      "Verify if exterior back, dining area photos were requested",
      "High priority - expedite QC process"
    ],
    "estimatedQCTime": 12,
    "missingShots": ["exterior back", "dining area"],
    "photoQualityScore": 78,
    "priorityFactors": [
      "Rush order (+50)",
      "Waiting 2h (-20)",
      "VIP client (+20)"
    ],
    "assetCount": 45,
    "photoCount": 42,
    "listingAddress": "123 Main Street, Austin, TX"
  },
  "tokensUsed": 1247
}
```

## Database Requirements

The agent requires:

1. **Listings table** with fields:
   - `id`, `address`, `is_rush`, `scheduled_at`, `delivered_at`

2. **Media Assets table** with fields:
   - `id`, `listing_id`, `type`, `category`, `aryeo_url`, `qc_status`, `sort_order`

3. **Agents table** (ai_agents) with the agent registered
4. **Executions table** (ai_agent_executions) for logging

## Performance

- **Execution time**: 2-5 seconds per listing
- **Token usage**: ~1000-1500 tokens per execution
- **Recommended batch size**: Process up to 50 listings concurrently

## Future Enhancements

Potential improvements:

1. **Vision API Integration**: Use Claude Vision or GPT-4 Vision to actually analyze image quality
2. **ML Model**: Train a custom model on QC feedback to predict issues
3. **Historical Analysis**: Learn from past QC issues to improve detection
4. **Automated Fixes**: Suggest specific editing adjustments (brightness +10%, crop to 16:9, etc.)
5. **Batch Processing**: Optimize for analyzing multiple listings simultaneously

## Related Agents

- **care-task-generator**: Creates follow-up tasks for flagged issues
- **fotello-enhancer**: Pre-processing before QC (hypothetical)
- **delivery-coordinator**: Uses QC results to schedule deliveries

## Support

For issues or questions about the QC Assistant agent, contact the development team or check the agent execution logs in the admin dashboard.
