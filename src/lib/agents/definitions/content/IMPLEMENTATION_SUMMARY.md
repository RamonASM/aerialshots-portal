# Campaign Launcher Agent - Implementation Summary

## Files Created

### 1. Agent Definition
**Location:** `/Users/aerialshotsmedia/Projects/aerialshots-portal/src/lib/agents/definitions/content/campaign-launcher.ts`

Main agent implementation that:
- Creates listing campaigns automatically
- Checks agent preferences for auto-launch
- Triggers neighborhood research
- Sets up campaign status flow
- Returns campaign details and next steps

### 2. Category Index
**Location:** `/Users/aerialshotsmedia/Projects/aerialshots-portal/src/lib/agents/definitions/content/index.ts`

Registers the content category agents (currently just campaign-launcher).

### 3. Main Agent Registry Update
**Location:** `/Users/aerialshotsmedia/Projects/aerialshots-portal/src/lib/agents/index.ts`

Added import statement:
```typescript
import './definitions/content/campaign-launcher'
```

### 4. Database Migration
**Location:** `/Users/aerialshotsmedia/Projects/aerialshots-portal/supabase/migrations/20241221_005_listinglaunch_agent_fields.sql`

Adds two new columns to the `agents` table:
- `listinglaunch_enabled` - Boolean flag for feature access
- `listinglaunch_auto_launch` - Boolean flag for automatic campaign creation

### 5. Documentation
**Location:** `/Users/aerialshotsmedia/Projects/aerialshots-portal/src/lib/agents/definitions/content/campaign-launcher.README.md`

Comprehensive documentation covering:
- Agent overview and purpose
- Input/output schemas
- Workflow diagrams
- Usage examples
- Error handling
- Integration points
- Testing scenarios

### 6. Test Suite
**Location:** `/Users/aerialshotsmedia/Projects/aerialshots-portal/src/lib/agents/definitions/content/__tests__/campaign-launcher.test.ts`

Test scenarios for:
- Input validation
- Auto-launch logic
- Campaign creation
- Research flow
- Error handling
- Integration scenarios

## How It Works

### Input
```typescript
{
  listing_id: string              // Required
  autoLaunch?: boolean           // Optional override
  campaignType?: 'instagram' | 'facebook' | 'both'
  skipNeighborhoodResearch?: boolean
  carouselTypes?: string[]
}
```

### Output
```typescript
{
  campaignId: string
  listingId: string
  status: 'questions_ready' | 'research_pending'
  questionsUrl: string
  neighborhoodResearchStatus: 'started' | 'skipped' | 'completed'
  nextSteps: string[]
}
```

## Workflow

1. **Validate Inputs** - Check listing_id is provided
2. **Fetch Listing** - Get listing details with agent relationship
3. **Check Permissions** - Verify ListingLaunch is enabled and auto-launch is allowed
4. **Check Existing** - Return existing campaign if one exists
5. **Create Campaign** - Insert new record in `listing_campaigns` table
6. **Trigger Research** - Optionally start neighborhood data collection
7. **Set Status** - Update campaign status based on research flow
8. **Return Results** - Provide campaign details and next steps URL

## Integration Points

### Triggered By
- Delivery workflow (when media is delivered)
- Manual API calls
- Workflow orchestrator

### Triggers
- Neighborhood Data Agent (for research)
- Question Generator (via API endpoint)

## Database Schema

### New Agent Columns
```sql
ALTER TABLE agents ADD COLUMN IF NOT EXISTS listinglaunch_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS listinglaunch_auto_launch BOOLEAN DEFAULT FALSE;
```

### Campaign Table (already exists)
- `listing_campaigns` - Created by migration `20241211_003_listinglaunch.sql`

## Next Steps for Deployment

1. **Run Database Migration**
   ```bash
   supabase db push
   # or
   supabase migration up
   ```

2. **Register Agent in Database**
   ```sql
   INSERT INTO ai_agents (slug, name, description, category, execution_mode, is_active)
   VALUES (
     'campaign-launcher',
     'Campaign Launcher',
     'Auto-starts ListingLaunch carousel campaigns when media is delivered',
     'content',
     'async',
     true
   );
   ```

3. **Enable for Test Agent**
   ```sql
   UPDATE agents
   SET
     listinglaunch_enabled = true,
     listinglaunch_auto_launch = true
   WHERE email = 'test-agent@example.com';
   ```

4. **Test Execution**
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

5. **Monitor Logs**
   - Check execution in `ai_agent_executions` table
   - Verify campaign created in `listing_campaigns` table
   - Confirm neighborhood research triggered (if applicable)

## Integration with Existing System

### Campaign Creation API
The agent uses the same database structure as the existing `/api/campaigns/create` endpoint:
- Creates campaign with default carousel types
- Sets initial status to 'draft' or 'questions'
- Uses listing address for campaign naming

### Neighborhood Research
Optionally triggers the same research flow as `/api/campaigns/[campaignId]/research`:
- Fetches Google Places data
- Gathers Ticketmaster events
- Calculates Walk Score
- Deducts credits from agent balance

### Questions Generation
After research, the campaign is ready for `/api/campaigns/[campaignId]/questions`:
- Generates personalized questions based on neighborhood data
- Agent answers questions via UI
- Questions inform carousel content generation

## Monitoring & Metrics

Track in `ai_agent_executions`:
- Execution count
- Success/failure rate
- Average duration
- Tokens used (0 for this agent)

Track business metrics:
- Campaigns created per day
- Auto-launch adoption rate
- Research skip rate
- Agent engagement with questions

## Future Enhancements

1. **Smart Scheduling** - Analyze best posting times based on agent's historical engagement
2. **Template Selection** - Choose carousel templates based on listing price/type
3. **Multi-Listing Campaigns** - Support subdivision/community marketing
4. **A/B Testing** - Generate variations and track performance
5. **Email Notifications** - Alert agent when campaign is ready
6. **Calendar Integration** - Auto-schedule posts based on agent availability

## Support & Troubleshooting

### Common Issues

**Q: Campaign not created?**
A: Check that `listinglaunch_enabled = true` on the agent.

**Q: Auto-launch not working?**
A: Verify `listinglaunch_auto_launch = true` or pass `autoLaunch: true` in input.

**Q: Research not starting?**
A: Ensure listing has `lat` and `lng` coordinates.

**Q: Insufficient credits error?**
A: Agent needs at least 1 credit for neighborhood research.

### Debug Checklist

- [ ] Agent has `listinglaunch_enabled = true`
- [ ] Auto-launch is enabled (agent setting or input override)
- [ ] Listing exists and has valid ID
- [ ] Listing has associated agent
- [ ] Listing has coordinates (if research is needed)
- [ ] Agent has sufficient credit balance
- [ ] No existing campaign for this listing
- [ ] Database connection is healthy
- [ ] Agent execution logged in `ai_agent_executions`

## Contact

For questions or issues, refer to:
- Main documentation: `campaign-launcher.README.md`
- Test suite: `__tests__/campaign-launcher.test.ts`
- Agent registry: `/src/lib/agents/registry.ts`
- Executor: `/src/lib/agents/executor.ts`
