# Error Handling Migration Example

This document shows a real-world example of migrating an existing API route to use the new centralized error handling utilities.

## Before: Legacy Error Handling

```typescript
// src/app/api/leads/route.ts (BEFORE)
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Create lead
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        listing_id: body.listing_id || null,
        agent_id: body.agent_id || null,
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        message: body.message || null,
        status: 'new',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to create lead:', error)
      return NextResponse.json(
        { error: 'Failed to submit inquiry' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      lead_id: lead.id,
    })
  } catch (error) {
    console.error('Lead submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## After: Using New Error Utilities

```typescript
// src/app/api/leads/route.ts (AFTER)
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  handleApiError,
  validationError,
  databaseError,
  resourceConflict,
} from '@/lib/utils/errors'

export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const body = await request.json()

    // Validate with structured errors
    const errors: Array<{ field: string; message: string }> = []

    if (!body.name || body.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Name is required' })
    }

    if (!body.email) {
      errors.push({ field: 'email', message: 'Email is required' })
    } else {
      const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
      if (!emailRegex.test(body.email)) {
        errors.push({ field: 'email', message: 'Invalid email format' })
      }
    }

    if (errors.length > 0) {
      throw validationError(errors, 'Lead validation failed')
    }

    const supabase = createAdminClient()

    // Create lead with better error handling
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        listing_id: body.listing_id || null,
        agent_id: body.agent_id || null,
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        message: body.message || null,
        status: 'new',
      })
      .select('id')
      .single()

    if (error) {
      // Check for duplicate email (if unique constraint exists)
      if (error.code === '23505') {
        throw resourceConflict(
          'Lead',
          `A lead with email ${body.email} already exists`
        )
      }
      throw databaseError(error, 'leads insert')
    }

    return NextResponse.json({
      success: true,
      lead_id: lead.id,
    })
  })
}
```

## Key Improvements

### 1. Error Response Consistency

**Before:**
```json
{ "error": "Name and email are required" }
```

**After:**
```json
{
  "error": "Lead validation failed",
  "code": "BAD_REQUEST",
  "details": {
    "errors": [
      { "field": "name", "message": "Name is required" },
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### 2. Better Field-Level Validation

The new approach returns all validation errors at once, not just the first one encountered. This provides a better user experience as the client can show all errors simultaneously.

### 3. Structured Error Codes

**Before:** Generic error messages without codes
**After:** Structured error codes (`BAD_REQUEST`, `INTERNAL_ERROR`, etc.) that clients can programmatically handle

### 4. Better Database Error Handling

**Before:**
```typescript
if (error) {
  console.error('Failed to create lead:', error)
  return NextResponse.json(
    { error: 'Failed to submit inquiry' },
    { status: 500 }
  )
}
```

**After:**
```typescript
if (error) {
  // Handle specific error cases
  if (error.code === '23505') {
    throw resourceConflict('Lead', `A lead with email ${body.email} already exists`)
  }
  // Generic database error with context
  throw databaseError(error, 'leads insert')
}
```

### 5. Cleaner Code Structure

**Before:** Nested try-catch with manual error responses
**After:** Clean async handler with automatic error handling via `handleApiError`

### 6. Better Error Context

**Before:**
```json
{ "error": "Failed to submit inquiry" }
```

**After:**
```json
{
  "error": "Database error in leads insert: duplicate key value violates unique constraint",
  "code": "INTERNAL_ERROR",
  "details": {
    "dbCode": "23505",
    "dbDetails": "email_unique"
  }
}
```

## Migration Checklist

When migrating an API route, follow these steps:

- [ ] Import error utilities (`handleApiError`, specific error factories)
- [ ] Wrap handler with `handleApiError(async () => { ... })`
- [ ] Replace manual validation with `validationError()` for field errors
- [ ] Replace authentication checks with `notAuthenticated()` / `notAuthorized()`
- [ ] Replace database error handling with `databaseError()`
- [ ] Check for specific error codes (e.g., PGRST116, 23505) and use appropriate helpers
- [ ] Replace generic 404s with `resourceNotFound()`
- [ ] Replace credit checks with `insufficientCredits()`
- [ ] Remove manual `NextResponse.json({ error: ... }, { status: ... })` returns
- [ ] Remove manual try-catch blocks (unless needed for cleanup)
- [ ] Test the route to ensure errors are properly formatted

## Testing the Migration

After migration, test these scenarios:

1. **Validation Errors**
   - Missing required fields
   - Invalid formats (email, phone, etc.)
   - Out-of-range values

2. **Database Errors**
   - Duplicate keys (if applicable)
   - Foreign key violations
   - Not found errors

3. **Authentication/Authorization**
   - Unauthenticated requests
   - Unauthorized access

4. **Success Cases**
   - Valid requests should still work
   - Response format should be unchanged (for success)

## Example Error Responses After Migration

### Validation Error
```json
{
  "error": "Lead validation failed",
  "code": "BAD_REQUEST",
  "details": {
    "errors": [
      { "field": "name", "message": "Name is required" },
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### Duplicate Lead
```json
{
  "error": "Lead already exists or conflicts with existing data",
  "code": "CONFLICT",
  "details": {
    "resourceType": "Lead"
  }
}
```

### Database Error
```json
{
  "error": "Database error in leads insert: connection timeout",
  "code": "INTERNAL_ERROR",
  "details": {
    "dbCode": "TIMEOUT",
    "dbDetails": "Connection pool exhausted"
  }
}
```

## Benefits of Migration

1. **Client Development** - Frontend developers can rely on consistent error format
2. **Debugging** - Error codes make it easier to track specific issues
3. **Monitoring** - Structured errors integrate better with error tracking tools
4. **Maintainability** - Less boilerplate code, easier to update error handling
5. **Type Safety** - TypeScript ensures correct error usage
6. **User Experience** - Better error messages help users fix issues faster
