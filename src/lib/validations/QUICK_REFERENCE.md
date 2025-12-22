# Validation Quick Reference

## Import

```typescript
import { validateBody, [schemaName] } from '@/lib/validations'
import { z } from 'zod'
```

## Common Patterns

### Validate Request Body
```typescript
const body = await request.json()
const validated = validateBody(listingDescriptionInputSchema, body)
```

### Validate Query Parameters
```typescript
const { searchParams } = new URL(request.url)
const { page, limit } = validateQuery(paginationSchema, searchParams)
```

### Validate Route Parameters
```typescript
const { campaignId } = validateParams(campaignParamsSchema, await params)
```

### Safe Validation
```typescript
const result = safeValidate(emailSchema, body.email)
if (!result.success) {
  return NextResponse.json({ error: result.error }, { status: 400 })
}
```

## Error Handling

```typescript
try {
  const validated = validateBody(schema, body)
  // ... your logic
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Validation failed', details: error.issues },
      { status: 400 }
    )
  }
  throw error
}
```

## Schema Cheat Sheet

### Listings
- `listingDescriptionInputSchema` - Generate listing description
- `buyerPersonasInputSchema` - Generate buyer personas
- `neighborhoodGuideInputSchema` - Generate neighborhood guide
- `socialCaptionsInputSchema` - Generate social captions
- `videoScriptInputSchema` - Generate video script
- `leadSubmissionSchema` - Submit a lead
- `leadQuerySchema` - Query leads

### Campaigns
- `campaignCreateSchema` - Create campaign
- `agentAnswersSubmissionSchema` - Submit answers
- `slidesUpdateSchema` - Update carousel slides
- `captionUpdateSchema` - Update carousel caption
- `carouselRenderSchema` - Render carousel

### Credits
- `creditsSpendSchema` - Spend credits
- `creditsBalanceQuerySchema` - Query balance
- `rewardRedemptionSchema` - Redeem reward

### Integrations
- `instagramPublishSchema` - Publish to Instagram
- `smsSendSchema` - Send SMS

### Common
- `uuidSchema` - UUID validation
- `emailSchema` - Email validation
- `phoneSchema` - Phone validation
- `paginationSchema` - Pagination (page, limit)

## Property Constraints

- **Beds**: 0-20
- **Baths**: 0-20
- **Sqft**: 100-100,000
- **Price**: 0+
- **Headlines**: Max 100 chars
- **Body Text**: Max 500 chars
- **Captions**: Max 2,200 chars
- **SMS**: Max 1,600 chars
- **Hashtags**: Max 30
- **Carousel Items**: Max 10

## Type Inference

```typescript
// Get TypeScript type from schema
type PropertyDetails = z.infer<typeof propertyDetailsSchema>
```

## Custom Validation

```typescript
const customSchema = z.object({
  email: emailSchema,
  beds: z.number().int().min(0).max(20),
  custom: z.string().refine(val => val.startsWith('PREFIX_'), {
    message: 'Must start with PREFIX_'
  })
})
```
