# Render API Documentation

The Render API provides endpoints for generating social media images and carousels from templates with variable substitution, brand kit integration, and Life Here data enrichment.

**Base URL:** `https://app.aerialshots.media/api/v1/render`

---

## Table of Contents

- [Authentication](#authentication)
- [Rate Limits](#rate-limits)
- [Endpoints](#endpoints)
  - [POST /image](#post-image)
  - [POST /carousel](#post-carousel)
  - [GET /job/:jobId](#get-jobjobid)
  - [POST /template](#post-template)
  - [GET /template](#get-template)
- [Types & Schemas](#types--schemas)
- [Error Codes](#error-codes)
- [Webhooks](#webhooks)
- [Examples](#examples)

---

## Authentication

All API endpoints require authentication via the `X-ASM-Secret` header.

```bash
curl -X POST https://app.aerialshots.media/api/v1/render/image \
  -H "Content-Type: application/json" \
  -H "X-ASM-Secret: your-api-secret" \
  -d '{ ... }'
```

### Environment Variables

The API accepts secrets from either of these environment variables:
- `RENDER_API_SECRET` (preferred)
- `AGENT_SHARED_SECRET` (fallback)

### Security Features

- **Constant-time comparison** prevents timing attacks
- **Error message sanitization** in production (generic messages)
- **Development mode bypass** - unauthenticated access allowed in development if no secret is configured

---

## Rate Limits

Rate limits are enforced per API key (or IP address if no key provided).

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/image` | 50 requests | 1 minute |
| `/carousel` | 20 requests | 1 minute |
| `/template` | 100 requests | 1 minute |
| Other endpoints | 100 requests | 1 minute |

### Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 49
X-RateLimit-Reset: 1704067200
X-RateLimit-Policy: 50;w=60
```

### Rate Limit Exceeded Response

```json
HTTP 429 Too Many Requests

{
  "error": "Too many requests",
  "retryAfter": 45
}
```

### Distributed Rate Limiting

When Upstash Redis is configured (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`), rate limits are enforced across all Vercel instances. Otherwise, falls back to in-memory limiting per instance.

---

## Endpoints

### POST /image

Renders a single image from a template with variable substitution.

#### Request

```json
{
  "templateId": "uuid",
  "templateSlug": "just-listed-hero",
  "template": { /* inline template definition */ },
  "variables": {
    "headline": "Just Listed",
    "price": "$425,000",
    "address": "123 Main Street"
  },
  "brandKit": {
    "id": "brand-kit-uuid",
    "primaryColor": "#0077ff",
    "fontFamily": "Inter",
    "logoUrl": "https://example.com/logo.png",
    "agentName": "Jane Smith",
    "agentTitle": "Realtor",
    "agentPhone": "(555) 123-4567"
  },
  "format": "png",
  "quality": 90,
  "width": 1080,
  "height": 1080,
  "webhookUrl": "https://your-server.com/webhook"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `templateId` | UUID | One of three* | Template ID from database |
| `templateSlug` | string | One of three* | Template slug (uses latest published version) |
| `template` | object | One of three* | Inline template definition |
| `variables` | object | No | Key-value pairs for template variables |
| `brandKit` | object | No | Brand customization (colors, fonts, logos) |
| `format` | enum | No | Output format: `png`, `jpeg`, `webp` (default: `png`) |
| `quality` | number | No | JPEG/WebP quality 1-100 (default: 90) |
| `width` | number | No | Override canvas width (100-4096) |
| `height` | number | No | Override canvas height (100-4096) |
| `jobId` | UUID | No | Custom job ID (auto-generated if not provided) |
| `webhookUrl` | URL | No | URL to notify on completion |

*Must provide exactly one of: `templateId`, `templateSlug`, or `template`

#### Response

```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "outputUrl": "https://storage.example.com/renders/550e8400.png",
  "metadata": {
    "width": 1080,
    "height": 1080,
    "format": "png",
    "renderTimeMs": 342,
    "engine": "satori"
  }
}
```

#### Health Check

```
GET /api/v1/render/image

{
  "status": "ok",
  "engine": "satori",
  "version": "1.0.0"
}
```

---

### POST /carousel

Renders multiple slides in parallel for Instagram carousels.

#### Request

```json
{
  "slides": [
    {
      "position": 0,
      "templateSlug": "carousel-hero",
      "variables": { "headline": "Just Listed" }
    },
    {
      "position": 1,
      "templateSlug": "carousel-features",
      "variables": { "feature1": "4 Bedrooms", "feature2": "3 Baths" }
    },
    {
      "position": 2,
      "templateSlug": "carousel-neighborhood",
      "variables": {}
    }
  ],
  "templateSetId": "uuid",
  "templateSetSlug": "just-listed-set",
  "brandKit": {
    "id": "brand-kit-uuid",
    "primaryColor": "#0077ff"
  },
  "lifeHereData": {
    "dining": [...],
    "schools": [...],
    "walkScore": 85
  },
  "listingData": {
    "price": 425000,
    "beds": 4,
    "baths": 3,
    "sqft": 2400
  },
  "agentData": {
    "name": "Jane Smith",
    "phone": "(555) 123-4567"
  },
  "format": "png",
  "quality": 90,
  "parallel": true,
  "maxConcurrent": 4,
  "webhookUrl": "https://your-server.com/webhook"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slides` | array | Yes | Array of slide definitions (1-10 slides) |
| `slides[].position` | number | Yes | Slide position (0-9) |
| `slides[].templateId` | UUID | No | Template ID for this slide |
| `slides[].templateSlug` | string | No | Template slug for this slide |
| `slides[].template` | object | No | Inline template for this slide |
| `slides[].variables` | object | No | Slide-specific variables |
| `slides[].width` | number | No | Override width for this slide |
| `slides[].height` | number | No | Override height for this slide |
| `templateSetId` | UUID | No | Template set for all slides |
| `templateSetSlug` | string | No | Template set slug |
| `brandKit` | object | No | Shared brand customization |
| `lifeHereData` | object | No | Location data for content |
| `listingData` | object | No | Property listing data |
| `agentData` | object | No | Agent information |
| `format` | enum | No | Output format (default: `png`) |
| `quality` | number | No | Image quality 1-100 (default: 90) |
| `parallel` | boolean | No | Render slides in parallel (default: true) |
| `maxConcurrent` | number | No | Max concurrent renders (default: 4, max: 10) |
| `webhookUrl` | URL | No | Completion webhook URL |

#### Response

```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "slides": [
    {
      "position": 0,
      "success": true,
      "imageUrl": "https://storage.example.com/renders/slide-0.png",
      "width": 1080,
      "height": 1080,
      "renderTimeMs": 285
    },
    {
      "position": 1,
      "success": true,
      "imageUrl": "https://storage.example.com/renders/slide-1.png",
      "width": 1080,
      "height": 1080,
      "renderTimeMs": 312
    }
  ],
  "metadata": {
    "slidesRendered": 2,
    "slidesFailed": 0,
    "format": "png",
    "totalRenderTimeMs": 597,
    "engine": "satori"
  }
}
```

#### Health Check

```
GET /api/v1/render/carousel

{
  "status": "ok",
  "engine": "satori",
  "version": "1.0.0",
  "maxSlides": 10,
  "maxConcurrent": 10
}
```

---

### GET /job/:jobId

Retrieves the status and results of a render job.

#### Request

```
GET /api/v1/render/job/550e8400-e29b-41d4-a716-446655440000
```

#### Response - Completed

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "carousel",
  "status": "completed",
  "success": true,
  "createdAt": "2025-01-02T10:30:00Z",
  "completedAt": "2025-01-02T10:30:02Z",
  "outputUrls": [
    "https://storage.example.com/renders/slide-0.png",
    "https://storage.example.com/renders/slide-1.png"
  ],
  "slides": [
    {
      "position": 0,
      "status": "completed",
      "outputUrl": "https://storage.example.com/renders/slide-0.png",
      "renderTimeMs": 285
    }
  ],
  "metadata": {
    "renderEngine": "satori",
    "renderTimeMs": 1250,
    "creditsCost": 0.02,
    "slidesCompleted": 2,
    "slidesTotal": 2
  }
}
```

#### Response - Processing

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "carousel",
  "status": "processing",
  "success": null,
  "createdAt": "2025-01-02T10:30:00Z",
  "completedAt": null
}
```

#### Response - Failed

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "single_image",
  "status": "failed",
  "success": false,
  "createdAt": "2025-01-02T10:30:00Z",
  "completedAt": "2025-01-02T10:30:01Z",
  "error": "Template not found",
  "metadata": {
    "renderEngine": "satori",
    "renderTimeMs": 45
  }
}
```

---

### POST /template

Creates a new render template.

#### Request

```json
{
  "slug": "just-listed-hero",
  "version": "1.0.0",
  "name": "Just Listed Hero Slide",
  "description": "Opening slide for just listed carousels",
  "category": "listing_marketing",
  "subcategory": "just_listed",
  "extends": "base-carousel-slide",
  "canvas": {
    "width": 1080,
    "height": 1080,
    "backgroundColor": "#000000"
  },
  "layers": [
    {
      "id": "headline",
      "name": "Headline",
      "type": "text",
      "visible": true,
      "opacity": 1,
      "position": {
        "type": "absolute",
        "x": 50,
        "y": 400,
        "width": 980,
        "zIndex": 10
      },
      "content": {
        "text": "{{headline}}",
        "fontFamily": "Inter",
        "fontSize": 72,
        "fontWeight": "bold",
        "color": "#ffffff",
        "align": "center"
      }
    },
    {
      "id": "background",
      "type": "image",
      "position": {
        "type": "absolute",
        "x": 0,
        "y": 0,
        "width": 1080,
        "height": 1080,
        "zIndex": 0
      },
      "content": {
        "url": "{{backgroundImage}}",
        "fit": "cover"
      }
    }
  ],
  "variables": [
    {
      "name": "headline",
      "displayName": "Headline Text",
      "type": "string",
      "required": true,
      "default": "Just Listed"
    },
    {
      "name": "backgroundImage",
      "type": "image",
      "required": true,
      "source": "listing",
      "path": "photos[0].url"
    }
  ],
  "brandKitBindings": {
    "primaryColor": "headline.color",
    "fontFamily": "headline.fontFamily"
  },
  "status": "draft",
  "isSystem": false
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | string | Yes | URL-safe identifier (lowercase, hyphens) |
| `version` | string | No | Semantic version (default: "1.0.0") |
| `name` | string | Yes | Display name |
| `description` | string | No | Template description |
| `category` | enum | Yes | Category (see below) |
| `subcategory` | string | No | Sub-category |
| `extends` | string | No | Parent template slug for inheritance |
| `canvas` | object | Yes | Canvas dimensions and background |
| `layers` | array | Yes | Layer definitions |
| `variables` | array | No | Variable definitions |
| `brandKitBindings` | object | No | Brand kit field mappings |
| `status` | enum | No | `draft`, `published`, `archived` (default: `draft`) |
| `isSystem` | boolean | No | System template flag (default: false) |

#### Categories

- `story_archetype` - Story-based carousel templates
- `listing_marketing` - Just listed, just sold, etc.
- `carousel_slide` - Individual slide templates
- `social_post` - Single-image social posts
- `agent_branding` - Agent marketing materials
- `market_update` - Market statistics templates

#### Response

```json
{
  "success": true,
  "template": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "slug": "just-listed-hero",
    "version": "1.0.0",
    "name": "Just Listed Hero Slide",
    "category": "listing_marketing",
    "status": "draft",
    "created_at": "2025-01-02T10:30:00Z"
  }
}
```

---

### GET /template

Lists templates with optional filtering.

#### Request

```
GET /api/v1/render/template?category=listing_marketing&status=published&limit=20&offset=0
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by category |
| `status` | enum | No | Filter by status: `draft`, `published`, `archived` |
| `limit` | number | No | Page size (1-100, default: 50) |
| `offset` | number | No | Pagination offset (default: 0) |

#### Response

```json
{
  "templates": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "slug": "just-listed-hero",
      "version": "1.0.0",
      "name": "Just Listed Hero Slide",
      "description": "Opening slide for just listed carousels",
      "category": "listing_marketing",
      "subcategory": "just_listed",
      "status": "published",
      "is_system": false,
      "created_at": "2025-01-02T10:30:00Z",
      "updated_at": "2025-01-02T12:45:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## Types & Schemas

### Layer Types

| Type | Description |
|------|-------------|
| `text` | Text with font, size, color, alignment |
| `image` | Image from URL with fit options |
| `shape` | Rectangle, circle, or custom shapes |
| `gradient` | Linear or radial gradients |
| `container` | Container for child layers |

### Variable Types

| Type | Description |
|------|-------------|
| `string` | Text value |
| `number` | Numeric value |
| `color` | Hex color code |
| `image` | Image URL |
| `boolean` | True/false |

### Variable Sources

| Source | Description |
|--------|-------------|
| `user_input` | Manually provided by user |
| `brand_kit` | From agent's brand kit |
| `listing` | From property listing data |
| `agent` | From agent profile |
| `life_here` | From Life Here API |
| `system` | System-generated values |

### Brand Kit Fields

```typescript
interface BrandKit {
  id: string
  primaryColor?: string    // Hex color
  secondaryColor?: string
  accentColor?: string
  fontFamily?: string
  logoUrl?: string
  agentName?: string
  agentTitle?: string
  agentPhone?: string
  agentEmail?: string
  agentPhotoUrl?: string
  brokerageName?: string
  brokerageLogo?: string
}
```

---

## Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid request | Request body validation failed |
| 401 | Missing authentication header | No X-ASM-Secret provided |
| 401 | Invalid authentication | Secret doesn't match |
| 401 | Server configuration error | Secret not configured on server |
| 404 | Template not found | Template ID/slug not found or not published |
| 404 | Job not found | Job ID doesn't exist |
| 409 | Template already exists | Slug+version combination exists |
| 429 | Too many requests | Rate limit exceeded |
| 500 | Render failed | Internal rendering error |
| 500 | Internal server error | Unexpected error |

### Error Response Format

```json
{
  "error": "Invalid request",
  "details": {
    "templateId": ["Must be a valid UUID"],
    "slides": ["Required"]
  }
}
```

---

## Webhooks

When a `webhookUrl` is provided, the API sends a POST request on job completion.

### Webhook Payload

```json
{
  "event": "render.completed",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "success": true,
  "outputUrls": [
    "https://storage.example.com/renders/slide-0.png"
  ],
  "metadata": {
    "type": "carousel",
    "slidesRendered": 3,
    "slidesFailed": 0,
    "totalRenderTimeMs": 1250,
    "engine": "satori"
  },
  "timestamp": "2025-01-02T10:30:02Z"
}
```

### Failure Payload

```json
{
  "event": "render.failed",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "success": false,
  "error": "Template not found",
  "metadata": {
    "type": "single_image",
    "renderTimeMs": 45
  },
  "timestamp": "2025-01-02T10:30:01Z"
}
```

---

## Examples

### Render a Just Listed Post

```bash
curl -X POST https://app.aerialshots.media/api/v1/render/image \
  -H "Content-Type: application/json" \
  -H "X-ASM-Secret: your-secret" \
  -d '{
    "templateSlug": "just-listed-square",
    "variables": {
      "headline": "JUST LISTED",
      "price": "$425,000",
      "address": "123 Main Street, Orlando, FL",
      "beds": "4",
      "baths": "3",
      "sqft": "2,400"
    },
    "brandKit": {
      "id": "agent-brand-kit",
      "primaryColor": "#0077ff",
      "agentName": "Jane Smith",
      "agentTitle": "REALTOR",
      "logoUrl": "https://example.com/logo.png"
    },
    "format": "png",
    "quality": 95
  }'
```

### Render a 7-Slide Carousel

```bash
curl -X POST https://app.aerialshots.media/api/v1/render/carousel \
  -H "Content-Type: application/json" \
  -H "X-ASM-Secret: your-secret" \
  -d '{
    "templateSetSlug": "neighborhood-guide-set",
    "slides": [
      { "position": 0, "variables": { "hook": "Discover Your New Neighborhood" } },
      { "position": 1 },
      { "position": 2 },
      { "position": 3 },
      { "position": 4 },
      { "position": 5 },
      { "position": 6, "variables": { "cta": "Schedule a Tour Today!" } }
    ],
    "listingData": {
      "address": "123 Main Street",
      "city": "Orlando",
      "state": "FL",
      "price": 425000
    },
    "lifeHereData": {
      "walkScore": 85,
      "diningCount": 45,
      "schoolsNearby": 12,
      "parksNearby": 8
    },
    "brandKit": {
      "id": "agent-brand-kit",
      "primaryColor": "#0077ff"
    },
    "parallel": true,
    "maxConcurrent": 4
  }'
```

### Poll for Job Status

```bash
curl https://app.aerialshots.media/api/v1/render/job/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-ASM-Secret: your-secret"
```

### Create a Template

```bash
curl -X POST https://app.aerialshots.media/api/v1/render/template \
  -H "Content-Type: application/json" \
  -H "X-ASM-Secret: your-secret" \
  -d '{
    "slug": "price-reduction-alert",
    "name": "Price Reduction Alert",
    "category": "listing_marketing",
    "canvas": {
      "width": 1080,
      "height": 1080,
      "backgroundColor": "#1a1a1a"
    },
    "layers": [
      {
        "id": "badge",
        "type": "text",
        "position": { "type": "absolute", "x": 50, "y": 50, "zIndex": 10 },
        "content": {
          "text": "PRICE REDUCED",
          "fontSize": 24,
          "fontWeight": "bold",
          "color": "#ff3b30"
        }
      }
    ],
    "status": "draft"
  }'
```

---

## Rendering Engine

The API uses **Satori + Sharp** as the primary rendering engine:

- **Satori**: Converts React-like JSX to SVG
- **Sharp**: Converts SVG to PNG/JPEG/WebP

### Performance Targets

| Metric | Target |
|--------|--------|
| Single image render | < 500ms P95 |
| 7-slide carousel | < 15s total |
| Concurrent renders | Up to 10 slides |

### Supported Features

- Text with custom fonts (Google Fonts supported)
- Images from HTTPS URLs (with SSRF protection)
- Solid colors and gradients
- Rounded corners
- Opacity and blending
- Variable substitution
- Template inheritance

### SSRF Protection

Image URLs are validated against:
- Must use HTTPS protocol
- Blocked internal IPs (127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x)
- Blocked localhost
- Whitelisted domains only in production

---

## Circuit Breaker Protection

The API includes circuit breaker protection for resilience:

| Service | Failure Threshold | Recovery Timeout |
|---------|-------------------|------------------|
| Supabase Storage | 5 failures | 30 seconds |
| Google Fonts | 5 failures | 30 seconds |
| Claude API | 3 failures | 60 seconds |
| Life Here API | 5 failures | 30 seconds |

When a circuit opens, requests fail fast with a clear error message rather than waiting for timeouts.
