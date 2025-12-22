# Error Handling Utilities - Usage Examples

This document provides examples of how to use the centralized error handling utilities in API routes and other parts of the application.

## Basic API Route Error Handling

### Simple Example with handleApiError Wrapper

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, badRequest, notFound } from '@/lib/utils/errors'

export async function GET(request: NextRequest) {
  return handleApiError(async () => {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      throw badRequest('ID parameter is required')
    }

    const data = await fetchData(id)

    if (!data) {
      throw notFound('Resource not found', { id })
    }

    return NextResponse.json({ data })
  })
}
```

### Manual Error Response Creation

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createErrorResponse, unauthorized, serverError } from '@/lib/utils/errors'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')

    if (!token) {
      throw unauthorized('Authentication token required')
    }

    // ... rest of handler

    return NextResponse.json({ success: true })
  } catch (error) {
    return createErrorResponse(error)
  }
}
```

## Authentication & Authorization

### Check User Authentication

```typescript
import { createClient } from '@/lib/supabase/server'
import { notAuthenticated, notAuthorized } from '@/lib/utils/errors'

export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw notAuthenticated()
    }

    // Check if user has required role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      throw notAuthorized('Admin access required', 'admin')
    }

    // ... rest of handler
  })
}
```

## Validation Errors

### Input Validation

```typescript
import { validationError, badRequest } from '@/lib/utils/errors'

export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const body = await request.json()

    // Simple validation
    if (!body.email) {
      throw badRequest('Email is required')
    }

    // Complex validation with multiple errors
    const errors: Array<{ field: string; message: string }> = []

    if (!body.name || body.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Name is required' })
    }

    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      errors.push({ field: 'email', message: 'Valid email is required' })
    }

    if (body.age && (body.age < 18 || body.age > 120)) {
      errors.push({ field: 'age', message: 'Age must be between 18 and 120' })
    }

    if (errors.length > 0) {
      throw validationError(errors)
    }

    // ... rest of handler
  })
}
```

## Database Error Handling

### Supabase Queries

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { databaseError, resourceNotFound } from '@/lib/utils/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiError(async () => {
    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      // Check if it's a "not found" error (PGRST116)
      if (error.code === 'PGRST116') {
        throw resourceNotFound('Listing', id)
      }
      // Other database errors
      throw databaseError(error, 'listings select')
    }

    return NextResponse.json({ listing: data })
  })
}
```

### Insert/Update Operations

```typescript
import { databaseError, resourceConflict } from '@/lib/utils/errors'

export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const body = await request.json()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        name: body.name,
        listing_id: body.listing_id,
      })
      .select()
      .single()

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        throw resourceConflict(
          'Campaign',
          `Campaign with name "${body.name}" already exists`
        )
      }
      throw databaseError(error, 'campaigns insert')
    }

    return NextResponse.json({ campaign: data }, { status: 201 })
  })
}
```

## Credit/Payment Errors

### Check Credit Balance

```typescript
import { insufficientCredits } from '@/lib/utils/errors'

const CREDIT_COST = 50

export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw notAuthenticated()
    }

    // Check credit balance
    const { data: agent } = await supabase
      .from('agents')
      .select('credit_balance')
      .eq('email', user.email)
      .single()

    const balance = agent?.credit_balance || 0

    if (balance < CREDIT_COST) {
      throw insufficientCredits(
        CREDIT_COST,
        balance,
        'AI Caption Generation'
      )
    }

    // ... proceed with operation
  })
}
```

## External Service Errors

### API Calls to Third-Party Services

```typescript
import { externalServiceError } from '@/lib/utils/errors'

export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const body = await request.json()

    try {
      const response = await fetch('https://api.external-service.com/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return NextResponse.json({ data })
    } catch (error) {
      // Retry on 503 or network errors
      const shouldRetry = error instanceof Error &&
        (error.message.includes('503') || error.message.includes('ECONNREFUSED'))

      throw externalServiceError('External API', error, shouldRetry)
    }
  })
}
```

## Custom AppError

### Creating Domain-Specific Errors

```typescript
import { AppError, ApiError } from '@/lib/utils/errors'

// Custom error for business logic
export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const body = await request.json()
    const supabase = createAdminClient()

    // Check campaign status
    const { data: campaign } = await supabase
      .from('listing_campaigns')
      .select('status')
      .eq('id', body.campaign_id)
      .single()

    if (campaign?.status !== 'draft') {
      throw new AppError(
        'Campaign can only be edited in draft status',
        'INVALID_CAMPAIGN_STATUS',
        400,
        {
          campaignId: body.campaign_id,
          currentStatus: campaign?.status,
          requiredStatus: 'draft',
        }
      )
    }

    // ... rest of handler
  })
}
```

### API Error with Endpoint Context

```typescript
import { ApiError } from '@/lib/utils/errors'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiError(async () => {
    const { id } = await params

    // Custom check
    const canDelete = await checkDeletionPermissions(id)

    if (!canDelete) {
      throw new ApiError(
        'Resource cannot be deleted due to existing dependencies',
        'DELETION_BLOCKED',
        409,
        { resourceId: id, reason: 'Has active dependencies' },
        `/api/resource/${id}`,
        'DELETE'
      )
    }

    // ... rest of handler
  })
}
```

## Error Response Format

All errors return a consistent JSON format:

### AppError Response
```json
{
  "error": "Agent not found: social-media-agent",
  "code": "NOT_FOUND",
  "details": {
    "resourceType": "Agent",
    "identifier": "social-media-agent"
  }
}
```

### ApiError Response (with endpoint info)
```json
{
  "error": "Resource cannot be deleted due to existing dependencies",
  "code": "DELETION_BLOCKED",
  "details": {
    "resourceId": "123",
    "reason": "Has active dependencies"
  },
  "endpoint": "/api/resource/123",
  "method": "DELETE"
}
```

### Validation Error Response
```json
{
  "error": "Validation failed",
  "code": "BAD_REQUEST",
  "details": {
    "errors": [
      { "field": "email", "message": "Valid email is required" },
      { "field": "age", "message": "Age must be between 18 and 120" }
    ]
  }
}
```

### Insufficient Credits Response
```json
{
  "error": "Insufficient credits: AI Caption Generation",
  "code": "PAYMENT_REQUIRED",
  "details": {
    "required": 50,
    "balance": 10,
    "shortfall": 40
  }
}
```

## Status Codes Reference

| Factory Function | Status Code | Use Case |
|-----------------|-------------|----------|
| `badRequest()` | 400 | Invalid input, validation failures |
| `unauthorized()` | 401 | Missing or invalid authentication |
| `paymentRequired()` | 402 | Insufficient credits/payment |
| `forbidden()` | 403 | Valid auth but insufficient permissions |
| `notFound()` | 404 | Resource doesn't exist |
| `conflict()` | 409 | Resource already exists, state conflict |
| `unprocessableEntity()` | 422 | Valid syntax but semantic errors |
| `serverError()` | 500 | Internal server errors |
| `serviceUnavailable()` | 503 | Temporary unavailability, retry later |

## Best Practices

1. **Use factory functions** for common errors instead of creating AppError directly
2. **Include helpful details** in the details object for debugging
3. **Use handleApiError wrapper** for all API routes to ensure consistent error handling
4. **Check specific error codes** from Supabase (e.g., PGRST116 for not found)
5. **Log appropriately**: 4xx errors as warnings, 5xx errors as errors
6. **Provide context**: Include resource IDs, types, and relevant state in error details
7. **Use proper status codes**: 401 for auth, 403 for authz, 404 for not found, etc.
8. **Handle retries**: Mark external service errors as retriable when appropriate
