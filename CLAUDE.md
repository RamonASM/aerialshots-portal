# CLAUDE.md - ASM Portal

This file provides guidance to Claude Code when working with the ASM Portal codebase.

## Project Overview

ASM Portal is a Next.js 16 application for Aerial Shots Media, providing:
- **Agent Dashboard** - Real estate agents manage listings, leads, AI tools
- **Media Delivery** - Post-shoot media delivery pages for clients
- **Property Websites** - Public-facing property marketing pages
- **Community Pages** - SEO-optimized neighborhood/area guides
- **Admin Panel** - Staff management, QC workflow, curation tools
- **Team Portals** - Photographer and videographer job management
- **Booking Flow** - Multi-step booking with package selection, scheduling, payment

**Production URL:** `https://app.aerialshots.media`
**Marketing Site:** `https://aerialshots.media` (same codebase, (marketing) route group)
**Blog:** `https://blog.aerialshots.media` (separate Next.js app at `~/aerialshots-blog-frontend`)
**AI Agent Backend:** `~/asm-agent-backend` (Express.js API for AI booking agents)

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Styling:** Tailwind CSS + shadcn/ui components
- **AI:** Anthropic Claude API, Google Gemini for content/image generation
- **State Management:** Zustand with persistence + Immer
- **Payments:** Stripe Elements
- **Testing:** Vitest (1500+ tests passing)
- **Integrations:** Supabase Storage (media), Google Places, Ticketmaster, Resend (email), Aloft (airspace), FoundDR (HDR), Cubicasa (floor plans)

## Key Commands

```bash
npm run dev        # Start development server
npm run build      # Production build (runs TypeScript check)
npm run lint       # ESLint
npx supabase db push  # Apply migrations (requires linked project)
```

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login)
│   ├── (marketing)/       # Marketing site pages
│   │   ├── about/         # About page (team, certifications)
│   │   ├── blog/          # Blog preview (links to external blog)
│   │   ├── checklist/     # Pre-shoot preparation checklist
│   │   ├── portfolio/     # Portfolio gallery with lightbox
│   │   └── layout.tsx     # Marketing layout with nav/footer
│   ├── admin/             # Staff admin panel
│   ├── agents/[agentSlug] # Agent portfolio pages
│   ├── api/               # API routes
│   │   ├── founddr/       # HDR processing endpoints
│   │   ├── webhooks/      # Webhook handlers (FoundDR, Cubicasa, Fotello)
│   │   ├── integrations/  # QuickBooks OAuth
│   │   └── cron/          # Scheduled tasks (storage-cleanup, etc.)
│   ├── community/[slug]   # Community/neighborhood pages
│   ├── dashboard/         # Agent dashboard
│   ├── delivery/[listingId]  # Media delivery
│   ├── property/[listingId]  # Property websites
│   └── team/              # Team portals
│       ├── photographer/  # Photographer dashboard, jobs, schedule
│       └── videographer/  # Videographer dashboard, queue, schedule
├── components/
│   ├── admin/ops/         # Admin operations components
│   ├── booking/           # Multi-step booking flow components
│   ├── community/         # Community page components
│   ├── dashboard/         # Dashboard-specific components
│   ├── delivery/          # Media delivery components
│   ├── marketing/         # Marketing site components
│   ├── property/          # Property website components
│   └── ui/                # shadcn/ui components
├── stores/
│   └── useBookingStore.ts # Zustand store for booking state
├── lib/
│   ├── agents/            # AI Agent system
│   │   ├── definitions/   # Agent definitions by category
│   │   ├── workflows/     # Multi-agent workflows
│   │   └── executor.ts    # Agent execution engine
│   ├── skills/            # Composable AI skills
│   │   ├── image/         # Image generation/analysis skills
│   │   ├── content/       # Content generation skills
│   │   ├── video/         # Video creation skills
│   │   ├── registry.ts    # Skill registration
│   │   └── composer.ts    # Skill composition builder
│   ├── integrations/      # External API clients
│   │   ├── founddr/       # HDR photo processing
│   │   ├── cubicasa/      # Floor plan generation
│   │   ├── virtual-staging/ # AI staging (Gemini)
│   │   ├── quickbooks/    # Invoice sync
│   │   ├── google-places/ # Nearby places
│   │   └── ticketmaster/  # Local events
│   ├── storage/           # Native media storage (Supabase Storage)
│   │   ├── media.ts       # MediaStorageService
│   │   ├── pipeline.ts    # Processing pipeline (RAW → HDR → QC → Final)
│   │   ├── cleanup.ts     # Auto-expiry of temp files
│   │   └── resolve-url.ts # URL resolution utilities
│   ├── notifications/     # Email/SMS notification system
│   ├── queries/           # Cached data fetching
│   ├── proofing/          # Client photo proofing
│   ├── supabase/          # Database client & types
│   └── utils/             # Shared utilities
└── supabase/
    └── migrations/        # SQL migrations
```

## Design System

The portal uses an Apple-inspired dark theme (iPhone 12 era aesthetic):

### Color Palette
```css
/* Backgrounds */
--bg-primary: #000000;        /* Pure black - main */
--bg-secondary: #0a0a0a;      /* Near black - cards */
--bg-elevated: #1c1c1e;       /* iOS elevated surface */

/* Blue Accent */
--blue-500: #0077ff;          /* Primary accent */
--blue-400: #3395ff;          /* Light accent */

/* Text */
--text-primary: #ffffff;
--text-secondary: #a1a1a6;    /* iOS secondary */
--text-tertiary: #8e8e93;     /* Muted (WCAG AA compliant) */

/* Borders */
--border-primary: rgba(255, 255, 255, 0.08);
```

### Component Patterns
- Cards: `rounded-xl border border-white/[0.08] bg-[#1c1c1e]`
- Glass: `bg-[#1c1c1e]/72 backdrop-blur-xl`
- Buttons: Min height 44px for touch targets (WCAG compliance)
- Transitions: CSS-only (no Framer Motion for performance)

## Important Patterns

### Caching
Use `unstable_cache` from Next.js with standardized revalidation times:
```typescript
import { CACHE_REVALIDATION, CACHE_TAGS } from '@/lib/utils/cache'

const getData = unstable_cache(
  async () => { /* ... */ },
  ['cache-key'],
  { revalidate: CACHE_REVALIDATION.LISTING, tags: [CACHE_TAGS.LISTINGS] }
)
```

### Database Types
Types are generated from Supabase schema in `src/lib/supabase/types.ts`. Custom interfaces for JSONB columns are defined there (e.g., `CommunityMarketSnapshot`, `CommunitySchoolInfo`).

### Authentication
- Magic link auth via Supabase + Resend
- Staff identified by `@aerialshots.media` email domain
- RLS policies enforce access control

### Booking Flow
The multi-step booking flow uses Zustand for state management:
```typescript
import { useBookingStore } from '@/stores/useBookingStore'

// In components
const { formData, setPackage, nextStep, pricing } = useBookingStore()
```

Key booking components:
- `PackageSelection` - Package picker with sqft tiers
- `SmartAddons` - AI-recommended add-ons
- `GooglePlacesAutocomplete` - Address input
- `AvailabilityCalendar` - Weather-integrated scheduling
- `PaymentStep` - Stripe Elements + discounts

Cart recovery:
- Sessions saved to `/api/booking/session`
- `ExitIntentModal` captures abandoning users
- Recovery emails via `/api/booking/recovery-email`

### AI Skills & Agents System

The portal uses a composable skills architecture for AI operations:

```typescript
import { registerSkill, executeSkill } from '@/lib/skills'

// Execute a skill
const result = await executeSkill('image-analyze', {
  imageUrl: 'https://...',
  detectObjects: true,
})

// Skills can be composed into workflows
import { createComposition, registerComposition } from '@/lib/skills/composer'

const workflow = createComposition('post-delivery')
  .addStep({ skillId: 'image-analyze', required: true })
  .addStep({ skillId: 'content-generate', parallel: 'content' })
  .addStep({ skillId: 'video-slideshow', parallel: 'content' })
  .build()
```

**Skill Categories:**
- `image/` - Image generation, analysis, inpainting, twilight conversion
- `content/` - Listing descriptions, social captions, email copy
- `video/` - Slideshow creation, motion effects, audio sync

**Expert Agents:**
- `video-creator` - Composes video skills for slideshow/reel generation
- `content-writer` - Generates listing descriptions and social content
- `image-enhancer` - HDR processing, cleanup, sky replacement
- `media-tips` - Analyzes media assets and generates quality improvement tips
- `neighborhood-data` - Researches local area, attractions, schools
- `qc-assistant` - AI-powered quality control review

**Workflows:**
- `post-delivery` - Runs after media delivery (QC → notify → video → content → campaign)
- `new-listing` - Runs when listing created (data enrich → neighborhood → content → template select)

## Recent Changes

See [CHANGELOG.md](./CHANGELOG.md) for detailed change history.

## Environment Variables

Required in `.env.local`:
```bash
# Core
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://app.aerialshots.media

# AI
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=         # Gemini for staging, inpainting, vision

# Email/SMS
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Integrations - Data
GOOGLE_PLACES_API_KEY=
TICKETMASTER_API_KEY=

# FoundDR (HDR Processing) - awaiting setup
FOUNDDR_API_URL=
FOUNDDR_API_SECRET=
FOUNDDR_WEBHOOK_URL=
FOUNDDR_WEBHOOK_SECRET=

# Cubicasa (Floor Plans) - awaiting API access
CUBICASA_API_KEY=
CUBICASA_WEBHOOK_SECRET=
CUBICASA_ENVIRONMENT=production

# QuickBooks (Invoicing)
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
QUICKBOOKS_REDIRECT_URI=
QUICKBOOKS_ENVIRONMENT=sandbox

# Aloft (Drone Airspace) - awaiting API access
ALOFT_API_KEY=

# Sanity CMS (Blog)
NEXT_PUBLIC_SANITY_PROJECT_ID=dqyvtgh9
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_BLOG_URL=https://blog.aerialshots.media

# Notifications
GOOGLE_REVIEW_URL=https://g.page/r/YOUR_REVIEW_LINK/review
REVIEW_REQUEST_DELAY_MS=7200000

# Cron Jobs
CRON_SECRET=
```

## Unified Architecture

The platform uses a unified architecture where portal and AI agent backend share the same Supabase database:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Unified Architecture                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                    ┌──────────────────────┐                         │
│                    │     Supabase         │                         │
│                    │  (Single Source)     │                         │
│                    │  • orders            │                         │
│                    │  • listings          │                         │
│                    │  • pricing_tiers     │                         │
│                    │  • packages          │                         │
│                    │  • services          │                         │
│                    └──────────────────────┘                         │
│                            ▲    ▲                                   │
│              ┌─────────────┘    └─────────────┐                     │
│              │                                │                     │
│  ┌───────────┴──────────┐      ┌──────────────┴─────────┐          │
│  │  aerialshots-portal  │      │   asm-agent-backend    │          │
│  │  (Next.js 16)        │      │   (Express.js)         │          │
│  │  • Human booking UI  │      │  • AI agent API        │          │
│  │  • Admin panel       │      │  • Chatbot booking     │          │
│  │  • Delivery pages    │      │  • Voice booking       │          │
│  └──────────────────────┘      └────────────────────────┘          │
│                                                                      │
│  SHARED: Supabase database, pricing from DB, real availability     │
└─────────────────────────────────────────────────────────────────────┘
```

### Pricing System

Pricing is stored in the database as single source of truth:
- `pricing_tiers` - Square footage buckets with base photo prices
- `packages` - Essentials, Signature, Luxury with included services
- `package_pricing` - Price matrix (package × tier)
- `services` - A la carte services with base prices and durations

Use `src/lib/queries/pricing.ts` to fetch pricing data:
```typescript
import { getPricing, calculateQuote, getTierForSqft } from '@/lib/queries/pricing'

const { tiers, packages, services } = await getPricing()
const quote = await calculateQuote(sqft, 'signature', ['droneOnly', 'realTwilight'])
```

### Team Portals

Staff can have multiple roles (e.g., photographer + videographer). Use `hasVideographerAccess()` or similar helpers:
```typescript
function hasVideographerAccess(staff: { role: string | null; roles?: string[] | null }): boolean {
  if (staff.role === 'admin') return true
  if (staff.role === 'videographer') return true
  if (staff.roles?.includes('videographer')) return true
  return false
}
```

## Notes for Claude

- Always run `npm run build` before committing to catch TypeScript errors
- Use `app.aerialshots.media` as the production domain (not `portal.`)
- Migrations go in `supabase/migrations/` with format `YYYYMMDD_NNN_description.sql`
- Check CHANGELOG.md for context on recent work
- Pricing is in database - update via Supabase, not JSON files
- Orders have `source` field to track origin (portal vs ai_agent)
