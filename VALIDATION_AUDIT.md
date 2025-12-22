# API Route Input Validation Audit

This document provides a comprehensive audit of all API routes and their validation requirements.

## Status

- **Zod Version**: 4.1.13 (already installed)
- **Validation Schemas Created**: ✓ Complete
- **Directory**: `/src/lib/validations/`

## Schema Files Created

### 1. `/src/lib/validations/common.ts`
Common validation schemas used across the application:
- `uuidSchema` - UUID validation
- `emailSchema` - Email format validation
- `phoneSchema` - Phone number validation (flexible format)
- `urlSchema` - URL validation
- `paginationSchema` - Pagination parameters (page, limit)
- `statusSchema` - Common status enum
- `dateRangeSchema` - Date range filtering
- `idParamSchema` - ID parameter validation
- `nonEmptyStringSchema` - Required string validation
- `positiveNumberSchema` - Positive number validation
- `nonNegativeNumberSchema` - Non-negative number validation

### 2. `/src/lib/validations/agents.ts`
Agent-related validation schemas:
- `agentExecuteInputSchema` - Agent execution input
- `agentSlugParamSchema` - Agent slug route parameter

### 3. `/src/lib/validations/listings.ts`
Listing and property-related validation schemas:
- `propertyDetailsSchema` - Property details (beds, baths, sqft, price)
- `listingDescriptionInputSchema` - Listing description generation
- `buyerPersonasInputSchema` - Buyer personas generation
- `neighborhoodGuideInputSchema` - Neighborhood guide generation
- `socialCaptionsInputSchema` - Social media captions generation
- `videoScriptInputSchema` - Video script generation
- `leadSubmissionSchema` - Lead form submission
- `leadQuerySchema` - Lead query parameters

### 4. `/src/lib/validations/campaigns.ts`
Campaign/ListingLaunch-related validation schemas:
- `carouselTypeSchema` - Carousel type enum
- `campaignCreateSchema` - Campaign creation
- `campaignParamsSchema` - Campaign route params
- `carouselParamsSchema` - Carousel route params
- `agentAnswerSchema` - Single agent answer
- `agentAnswersSubmissionSchema` - Agent answers submission (min 3)
- `carouselSlideSchema` - Carousel slide structure
- `slidesUpdateSchema` - Slides update request
- `captionUpdateSchema` - Caption update request
- `carouselRenderSchema` - Carousel render request
- `blogGenerationSchema` - Blog generation request

### 5. `/src/lib/validations/credits.ts`
Credit and payment-related validation schemas:
- `creditTransactionTypeSchema` - Transaction type enum
- `sourcePlatformSchema` - Source platform enum
- `creditsSpendSchema` - Credits spend request
- `creditsBalanceQuerySchema` - Credits balance query
- `rewardTypeSchema` - Reward type enum
- `rewardRedemptionSchema` - Reward redemption request

### 6. `/src/lib/validations/instagram.ts`
Instagram integration validation schemas:
- `instagramPublishSchema` - Instagram publish request
- `instagramEmbedSchema` - Instagram embed request
- `instagramCallbackSchema` - OAuth callback parameters
- `instagramDisconnectSchema` - Instagram disconnect request

### 7. `/src/lib/validations/sms.ts`
SMS/Communication validation schemas:
- `smsTemplateSchema` - SMS template enum
- `languageSchema` - Language options (en, es)
- `smsSendSchema` - SMS send request

### 8. `/src/lib/validations/index.ts`
Main export file with helper functions:
- `validateBody<T>(schema, body)` - Validate request body
- `safeValidate<T>(schema, data)` - Safe validation with error handling
- `validateQuery<T>(schema, searchParams)` - Validate query parameters
- `validateParams<T>(schema, params)` - Validate route parameters

## API Routes Requiring Validation Updates

### HIGH PRIORITY - User Input Routes

#### 1. `/api/admin/agents/[agentSlug]/execute/route.ts`
**Current**: Basic JSON parsing with try-catch
**Required Schema**: `agentExecuteInputSchema`
**Implementation**:
```typescript
import { validateBody, agentExecuteInputSchema } from '@/lib/validations'

const body = await request.json()
const { input } = validateBody(agentExecuteInputSchema, body)
```

#### 2. `/api/ai/listing-description/route.ts`
**Current**: Manual field checks (`!address || !beds || !baths || !sqft`)
**Required Schema**: `listingDescriptionInputSchema`
**Implementation**:
```typescript
import { validateBody, listingDescriptionInputSchema } from '@/lib/validations'

const body = await request.json()
const validated = validateBody(listingDescriptionInputSchema, body)
```

#### 3. `/api/ai/buyer-personas/route.ts`
**Current**: Manual field checks (`!beds || !baths || !sqft`)
**Required Schema**: `buyerPersonasInputSchema`
**Implementation**:
```typescript
import { validateBody, buyerPersonasInputSchema } from '@/lib/validations'

const body = await request.json()
const validated = validateBody(buyerPersonasInputSchema, body)
```

#### 4. `/api/ai/neighborhood-guide/route.ts`
**Current**: Manual field check (`!city`)
**Required Schema**: `neighborhoodGuideInputSchema`
**Implementation**:
```typescript
import { validateBody, neighborhoodGuideInputSchema } from '@/lib/validations'

const body = await request.json()
const validated = validateBody(neighborhoodGuideInputSchema, body)
```

#### 5. `/api/ai/social-captions/route.ts`
**Current**: Likely minimal validation
**Required Schema**: `socialCaptionsInputSchema`

#### 6. `/api/ai/video-script/route.ts`
**Current**: Likely minimal validation
**Required Schema**: `videoScriptInputSchema`

#### 7. `/api/credits/spend/route.ts`
**Current**: Manual checks (`!amount || !type || !description`)
**Required Schema**: `creditsSpendSchema`
**Implementation**:
```typescript
import { validateBody, creditsSpendSchema } from '@/lib/validations'

const body = await request.json()
const validated = validateBody(creditsSpendSchema, body)
```

#### 8. `/api/leads/route.ts`
**Current**: Manual checks with regex for email
**Required Schema**: `leadSubmissionSchema` (POST), `leadQuerySchema` (GET)
**Implementation**:
```typescript
// POST
import { validateBody, leadSubmissionSchema } from '@/lib/validations'
const validated = validateBody(leadSubmissionSchema, await request.json())

// GET
import { validateQuery, leadQuerySchema } from '@/lib/validations'
const params = validateQuery(leadQuerySchema, searchParams)
```

#### 9. `/api/rewards/redeem/route.ts`
**Current**: Manual checks (`!agent_id || !reward_id || !credits_cost`)
**Required Schema**: `rewardRedemptionSchema`
**Implementation**:
```typescript
import { validateBody, rewardRedemptionSchema } from '@/lib/validations'

const body = await request.json()
const validated = validateBody(rewardRedemptionSchema, body)
```

#### 10. `/api/sms/send/route.ts`
**Current**: Manual checks (`!agent_id || !template`)
**Required Schema**: `smsSendSchema`
**Implementation**:
```typescript
import { validateBody, smsSendSchema } from '@/lib/validations'

const body = await request.json()
const validated = validateBody(smsSendSchema, body)
```

#### 11. `/api/campaigns/create/route.ts`
**Current**: Manual checks (`!listingId || !agentId`)
**Required Schema**: `campaignCreateSchema`
**Implementation**:
```typescript
import { validateBody, campaignCreateSchema } from '@/lib/validations'

const body = await request.json()
const { listingId, agentId } = validateBody(campaignCreateSchema, body)
```

#### 12. `/api/campaigns/[campaignId]/answers/route.ts`
**Current**: Manual array check and length validation
**Required Schema**: `agentAnswersSubmissionSchema`
**Implementation**:
```typescript
import { validateBody, agentAnswersSubmissionSchema } from '@/lib/validations'

const body = await request.json()
const { answers } = validateBody(agentAnswersSubmissionSchema, body)
```

#### 13. `/api/campaigns/[campaignId]/carousels/[carouselId]/slides/route.ts`
**Current**: Manual array check and field validation
**Required Schema**: `slidesUpdateSchema`
**Implementation**:
```typescript
import { validateBody, slidesUpdateSchema } from '@/lib/validations'

const body = await request.json()
const { slides } = validateBody(slidesUpdateSchema, body)
```

#### 14. `/api/campaigns/[campaignId]/carousels/[carouselId]/caption/route.ts`
**Required Schema**: `captionUpdateSchema`

#### 15. `/api/instagram/publish/route.ts`
**Current**: Manual checks (`!carouselId || !agentId`)
**Required Schema**: `instagramPublishSchema`
**Implementation**:
```typescript
import { validateBody, instagramPublishSchema } from '@/lib/validations'

const body = await request.json()
const { carouselId, agentId } = validateBody(instagramPublishSchema, body)
```

### MEDIUM PRIORITY - Internal/Webhook Routes

#### 16. `/api/campaigns/[campaignId]/generate/route.ts`
**Current**: Status check only
**Note**: Most validation happens via database state, but could add schema for explicit checks

#### 17. `/api/webhooks/aryeo/route.ts`
**Note**: Webhook validation should verify signature/authenticity first
**Consider**: Schema for webhook payload structure

#### 18. `/api/bannerbear/webhook/route.ts`
**Note**: Webhook validation should verify signature/authenticity first
**Consider**: Schema for webhook payload structure

### LOW PRIORITY - Auth Routes

#### 19. `/api/auth/callback/route.ts`
**Note**: OAuth callback validation
**Consider**: Schema for OAuth state/code validation

#### 20. `/api/auth/signout/route.ts`
**Note**: No input validation needed (POST only)

## Usage Examples

### Basic Validation
```typescript
import { validateBody, listingDescriptionInputSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = validateBody(listingDescriptionInputSchema, body)

    // validated is now typed and validated
    // Access: validated.address, validated.beds, etc.
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    throw error
  }
}
```

### Safe Validation with Custom Error Handling
```typescript
import { safeValidate, emailSchema } from '@/lib/validations'

const result = safeValidate(emailSchema, body.email)
if (!result.success) {
  return NextResponse.json({ error: result.error }, { status: 400 })
}
const validEmail = result.data
```

### Query Parameter Validation
```typescript
import { validateQuery, paginationSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const { page, limit } = validateQuery(paginationSchema, searchParams)

  // page and limit are now numbers with defaults applied
}
```

### Route Parameter Validation
```typescript
import { validateParams, campaignParamsSchema } from '@/lib/validations'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = validateParams(campaignParamsSchema, await params)
  // campaignId is now validated as a UUID
}
```

## Error Handling Best Practices

### Standard Error Response
```typescript
try {
  const validated = validateBody(schema, body)
  // ... process request
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
      { status: 400 }
    )
  }

  console.error('Unexpected error:', error)
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

### Simple Error Response
```typescript
const result = safeValidate(schema, data)
if (!result.success) {
  return NextResponse.json({ error: result.error }, { status: 400 })
}
```

## Benefits of This Validation System

1. **Type Safety**: Zod provides full TypeScript type inference
2. **Consistent Validation**: Same validation logic across all routes
3. **Better Error Messages**: Clear, user-friendly error messages
4. **Maintainability**: Schemas are centralized and reusable
5. **Runtime Safety**: Prevents invalid data from reaching business logic
6. **Documentation**: Schemas serve as API documentation
7. **Testing**: Easy to test validation logic independently

## Next Steps

1. **Update Routes**: Apply validation schemas to all routes listed above
2. **Error Handling**: Implement consistent error handling across all routes
3. **Testing**: Add unit tests for validation schemas
4. **Documentation**: Update API documentation with validation requirements
5. **Monitoring**: Add logging for validation failures to identify issues

## Additional Schemas to Consider

Based on the routes, these additional schemas might be needed:

1. **Aryeo Webhook Schema** - For `/api/webhooks/aryeo/route.ts`
2. **BannerBear Webhook Schema** - For `/api/bannerbear/webhook/route.ts`
3. **Storywork Generation Schema** - For `/api/storywork/generate/route.ts`
4. **Care Tasks Schema** - For `/api/care/tasks/route.ts`

Review these routes to determine their exact validation needs.
