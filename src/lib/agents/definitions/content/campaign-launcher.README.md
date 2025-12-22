# Campaign Launcher Agent

**Category:** Content
**Slug:** `campaign-launcher`
**Execution Mode:** Async

## Overview

The Campaign Launcher agent automatically initiates ListingLaunch carousel marketing campaigns when media is delivered to agents. It orchestrates the campaign creation process, triggers neighborhood research, and sets up personalized questions for carousel content generation.

## Purpose

Streamline the transition from media delivery to marketing content generation by automatically:
1. Creating a new listing campaign record
2. Triggering neighborhood research (via the `neighborhood-data` agent)
3. Preparing the campaign for personalized questions
4. Setting appropriate campaign status based on configuration

## Input Schema

```typescript
{
  listing_id: string              // Required: UUID of the listing
  autoLaunch?: boolean           // Optional: Override agent's auto-launch preference
  campaignType?: 'instagram' | 'facebook' | 'both'  // Optional: Campaign platform
  skipNeighborhoodResearch?: boolean  // Optional: Skip research and go straight to questions
  carouselTypes?: string[]       // Optional: Override default carousel types
}
```

### Default Carousel Types
If not specified, the following carousel types are created:
- `property_highlights` - Showcase key property features
- `neighborhood_guide` - Local area highlights and lifestyle
- `local_favorites` - Agent's personal recommendations

## Output Schema

```typescript
{
  campaignId: string             // UUID of created/existing campaign
  listingId: string              // UUID of the listing
  status: 'questions_ready' | 'research_pending'  // Current campaign status
  questionsUrl: string           // URL where agent can answer questions
  neighborhoodResearchStatus: 'started' | 'skipped' | 'completed'
  nextSteps: string[]            // Array of next action items
}
```

## Agent Requirements

The agent will only launch campaigns if:

1. **ListingLaunch is enabled** for the agent (`listinglaunch_enabled = true`)
2. **Auto-launch is enabled** either:
   - In agent settings (`listinglaunch_auto_launch = true`), OR
   - Via input override (`autoLaunch: true`)

## Workflow

### Standard Flow (with Research)

```
1. Create campaign record with status='draft'
2. Trigger neighborhood research (Google Places, Ticketmaster, Walk Score)
3. Campaign status updates to 'researching' → 'questions'
4. Personalized questions are generated based on research
5. Return questionsUrl for agent to answer
```

### Fast Flow (skip research)

```
1. Create campaign record with status='questions'
2. Use default questions (not personalized to neighborhood)
3. Return questionsUrl for agent to answer
```

## Database Changes

The agent creates a `listing_campaigns` record with:
- `agent_id` - From the listing's agent relationship
- `listing_id` - The listing being marketed
- `name` - Auto-generated from listing address
- `status` - Either 'draft' (for research) or 'questions' (skipped research)
- `carousel_types` - Array of carousel types to generate

## Integration Points

### Triggered By
- **Delivery Workflow** - When media is marked as delivered
- **Manual Trigger** - Via API or admin interface
- **Workflow Orchestrator** - Part of larger automation sequences

### Triggers
- **Neighborhood Data Agent** - Fetches local places, events, and walkability data
- **Question Generator** - Creates personalized questions after research

## Error Handling

| Error Code | Meaning | Resolution |
|------------|---------|------------|
| `MISSING_LISTING_ID` | No listing_id provided | Provide listing_id in input |
| `LISTING_NOT_FOUND` | Listing doesn't exist | Verify listing_id is correct |
| `NO_AGENT` | Listing has no associated agent | Assign an agent to the listing |
| `AUTO_LAUNCH_DISABLED` | Auto-launch not enabled | Enable in agent settings or use `autoLaunch: true` |
| `FEATURE_NOT_ENABLED` | ListingLaunch not enabled for agent | Enable ListingLaunch in agent settings |
| `CAMPAIGN_CREATE_FAILED` | Database error creating campaign | Check logs and database connectivity |

## Usage Examples

### Basic Usage (Auto-Launch Enabled)

```typescript
import { executeAgent } from '@/lib/agents'

const result = await executeAgent({
  agentSlug: 'campaign-launcher',
  triggerSource: 'delivery',
  input: {
    listing_id: 'abc123-def456-...'
  },
  listingId: 'abc123-def456-...'
})

if (result.success) {
  console.log('Campaign created:', result.output.campaignId)
  console.log('Questions URL:', result.output.questionsUrl)
  console.log('Next steps:', result.output.nextSteps)
}
```

### Override Auto-Launch Setting

```typescript
const result = await executeAgent({
  agentSlug: 'campaign-launcher',
  triggerSource: 'manual',
  input: {
    listing_id: 'abc123-def456-...',
    autoLaunch: true  // Force launch even if agent has it disabled
  }
})
```

### Skip Research for Speed

```typescript
const result = await executeAgent({
  agentSlug: 'campaign-launcher',
  triggerSource: 'manual',
  input: {
    listing_id: 'abc123-def456-...',
    skipNeighborhoodResearch: true  // Go straight to questions
  }
})
```

### Custom Carousel Types

```typescript
const result = await executeAgent({
  agentSlug: 'campaign-launcher',
  triggerSource: 'manual',
  input: {
    listing_id: 'abc123-def456-...',
    carouselTypes: [
      'property_highlights',
      'neighborhood_guide',
      'schools_families',
      'lifestyle'
    ]
  }
})
```

## Configuration

Agent configuration in `ai_agents` table:

```json
{
  "maxTokens": 0,
  "temperature": 0,
  "timeout": 30000
}
```

Note: This agent doesn't use AI generation, so tokens are not consumed.

## Next Steps After Launch

After the campaign is launched, the typical workflow continues:

1. **Answer Questions** - Agent navigates to `questionsUrl` and answers personalized questions
2. **Generate Carousels** - System creates carousel content based on answers
3. **Review & Edit** - Agent reviews generated carousels and makes edits
4. **Render Images** - Carousels are rendered using Bannerbear templates
5. **Schedule/Post** - Agent schedules Instagram/Facebook posts or downloads for manual posting

## Database Schema Requirements

### Agents Table
```sql
ALTER TABLE agents ADD COLUMN IF NOT EXISTS listinglaunch_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS listinglaunch_auto_launch BOOLEAN DEFAULT FALSE;
```

### Listings Table
Must have:
- `agent_id` - Foreign key to agents table
- `lat`, `lng` - Coordinates for neighborhood research (optional but recommended)
- `address`, `city`, `state` - For campaign naming

### Listing Campaigns Table
See migration: `20241211_003_listinglaunch.sql`

## Testing

### Manual Test via API

```bash
curl -X POST https://portal.aerialshots.media/api/agents/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agentSlug": "campaign-launcher",
    "triggerSource": "manual",
    "input": {
      "listing_id": "YOUR_LISTING_UUID"
    }
  }'
```

### Test Scenarios

1. ✅ **Happy Path** - Valid listing with coordinates and auto-launch enabled
2. ✅ **Skip Research** - Valid listing without coordinates
3. ✅ **Override Auto-Launch** - Agent has auto-launch disabled, input overrides
4. ❌ **No Agent** - Listing without associated agent (should fail)
5. ❌ **Feature Disabled** - Agent without ListingLaunch enabled (should fail)
6. ✅ **Existing Campaign** - Listing already has active campaign (returns existing)

## Credits & Billing

The campaign-launcher agent itself does **not consume credits**.

However, the neighborhood research it triggers **does consume credits**:
- Neighborhood Research: **1 credit** (configurable in `LISTINGLAUNCH_CREDITS.RESEARCH`)

## Related Agents

- **neighborhood-data** - Fetches local neighborhood data
- **delivery-notifier** - Notifies agents when media is ready (can trigger this agent)

## Future Enhancements

- [ ] Support for different campaign templates (luxury, standard, budget)
- [ ] Multi-listing campaign support (subdivision/community marketing)
- [ ] AI-generated campaign names based on listing features
- [ ] Integration with calendar for optimal post timing
- [ ] A/B testing support for carousel variations
