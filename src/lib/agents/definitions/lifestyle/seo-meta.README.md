# SEO Meta Generator Agent

## Overview

The **seo-meta** agent generates SEO-optimized meta tags for property listings and agent portfolio pages. It uses AI to create compelling, keyword-rich titles and descriptions that improve search engine rankings and click-through rates.

## Agent Details

- **Slug**: `seo-meta`
- **Category**: `lifestyle`
- **Execution Mode**: `sync`
- **Domain**: `portal.aerialshots.media`

## Purpose

Generate complete SEO metadata including:
- Title tags (50-60 characters)
- Meta descriptions (150-160 characters)
- Open Graph tags for social sharing
- Twitter Card meta tags
- Structured data (JSON-LD) for search engines

## Input

```typescript
{
  pageType: 'property' | 'agent' | 'listing',
  entityId: string  // listing ID or agent ID
}
```

## Output

```typescript
{
  title: string,
  description: string,
  openGraph: {
    title: string,
    description: string,
    images: Array<{ url: string; width: number; height: number }>,
    type: string,
    url?: string
  },
  twitter: {
    card: string,
    title: string,
    description: string,
    images?: string[]
  },
  jsonLd: Record<string, unknown>  // Schema.org structured data
}
```

## Usage Examples

### Example 1: Generate SEO for Property Listing

```typescript
import { executeAgent } from '@/lib/agents'

const result = await executeAgent({
  agentSlug: 'seo-meta',
  triggerSource: 'manual',
  input: {
    pageType: 'property',
    entityId: 'abc-123-def',
  },
})

if (result.success) {
  const { meta } = result.output
  console.log('Title:', meta.title)
  console.log('Description:', meta.description)
}
```

### Example 2: Generate SEO for Agent Portfolio

```typescript
const result = await executeAgent({
  agentSlug: 'seo-meta',
  triggerSource: 'manual',
  input: {
    pageType: 'agent',
    entityId: 'agent-uuid',
  },
})
```

### Example 3: Use in Next.js Page

```typescript
// In app/property/[listingId]/page.tsx
import { executeAgent } from '@/lib/agents'
import type { Metadata } from 'next'

export async function generateMetadata({ params }): Promise<Metadata> {
  const { listingId } = await params

  const result = await executeAgent({
    agentSlug: 'seo-meta',
    triggerSource: 'api',
    input: {
      pageType: 'property',
      entityId: listingId,
    },
  })

  if (!result.success) {
    return { title: 'Property Not Found' }
  }

  const { meta } = result.output

  return {
    title: meta.title,
    description: meta.description,
    openGraph: meta.openGraph,
    twitter: meta.twitter,
  }
}
```

## Sample Output

### For Property Listing

```json
{
  "title": "3BR Modern Home in Cherry Creek | $750,000 | Denver, CO",
  "description": "Stunning 3-bed, 2-bath modern home in Cherry Creek. 2,400 sqft with open floor plan, gourmet kitchen, and mountain views. Schedule your showing today!",
  "openGraph": {
    "title": "3-Bedroom Modern Home in Cherry Creek, Denver",
    "description": "Discover this beautiful 2,400 sqft home in the heart of Cherry Creek. Features include gourmet kitchen, open floor plan, and breathtaking mountain views.",
    "images": [
      {
        "url": "https://storage.aerialshots.media/listings/hero.jpg",
        "width": 1200,
        "height": 630
      }
    ],
    "type": "website",
    "url": "https://app.aerialshots.media/property/abc123"
  },
  "twitter": {
    "card": "summary_large_image",
    "title": "3BR Modern Home in Cherry Creek | $750K",
    "description": "Stunning 2,400 sqft home with mountain views in Cherry Creek, Denver.",
    "images": ["https://storage.aerialshots.media/listings/hero.jpg"]
  },
  "jsonLd": {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": "123 Main St, Denver, CO",
    "description": "Beautiful 3-bedroom, 2-bathroom home...",
    "url": "https://app.aerialshots.media/property/abc123",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "123 Main St",
      "addressLocality": "Denver",
      "addressRegion": "CO",
      "postalCode": "80206"
    },
    "numberOfRooms": 3,
    "numberOfBathroomsTotal": 2,
    "floorSize": {
      "@type": "QuantitativeValue",
      "value": 2400,
      "unitCode": "SQF"
    },
    "offers": {
      "@type": "Offer",
      "price": "750000",
      "priceCurrency": "USD"
    },
    "image": "https://storage.aerialshots.media/listings/hero.jpg"
  }
}
```

### For Agent Portfolio

```json
{
  "title": "Jane Doe | Denver Real Estate Agent",
  "description": "View Jane Doe's portfolio of luxury homes in Denver. 50+ successful sales, expert local knowledge, and exceptional client service.",
  "openGraph": {
    "title": "Jane Doe - Denver Real Estate Expert",
    "description": "Luxury real estate specialist serving Denver and Cherry Creek neighborhoods. Browse listings and connect with Jane today.",
    "images": [
      {
        "url": "https://cdn.example.com/agents/jane-headshot.jpg",
        "width": 1200,
        "height": 630
      }
    ],
    "type": "profile",
    "url": "https://portal.aerialshots.media/agents/jane-doe"
  },
  "twitter": {
    "card": "summary",
    "title": "Jane Doe - Real Estate Agent",
    "description": "Luxury real estate specialist in Denver"
  },
  "jsonLd": {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": "Jane Doe",
    "description": "Luxury real estate specialist...",
    "url": "https://portal.aerialshots.media/agents/jane-doe"
  }
}
```

## SEO Best Practices

The agent follows these SEO best practices:

1. **Title Tags**
   - 50-60 characters (optimal for search results)
   - Primary keyword at the beginning
   - Includes location, price, and property features
   - Brand name at the end

2. **Meta Descriptions**
   - 150-160 characters (optimal for search results)
   - Compelling call-to-action
   - Includes key features and benefits
   - Natural keyword usage

3. **Open Graph Tags**
   - Optimized for social sharing on Facebook, LinkedIn
   - Custom titles and descriptions for social context
   - High-quality hero images (1200x630px)

4. **Twitter Cards**
   - Large image cards for properties
   - Summary cards for agent profiles
   - Optimized for Twitter's display format

5. **Structured Data (JSON-LD)**
   - Schema.org markup for search engines
   - RealEstateListing type for properties
   - RealEstateAgent type for agent pages
   - Rich snippets for better search visibility

## Configuration

Default configuration:
```typescript
{
  maxTokens: 1500,
  temperature: 0.5,  // Lower temperature for consistent, focused output
}
```

## Error Handling

If AI generation fails, the agent falls back to basic metadata generation using the existing pattern from the page components.

## Dependencies

- AI client (`@/lib/ai/client`)
- Supabase admin client (for data fetching)
- Agent registry and execution framework

## Related Files

- **Agent Definition**: `src/lib/agents/definitions/lifestyle/seo-meta.ts`
- **Usage Examples**: `src/lib/agents/definitions/lifestyle/seo-meta.example.ts`
- **Existing Metadata**: See `src/app/property/[listingId]/page.tsx` and `src/app/agents/[agentSlug]/page.tsx`

## Integration Points

This agent can be integrated into:

1. **Next.js Metadata API** - Use in `generateMetadata()` functions
2. **API Endpoints** - Provide SEO data via API
3. **Static Site Generation** - Pre-generate SEO metadata
4. **Admin Dashboard** - Preview and edit SEO tags
5. **Listing Import** - Auto-generate SEO when importing listings

## Future Enhancements

- [ ] Support for multi-language SEO
- [ ] A/B testing for title/description variants
- [ ] SEO scoring and recommendations
- [ ] Keyword density analysis
- [ ] Competitor analysis integration
- [ ] Auto-update when listing details change
