# Virtual Staging Implementation - Gemini AI Integration

## Overview

This document describes the implementation of the Gemini AI integration for virtual staging in the ASM Portal.

## What Was Implemented

### 1. Gemini AI Image Generation
**File:** `src/lib/integrations/virtual-staging/client.ts`

Replaced mock URL generation with actual Gemini AI processing:

```typescript
// Before (lines 346-366):
case 'gemini':
  return `https://storage.example.com/staged/${Date.now()}.jpg`

// After:
case 'gemini':
  return await generateWithGeminiProvider(params.imageUrl, prompt, params.roomType, params.style)
```

### 2. Gemini Provider Integration
**New Function:** `generateWithGeminiProvider()`

This function orchestrates the complete staging workflow:

1. **Call Gemini API** - Uses the existing `callGeminiAPI()` from `providers/gemini.ts`
2. **Generate Staged Image** - Gemini creates a photorealistic staged version
3. **Convert Response** - Extracts base64 image from Gemini response
4. **Upload to Supabase** - Stores the staged image in the `virtual-staging` bucket
5. **Return Public URL** - Returns the public URL of the staged image

**Key Features:**
- Error handling at each step
- Structured logging for debugging
- Automatic cleanup on failure
- Unique filename generation to avoid collisions

### 3. Existing Gemini Provider
**File:** `src/lib/integrations/virtual-staging/providers/gemini.ts`

Already existed and provides:
- Google Generative AI client initialization
- Image-to-base64 conversion
- Gemini API calls with vision model
- Prompt engineering for staging
- Response validation

Uses **gemini-2.0-flash-exp** model with:
- Multi-modal support (image + text input)
- Image generation capabilities via `responseModalities: ['image', 'text']`
- Photorealistic output quality

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Virtual Staging Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User Request                                            │
│     ↓                                                        │
│  2. generateStagedImage() (client.ts)                       │
│     ↓                                                        │
│  3. Create job record in database                           │
│     ↓                                                        │
│  4. processWithAIProvider()                                 │
│     ↓                                                        │
│  5. generateWithGeminiProvider()                            │
│     ├─→ callGeminiAPI() (providers/gemini.ts)              │
│     │   ├─→ Fetch original image                           │
│     │   ├─→ Convert to base64                              │
│     │   ├─→ Build staging prompt                           │
│     │   └─→ Generate with Gemini                           │
│     ├─→ Convert base64 to buffer                           │
│     ├─→ Upload to Supabase Storage                         │
│     └─→ Get public URL                                     │
│     ↓                                                        │
│  6. Update job record with result                           │
│     ↓                                                        │
│  7. Return staged image URL to user                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Storage Structure

**Supabase Storage Bucket:** `virtual-staging`

**Path Pattern:**
```
virtual-staging/
└── staged_{roomType}_{style}_{timestamp}_{randomId}.jpg
```

**Example:**
```
virtual-staging/staged_living_room_modern_1735849200000_a3b2c1.jpg
```

## API Configuration

### Required Environment Variable
```bash
GOOGLE_AI_API_KEY=your_gemini_api_key_here
```

### Error Handling

1. **Missing API Key**
   - Status: `not_configured`
   - Error: "GOOGLE_AI_API_KEY not configured. Add it to your environment variables."
   - Returns: `null` URL, job marked as failed

2. **Image Fetch Failure**
   - Logs error with source URL
   - Returns: `null` URL, job marked as failed

3. **Gemini Generation Failure**
   - Logs error with Gemini response
   - Returns: `null` URL, job marked as failed

4. **Upload Failure**
   - Logs error with Supabase details
   - Returns: `null` URL, job marked as failed

## Usage Example

```typescript
import { generateStagedImage } from '@/lib/integrations/virtual-staging/client'

const result = await generateStagedImage({
  image_url: 'https://example.com/empty-room.jpg',
  room_type: 'living_room',
  style: 'modern',
  provider: 'gemini',
  listing_id: 'listing_123',
  remove_existing_furniture: false,
  furniture_items: ['sofa', 'coffee_table', 'rug'],
  placement_hints: ['Center the sofa', 'Add floor lamp in corner']
})

if (result.success) {
  console.log('Staged image URL:', result.staged_url)
  console.log('Staging ID:', result.staging_id)
} else {
  console.error('Staging failed:', result.error)
}
```

## Prompt Engineering

The system builds rich prompts for Gemini including:

- **Room Type** - Guides furniture selection
- **Style** - Determines aesthetic (modern, luxury, coastal, etc.)
- **Furniture Removal** - Optionally remove existing items first
- **Specific Items** - Request particular furniture pieces
- **Placement Hints** - Guide where items should go
- **Quality Requirements** - Photorealistic, proper lighting, shadows

**Example Prompt:**
```
You are a professional virtual stager. Transform this empty living_room
into a beautifully staged space using modern style furniture and decor.

Guidelines:
- Maintain photorealistic quality
- Ensure proper lighting and realistic shadows
- Keep the original room structure, walls, windows, and floors intact
- Add appropriate furniture that fits the scale of the room

Include these furniture items: sofa, coffee_table, rug
Placement notes: Center the sofa. Add floor lamp in corner.

Based on this empty room image, generate a new image showing the same room but virtually staged with beautiful, realistic furniture and decor in modern style.

The staging should:
- Keep the exact same room structure, walls, floors, and windows
- Add appropriate furniture for a living_room
- Use photorealistic quality with proper lighting and shadows
- Match the perspective and lighting of the original photo
```

## Performance

**Processing Time:**
- Base: ~10 seconds
- With furniture removal: +5 seconds
- Per extra furniture item (>5): +1 second

**Model:** gemini-2.0-flash-exp (fast, cost-effective)

**Image Quality:** JPEG at default quality (~85-90%)

## Database Schema

**Table:** `virtual_staging_jobs` (already exists)

```sql
id               TEXT PRIMARY KEY
original_url     TEXT NOT NULL
staged_url       TEXT
room_type        TEXT NOT NULL
style            TEXT NOT NULL
provider         TEXT NOT NULL DEFAULT 'gemini'
status           TEXT NOT NULL  -- 'pending' | 'processing' | 'completed' | 'failed' | 'timeout'
error_message    TEXT
listing_id       TEXT
is_rush          BOOLEAN DEFAULT false
remove_existing  BOOLEAN DEFAULT false
placement_hints  TEXT[]
furniture_items  TEXT[]
created_at       TIMESTAMP DEFAULT NOW()
completed_at     TIMESTAMP
```

## Logging

All operations are logged with structured data:

```typescript
// Success
logger.info({
  publicUrl: 'https://...',
  processingTime: 5000
}, 'Staged image generated and uploaded successfully')

// Failure
logger.error({
  status: 'error',
  error: 'Image generation not available'
}, 'Gemini staging failed')
```

## Testing

Test file: `src/lib/integrations/virtual-staging/__tests__/gemini-integration.test.ts`

**Test Coverage:**
- ✅ Successful generation and upload
- ✅ Missing API key handling
- ✅ Gemini generation failures
- ✅ Supabase upload failures
- ✅ Parameter passing (room type, style, furniture)

Run tests:
```bash
npm test src/lib/integrations/virtual-staging/__tests__/gemini-integration.test.ts
```

## Future Enhancements

### Other Providers (Stubbed)
- Stable Diffusion (with ControlNet for better room preservation)
- REimagineHome API (specialized real estate staging)
- Apply Design API (another staging service)

### Potential Improvements
1. **Batch Processing** - Stage multiple rooms at once
2. **Before/After Comparisons** - Store both versions side-by-side
3. **Style Transfer** - Apply staging style from reference images
4. **Cost Tracking** - Monitor API usage and costs
5. **Quality Metrics** - Score staging quality automatically
6. **A/B Testing** - Compare different styles for same room

## Related Files

- `src/lib/integrations/virtual-staging/client.ts` - Main client
- `src/lib/integrations/virtual-staging/providers/gemini.ts` - Gemini provider
- `src/lib/storage/media.ts` - Media storage utilities
- `src/lib/supabase/admin.ts` - Supabase admin client
- `src/lib/logger.ts` - Structured logging

## Security Notes

1. **API Key Protection** - Never expose `GOOGLE_AI_API_KEY` in client code
2. **Input Validation** - Image URLs are validated before processing
3. **Storage Permissions** - `virtual-staging` bucket should be public-read only
4. **Rate Limiting** - Consider adding rate limits for staging requests
5. **Cost Controls** - Monitor Gemini API usage to avoid unexpected costs

## Deployment Checklist

- [ ] Set `GOOGLE_AI_API_KEY` in production environment
- [ ] Create `virtual-staging` bucket in Supabase Storage
- [ ] Set bucket to public-read permissions
- [ ] Run database migration if schema changes needed
- [ ] Test with real estate images in staging environment
- [ ] Monitor logs for errors during rollout
- [ ] Set up cost alerts for Gemini API usage

## Support

For issues or questions:
- Check logs via `integrationLogger.child({ integration: 'virtual-staging' })`
- Review Gemini API quotas and limits
- Verify Supabase Storage configuration
- Test with known-good images first
