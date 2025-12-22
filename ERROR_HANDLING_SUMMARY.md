# Error Handling Implementation Summary

## Overview

This document summarizes the centralized error handling utilities created for the Aerial Shots Portal. The implementation provides standardized error classes, helpers, and consistent API error responses across the application.

## Files Created

### 1. `/src/lib/utils/errors.ts` (Main Error Utilities)

The core error handling module with the following exports:

#### Error Classes
- **`AppError`** - Base application error class
  - Properties: `message`, `code`, `status`, `details`, `isOperational`
  - Methods: `toJSON()`

- **`ApiError`** - API-specific error class (extends AppError)
  - Additional properties: `endpoint`, `method`
  - Methods: `toJSON()` (overridden)

#### Type Guards
- `isAppError(error)` - Check if error is AppError instance
- `isApiError(error)` - Check if error is ApiError instance
- `isError(error)` - Check if error is Error instance

#### Factory Functions (Common HTTP Errors)
- `badRequest(message?, details?)` - 400 Bad Request
- `unauthorized(message?, details?)` - 401 Unauthorized
- `paymentRequired(message?, details?)` - 402 Payment Required
- `forbidden(message?, details?)` - 403 Forbidden
- `notFound(message?, details?)` - 404 Not Found
- `conflict(message?, details?)` - 409 Conflict
- `unprocessableEntity(message?, details?)` - 422 Unprocessable Entity
- `serverError(message?, details?)` - 500 Internal Server Error
- `serviceUnavailable(message?, details?)` - 503 Service Unavailable

#### Specialized Error Helpers
- `validationError(errors[], message?)` - Creates validation error with field-level errors
- `insufficientCredits(required, balance, description?)` - Payment required error
- `notAuthenticated(message?)` - Authentication required error
- `notAuthorized(message?, requiredRole?)` - Authorization error
- `resourceNotFound(resourceType, identifier?)` - Resource not found error
- `resourceConflict(resourceType, message?)` - Resource conflict error
- `databaseError(error, context?)` - Database operation error
- `externalServiceError(serviceName, error, shouldRetry?)` - External service error

#### Response Helpers
- `createErrorResponse(error)` - Creates NextResponse from any error
- `handleApiError(handler)` - Wraps API route handlers with standardized error handling

### 2. `/src/lib/utils/errors.examples.md` (Documentation)

Comprehensive documentation with usage examples:
- Basic API route error handling patterns
- Authentication and authorization examples
- Input validation patterns
- Database error handling
- Credit/payment checks
- External service error handling
- Custom error creation examples
- Error response format specifications
- Status codes reference
- Best practices guide

### 3. `/src/lib/utils/errors.test.ts` (Tests)

Test suite verifying all error utilities work correctly:
- AppError and ApiError class functionality
- Factory function status codes and error codes
- Type guard accuracy
- Validation error formatting
- Credit error calculations
- Resource helper messages
- Database error context preservation
- JSON serialization

## Files Modified

### 1. `/src/lib/agents/executor.ts`

Updated the agent executor to use proper error handling instead of silent failures:

**Changes:**
- Imported error utilities (`AppError`, `databaseError`, `resourceNotFound`, `externalServiceError`)
- Database errors now throw `databaseError` instead of just logging
- Agent not found throws `resourceNotFound` instead of generic Error
- Inactive agent throws `AppError` with proper code and status
- Missing system prompt throws `AppError` instead of returning error result
- AI generation errors wrapped with `externalServiceError`
- Update failures now throw errors instead of silently logging
- Error logging differentiated by severity (4xx = warning, 5xx = error)
- Better error context and details in all error paths

**Functions Updated:**
- `executeAgent()` - Proper error throwing and handling
- `executePromptBasedAgent()` - Throws errors instead of returning error results
- `updateExecution()` - Throws on failure instead of silent logging
- `getExecution()` - Throws `resourceNotFound` or `databaseError` instead of returning null
- `cancelExecution()` - Throws errors and validates execution state
- `retryExecution()` - Throws errors for invalid states

### 2. `/src/lib/agents/types.ts`

Updated the `AgentExecutionResult` interface:
- Added optional `errorCode?: string` field to support structured error codes

## Error Response Format

All errors return a consistent JSON format:

### Standard AppError
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

### ApiError (with endpoint context)
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

### Validation Errors
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

## HTTP Status Codes Used

| Code | Factory Function | Use Case |
|------|-----------------|----------|
| 400 | `badRequest()` | Invalid input, validation failures |
| 401 | `unauthorized()` | Missing or invalid authentication |
| 402 | `paymentRequired()` | Insufficient credits/payment |
| 403 | `forbidden()` | Valid auth but insufficient permissions |
| 404 | `notFound()` | Resource doesn't exist |
| 409 | `conflict()` | Resource already exists, state conflict |
| 422 | `unprocessableEntity()` | Valid syntax but semantic errors |
| 500 | `serverError()` | Internal server errors |
| 503 | `serviceUnavailable()` | Temporary unavailability, retry later |

## Usage Patterns

### Simple API Route
```typescript
export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const body = await request.json()

    if (!body.name) {
      throw badRequest('Name is required')
    }

    // ... rest of handler

    return NextResponse.json({ success: true })
  })
}
```

### Database Query with Error Handling
```typescript
const { data, error } = await supabase
  .from('table')
  .select()
  .eq('id', id)
  .single()

if (error) {
  if (error.code === 'PGRST116') {
    throw resourceNotFound('Resource', id)
  }
  throw databaseError(error, 'table select')
}
```

### Credit Check
```typescript
if (balance < COST) {
  throw insufficientCredits(COST, balance, 'Operation Name')
}
```

## Benefits

1. **Consistency** - All API errors follow the same format
2. **Type Safety** - TypeScript support with proper types
3. **Better Debugging** - Structured error codes and details
4. **Client-Friendly** - Predictable error responses for frontend
5. **Logging** - Automatic differentiation between client/server errors
6. **Maintainability** - Centralized error creation and handling
7. **Documentation** - Clear examples and patterns to follow

## Testing

Run the test suite:
```bash
npx tsx src/lib/utils/errors.test.ts
```

All tests verify:
- Error class functionality
- Factory function correctness
- Type guard accuracy
- JSON serialization
- Error details preservation

## Next Steps

To complete the error handling standardization:

1. **Update Existing API Routes** - Gradually migrate existing routes to use new error utilities
2. **Add More Tests** - Create comprehensive unit tests for edge cases
3. **Client Integration** - Update frontend error handling to consume new error format
4. **Monitoring** - Integrate error tracking (Sentry, etc.) with error codes
5. **Documentation** - Add error codes to API documentation

## Migration Guide

To migrate an existing API route:

**Before:**
```typescript
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**After:**
```typescript
if (!user) {
  throw notAuthenticated()
}
// or use handleApiError wrapper to catch all errors
```

**Before:**
```typescript
try {
  // ... operation
} catch (error) {
  return NextResponse.json(
    { error: 'Internal error' },
    { status: 500 }
  )
}
```

**After:**
```typescript
return handleApiError(async () => {
  // ... operation
  // Errors are automatically caught and formatted
})
```
