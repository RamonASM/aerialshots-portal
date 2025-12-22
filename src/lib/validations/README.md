# Input Validation Schemas

This directory contains Zod validation schemas for all API routes in the application.

## Quick Start

```typescript
import { validateBody, listingDescriptionInputSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const validated = validateBody(listingDescriptionInputSchema, body)

  // validated is now typed and safe to use
}
```

## Available Helper Functions

### `validateBody<T>(schema, body)`
Validates and parses request body. Throws ZodError on failure.

```typescript
const validated = validateBody(schema, await request.json())
```

### `safeValidate<T>(schema, data)`
Returns `{ success: true, data }` or `{ success: false, error }`.

```typescript
const result = safeValidate(schema, data)
if (!result.success) {
  return NextResponse.json({ error: result.error }, { status: 400 })
}
```

### `validateQuery<T>(schema, searchParams)`
Validates URL query parameters with automatic type coercion.

```typescript
const { page, limit } = validateQuery(paginationSchema, searchParams)
```

### `validateParams<T>(schema, params)`
Validates route parameters (e.g., from `[id]` segments).

```typescript
const { campaignId } = validateParams(campaignParamsSchema, await params)
```

## Schema Files

- **common.ts** - Common schemas (UUID, email, phone, pagination, etc.)
- **agents.ts** - Agent-related schemas
- **listings.ts** - Listing and property schemas
- **campaigns.ts** - Campaign/ListingLaunch schemas
- **credits.ts** - Credit and payment schemas
- **instagram.ts** - Instagram integration schemas
- **sms.ts** - SMS/communication schemas

## Error Handling

### With try-catch
```typescript
try {
  const validated = validateBody(schema, body)
  // ... process
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Validation failed', details: error.errors },
      { status: 400 }
    )
  }
  throw error
}
```

### With safeValidate
```typescript
const result = safeValidate(schema, data)
if (!result.success) {
  return NextResponse.json({ error: result.error }, { status: 400 })
}
const validated = result.data
```

## Schema Examples

### Property Details
```typescript
propertyDetailsSchema = z.object({
  beds: z.number().int().min(0).max(20),
  baths: z.number().min(0).max(20),
  sqft: z.number().int().min(100).max(100000),
  price: z.number().int().min(0).optional(),
})
```

### Lead Submission
```typescript
leadSubmissionSchema = z.object({
  listing_id: uuidSchema.optional(),
  agent_id: uuidSchema.optional(),
  name: z.string().min(1, 'Name is required'),
  email: emailSchema,
  phone: phoneSchema,
  message: z.string().optional(),
})
```

### Pagination
```typescript
paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})
```

## Type Inference

Zod automatically infers TypeScript types:

```typescript
type PropertyDetails = z.infer<typeof propertyDetailsSchema>
// { beds: number; baths: number; sqft: number; price?: number }
```

## Adding New Schemas

1. Add schema to appropriate file (or create new file)
2. Export from that file
3. Re-export from `index.ts`
4. Update this README with examples

## Testing

Schemas can be tested independently:

```typescript
import { expect, test } from 'vitest'
import { emailSchema } from './common'

test('validates email', () => {
  expect(emailSchema.parse('test@example.com')).toBe('test@example.com')
  expect(() => emailSchema.parse('invalid')).toThrow()
})
```

## See Also

- [VALIDATION_AUDIT.md](/VALIDATION_AUDIT.md) - Complete audit of all routes
- [Zod Documentation](https://zod.dev)
