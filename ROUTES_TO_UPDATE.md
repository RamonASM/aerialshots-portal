# API Routes Requiring Validation Updates

This is a prioritized list of routes that need Zod validation schemas applied.

## High Priority Routes (User Input)

### 1. Agent Execution
**File**: `/src/app/api/admin/agents/[agentSlug]/execute/route.ts`
**Schema**: `agentExecuteInputSchema`
**Current Validation**: Try-catch around JSON parsing
**Update**:
```typescript
import { validateBody, agentExecuteInputSchema } from '@/lib/validations'

// Replace lines 42-48 with:
const body = await request.json()
const { input } = validateBody(agentExecuteInputSchema, body)
```

### 2. Listing Description Generator
**File**: `/src/app/api/ai/listing-description/route.ts`
**Schema**: `listingDescriptionInputSchema`
**Current Validation**: Manual checks for `!address || !beds || !baths || !sqft`
**Update**:
```typescript
import { validateBody, listingDescriptionInputSchema } from '@/lib/validations'

// Replace lines 39-47 with:
const body = await request.json()
const validated = validateBody(listingDescriptionInputSchema, body)
```

### 3. Buyer Personas Generator
**File**: `/src/app/api/ai/buyer-personas/route.ts`
**Schema**: `buyerPersonasInputSchema`
**Current Validation**: Manual checks for `!beds || !baths || !sqft`
**Update**:
```typescript
import { validateBody, buyerPersonasInputSchema } from '@/lib/validations'

// Replace lines 36-44 with:
const body = await request.json()
const validated = validateBody(buyerPersonasInputSchema, body)
```

### 4. Neighborhood Guide Generator
**File**: `/src/app/api/ai/neighborhood-guide/route.ts`
**Schema**: `neighborhoodGuideInputSchema`
**Current Validation**: Manual check for `!city`
**Update**:
```typescript
import { validateBody, neighborhoodGuideInputSchema } from '@/lib/validations'

// Replace lines 36-42 with:
const body = await request.json()
const validated = validateBody(neighborhoodGuideInputSchema, body)
```

### 5. Credits Spend
**File**: `/src/app/api/credits/spend/route.ts`
**Schema**: `creditsSpendSchema`
**Current Validation**: Manual checks for `!amount || !type || !description`
**Update**:
```typescript
import { validateBody, creditsSpendSchema } from '@/lib/validations'

// Replace lines 9-25 with:
const body = await request.json()
const validated = validateBody(creditsSpendSchema, body)
```

### 6. Lead Submission (POST)
**File**: `/src/app/api/leads/route.ts`
**Schema**: `leadSubmissionSchema`
**Current Validation**: Manual checks with regex for email
**Update**:
```typescript
import { validateBody, leadSubmissionSchema } from '@/lib/validations'

// In POST function, replace lines 15-29 with:
const body = await request.json()
const validated = validateBody(leadSubmissionSchema, body)
```

### 7. Lead Query (GET)
**File**: `/src/app/api/leads/route.ts`
**Schema**: `leadQuerySchema`
**Current Validation**: Manual check for `!agentId`
**Update**:
```typescript
import { validateQuery, leadQuerySchema } from '@/lib/validations'

// In GET function, replace lines 75-84 with:
const { searchParams } = new URL(request.url)
const { agent_id, status } = validateQuery(leadQuerySchema, searchParams)
```

### 8. Reward Redemption
**File**: `/src/app/api/rewards/redeem/route.ts`
**Schema**: `rewardRedemptionSchema`
**Current Validation**: Manual checks for `!agent_id || !reward_id || !credits_cost`
**Update**:
```typescript
import { validateBody, rewardRedemptionSchema } from '@/lib/validations'

// Replace lines 13-22 with:
const body = await request.json()
const validated = validateBody(rewardRedemptionSchema, body)
```

### 9. SMS Send
**File**: `/src/app/api/sms/send/route.ts`
**Schema**: `smsSendSchema`
**Current Validation**: Manual checks for `!agent_id || !template`
**Update**:
```typescript
import { validateBody, smsSendSchema } from '@/lib/validations'

// Replace lines 9-30 with:
const body = await request.json()
const validated = validateBody(smsSendSchema, body)
```

### 10. Campaign Creation
**File**: `/src/app/api/campaigns/create/route.ts`
**Schema**: `campaignCreateSchema`
**Current Validation**: Manual checks for `!listingId || !agentId`
**Update**:
```typescript
import { validateBody, campaignCreateSchema } from '@/lib/validations'

// Replace lines 6-14 with:
const body = await request.json()
const { listingId, agentId } = validateBody(campaignCreateSchema, body)
```

### 11. Campaign Answers Submission
**File**: `/src/app/api/campaigns/[campaignId]/answers/route.ts`
**Schema**: `agentAnswersSubmissionSchema`
**Current Validation**: Manual array check and length validation
**Update**:
```typescript
import { validateBody, agentAnswersSubmissionSchema } from '@/lib/validations'

// Replace lines 18-64 with:
const body = await request.json()
const { answers } = validateBody(agentAnswersSubmissionSchema, body)

// Build answers object keyed by question ID
const answersMap: Record<string, string> = {}
for (const answer of answers) {
  if (answer.questionId && answer.answer?.trim()) {
    answersMap[answer.questionId] = answer.answer.trim()
  }
}
```

### 12. Carousel Slides Update
**File**: `/src/app/api/campaigns/[campaignId]/carousels/[carouselId]/slides/route.ts`
**Schema**: `slidesUpdateSchema`
**Current Validation**: Manual array check and field validation
**Update**:
```typescript
import { validateBody, slidesUpdateSchema } from '@/lib/validations'

// Replace lines 13-60 with:
const body = await request.json()
const { slides } = validateBody(slidesUpdateSchema, body)
```

### 13. Instagram Publish
**File**: `/src/app/api/instagram/publish/route.ts`
**Schema**: `instagramPublishSchema`
**Current Validation**: Manual checks for `!carouselId || !agentId`
**Update**:
```typescript
import { validateBody, instagramPublishSchema } from '@/lib/validations'

// Replace lines 11-19 with:
const body = await request.json()
const { carouselId, agentId } = validateBody(instagramPublishSchema, body)
```

## Medium Priority Routes

### 14. Social Captions Generator
**File**: `/src/app/api/ai/social-captions/route.ts`
**Schema**: `socialCaptionsInputSchema`
**Note**: Check current validation when updating

### 15. Video Script Generator
**File**: `/src/app/api/ai/video-script/route.ts`
**Schema**: `videoScriptInputSchema`
**Note**: Check current validation when updating

### 16. Carousel Caption Update
**File**: `/src/app/api/campaigns/[campaignId]/carousels/[carouselId]/caption/route.ts`
**Schema**: `captionUpdateSchema`
**Note**: Check if this route exists

### 17. Carousel Render Request
**File**: `/src/app/api/campaigns/[campaignId]/carousels/[carouselId]/render/route.ts`
**Schema**: `carouselRenderSchema`
**Note**: Check current validation

### 18. Instagram Embed
**File**: `/src/app/api/instagram/embed/route.ts`
**Schema**: `instagramEmbedSchema`
**Note**: Check current validation

## Low Priority Routes

### 19. Webhooks
- `/src/app/api/webhooks/aryeo/route.ts`
- `/src/app/api/bannerbear/webhook/route.ts`
**Note**: These need signature verification first, then payload validation

### 20. OAuth Callbacks
- `/src/app/api/auth/callback/route.ts`
- `/src/app/api/instagram/callback/route.ts`
**Schema**: `instagramCallbackSchema` (for Instagram)
**Note**: OAuth validation is specific

## Standard Error Handling Template

Use this template when updating routes:

```typescript
import { validateBody, [schemaName] } from '@/lib/validations'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = validateBody([schemaName], body)

    // ... rest of your logic using 'validated'

  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    // Handle other errors
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## Progress Tracking

- [ ] 1. Agent Execution
- [ ] 2. Listing Description Generator
- [ ] 3. Buyer Personas Generator
- [ ] 4. Neighborhood Guide Generator
- [ ] 5. Credits Spend
- [ ] 6. Lead Submission (POST)
- [ ] 7. Lead Query (GET)
- [ ] 8. Reward Redemption
- [ ] 9. SMS Send
- [ ] 10. Campaign Creation
- [ ] 11. Campaign Answers Submission
- [ ] 12. Carousel Slides Update
- [ ] 13. Instagram Publish
- [ ] 14. Social Captions Generator
- [ ] 15. Video Script Generator
- [ ] 16. Carousel Caption Update
- [ ] 17. Carousel Render Request
- [ ] 18. Instagram Embed
- [ ] 19. Webhooks (both)
- [ ] 20. OAuth Callbacks

## Testing After Updates

After updating each route, test:

1. **Valid input** - Should pass validation
2. **Missing required fields** - Should return 400 with clear error
3. **Invalid types** - Should return 400 with type error
4. **Out of range values** - Should return 400 with range error
5. **Invalid formats** (emails, UUIDs, etc.) - Should return 400 with format error

## See Also

- [VALIDATION_AUDIT.md](/VALIDATION_AUDIT.md) - Complete audit documentation
- [src/lib/validations/README.md](/src/lib/validations/README.md) - Schema usage guide
