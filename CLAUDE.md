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
- **Testing:** Vitest (2,473+ tests passing)
- **Integrations:** 28+ services (see Integrations section below)

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
│   │   ├── webhooks/      # Webhook handlers (FoundDR, Cubicasa, Zillow 3D)
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

The platform uses two distinct themes:

### Portal Theme (Dashboard, Admin, Team)
Apple-inspired dark theme with blue accents:

```css
/* Backgrounds */
--bg-primary: #000000;        /* Pure black - main */
--bg-secondary: #0a0a0a;      /* Near black - cards */
--bg-elevated: #1c1c1e;       /* iOS elevated surface */

/* Blue Accent (Portal) */
--blue-500: #0077ff;          /* Primary accent */
--blue-400: #3395ff;          /* Light accent */

/* Text */
--text-primary: #ffffff;
--text-secondary: #a1a1a6;    /* iOS secondary */
--text-tertiary: #8e8e93;     /* Muted (WCAG AA compliant) */

/* Borders */
--border-primary: rgba(255, 255, 255, 0.08);
```

### Marketing Site Theme (Luxury Palette)
High-end luxury black/white aesthetic matching aerialshots.media:

```css
/* Luxury Accents (Marketing) */
--cta-primary: #ff4533;       /* Orange-red CTAs */
--cta-hover: #e63d2e;         /* CTA hover state */
--link: #09f;                 /* Cyan links */
--accent-warm: #f5a623;       /* Gold hints (subtle) */

/* Typography */
--font-primary: 'Satoshi', sans-serif;  /* 500-700 weights */

/* Same backgrounds as portal */
```

### Component Patterns
- Cards: `rounded-xl border border-white/[0.08] bg-[#1c1c1e]`
- Glass: `bg-[#1c1c1e]/72 backdrop-blur-xl`
- Buttons: Min height 44px for touch targets (WCAG compliance)
- Transitions: CSS-only (no Framer Motion for performance)
- Marketing CTAs: `bg-[#ff4533] hover:bg-[#e63d2e] text-white`
- Marketing Links: `text-[#09f] hover:text-[#00bbff]`

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

### Authentication (Clerk)
The portal uses [Clerk](https://clerk.com) for authentication with role-based sign-in:

**Sign-In Pages:**
- `/sign-in` - Agent portal (real estate agents)
- `/sign-in/seller` - Homeowner portal (sellers viewing delivery)
- `/sign-in/staff` - Team portal (photographer, videographer, QC, admin)
- `/sign-in/partner` - Partner portal (business partners)

**User Roles:**
- `agent` - Real estate agents managing listings
- `seller` - Homeowners viewing their property media
- `photographer` / `videographer` / `qc` - ASM team members
- `admin` - Full admin access
- `partner` - Business partners with team management

**Role Sync:**
- Clerk webhook at `/api/webhooks/clerk` syncs users to database
- On sign-up, users are auto-linked to existing records by email
- New users without existing records become agents by default
- Role stored in Clerk public metadata for middleware access

**Helper Functions:**
```typescript
import { getCurrentUser, requireAuth, requireRole, isAdmin } from '@/lib/auth/clerk'

// Get current user with database info
const user = await getCurrentUser()
// user.role, user.userId, user.userTable

// Require authentication (throws if not logged in)
const user = await requireAuth()

// Require specific role(s)
const user = await requireRole(['admin', 'photographer'])
```

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
- `content/` - Listing descriptions, social captions, email copy, carousel content, hashtags
- `video/` - Slideshow creation, motion effects, audio sync
- `render/` - Template rendering, carousel generation (Satori + Sharp engine)
- `data/` - Life Here API integration for neighborhood/lifestyle data

**Expert Agents:**
- `video-creator` - Composes video skills for slideshow/reel generation
- `content-writer` - Generates listing descriptions and social content
- `image-enhancer` - HDR processing, cleanup, sky replacement
- `media-tips` - Analyzes media assets and generates quality improvement tips
- `neighborhood-data` - Researches local area, attractions, schools
- `qc-assistant` - AI-powered quality control review
- `carousel-creator` - End-to-end Instagram carousel generation with AI content and Life Here data
- `property-marketing` - Complete marketing asset suite (descriptions, carousels, email copy)

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

# Clerk Authentication (REQUIRED)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...  # From Clerk Dashboard
CLERK_SECRET_KEY=sk_...                    # From Clerk Dashboard
CLERK_WEBHOOK_SECRET=whsec_...             # From Clerk Webhooks

# AI
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=         # Gemini for staging, inpainting, vision
OPENAI_API_KEY=            # Whisper for voice transcription in Storywork

# Email/SMS
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Integrations - Data
GOOGLE_PLACES_API_KEY=
TICKETMASTER_API_KEY=

# RunPod HDR Processing (replaces FoundDR API)
RUNPOD_ENDPOINT_ID=        # RunPod serverless endpoint ID
RUNPOD_API_KEY=            # RunPod API key

# Cubicasa (Floor Plans) - awaiting API access
# For now, use manual floor plan upload (JPG, PDF, PNG)
CUBICASA_API_KEY=
CUBICASA_WEBHOOK_SECRET=
CUBICASA_ENVIRONMENT=production

# QuickBooks (Invoicing) - not currently in use
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
QUICKBOOKS_REDIRECT_URI=
QUICKBOOKS_ENVIRONMENT=sandbox

# Aloft - NOT REQUIRED (uses free FAA data fallback)
# The client works with hardcoded Florida airports without API key
# ALOFT_API_KEY=  # Only needed for full LAANC authorization

# Sanity CMS (Blog)
NEXT_PUBLIC_SANITY_PROJECT_ID=dqyvtgh9
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_BLOG_URL=https://blog.aerialshots.media

# Notifications
GOOGLE_REVIEW_URL=https://g.page/r/YOUR_REVIEW_LINK/review
REVIEW_REQUEST_DELAY_MS=7200000

# Cron Jobs
CRON_SECRET=

# Stripe Connect (Team Payouts)
STRIPE_CONNECT_WEBHOOK_SECRET=  # whsec_xxxxx from Stripe Dashboard
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

---

## Complete Platform Inventory

### Codebase Stats

| Metric | Count |
|--------|-------|
| API Routes | 211 |
| Test Files | 272 |
| SQL Migrations | 53 |
| Integrations | 28 |
| Tests Passing | 2,473+ |

### All Integrations

| Integration | Purpose | Status |
|-------------|---------|--------|
| **Clerk** | Authentication, user management | ✅ Complete (add env vars) |
| **RunPod/FoundDR** | HDR photo processing | ✅ Ready (add env vars) |
| **Cubicasa** | Floor plan generation | ⏳ Manual upload for now |
| **Aloft** | Drone airspace checks | ✅ Works (free FAA fallback) |
| **QuickBooks** | Invoice sync | ⏸️ Not in use |
| **Satori Renderer** | Social carousel generation | ✅ Active (Bannerbear replacement) |
| Supabase Storage | Native media storage | Active |
| Google Places | Address autocomplete | Active |
| Google Maps | Distance/travel times | Active |
| Google Calendar | Scheduling sync | Active |
| Ticketmaster | Local events | Active |
| Resend | Email delivery | Active |
| Twilio | SMS notifications | Active |
| Stripe | Payments | Active |
| Sanity | Blog CMS | Active |
| WalkScore | Walk/transit scores | Active |
| Weather | Forecast for scheduling | Active |
| Virtual Staging | AI staging (Gemini) | Active |
| FAA | Drone regulations | Active (FL only) |
| Yelp | Local business data | Active |
| Movies/News | Local content | Active |
| Theme Parks | FL attraction times | Active |
| Slack | Team notifications | Active |
| Zapier | Webhook automation | Active |
| Dropbox | File storage | Active |
| Instagram | Social embedding | Active |
| MLS | Listing data providers | Active |
| Canva | Design templates | Stub |

### Life Here API (Developer API)

Public API at `/api/v1/location/*`:
- `/scores` - Composite lifestyle scores
- `/overview` - Location summary
- `/dining` - Restaurant data
- `/commute` - Transit/drive times
- `/events` - Local events
- `/attractions` - Theme parks, venues
- `/essentials` - Schools, healthcare
- `/lifestyle` - Recreation options
- `/news` - Local news feed
- `/movies` - Theater listings

Florida-specific scoring:
- Time to Magic (Disney/Universal drive times)
- Beach Access (Atlantic/Gulf proximity)

### QC Dashboard

Components in `/components/qc/`:
- QCQueue, QCReviewClient, QCImageViewer
- QCStats, PriorityQueue, WorkloadChart
- BeforeAfterSlider, InpaintCanvas, InpaintModal

### HDR Processing Pipeline (RunPod)

**Client**: `src/lib/integrations/founddr/runpod-client.ts`

Uses RunPod serverless GPU for HDR photo processing:
- Sync processing via `/runsync` endpoint
- Async processing via `/run` with polling
- Returns base64 image with processing metrics

Endpoints at `/api/founddr/`:
- `/process` - Submit for HDR
- `/process-runpod` - GPU processing (RunPod)
- `/status/[jobId]` - Job polling
- `/queue` - Queue view
- `/retry` - Retry failed

### Feature Status

| Feature | Status |
|---------|--------|
| Agent Dashboard | ✅ Complete |
| Client Portal | ✅ Complete |
| Booking Flow | ✅ Complete |
| Marketing Site | ✅ Complete |
| Team Portals | ✅ Complete |
| QC Dashboard | ✅ Complete |
| Life Here API | ✅ Complete |
| Skills Framework | ✅ Complete |
| AI Agents | ✅ Complete |
| Analytics Dashboard | ✅ Complete (PropertyPageTracker, DeliveryPageTracker) |
| HDR Processing (RunPod) | ✅ Ready (add env vars) |
| Airspace Checks | ✅ Works (free FAA) |
| Floor Plans | ⏳ Manual upload |
| Storywork Voice Input | ✅ Complete (OpenAI Whisper) |
| Carousel Generation | ✅ Complete (Satori renderer) |
| Content Retainer Booking | ✅ Complete (/book/retainer) |
| Stripe Connect Payouts | ✅ Complete (add env vars) |
| Time Tracking (QC) | ✅ Complete |
| Clerk Authentication | ✅ Complete (add env vars) |

### Stripe Connect & Team Payouts

The platform includes a complete payout system for photographers, videographers, and partners:

**Business Structure:**
- 2 Partners (owners) - each has their own photographers, Stripe Connect accounts
- Photographers/Videographers - 1099 contractors, instant Stripe Connect payouts
- Video Editor - funds set aside per job, paid manually from pool
- QC Specialist - hourly ($5.50/hr), bi-weekly from company pool

**Revenue Split (configurable via Admin):**
```
Job Revenue: $400
├── Photographer: 40% ($160) → Stripe Connect transfer
├── Videographer: 20% ($80) → Stripe Connect transfer (if applicable)
├── Partner: 25% ($100) → Stripe Connect transfer
└── Company Pools: 15% ($60)
    ├── Video Editor Fund: 5%
    ├── QC Fund: 5%
    └── Operating: 5%
```

**Key Files:**
- `src/lib/payments/stripe-connect.ts` - Connect account management, transfers
- `src/lib/payments/payout-processor.ts` - Job payout orchestration (triggered on QC approval)
- `src/lib/time-tracking/service.ts` - QC time clock functionality
- `src/app/admin/team/payouts/` - Admin payout configuration UI

**API Routes:**
- `/api/connect/staff/account` - Create/get staff Connect accounts
- `/api/connect/partner/account` - Create/get partner Connect accounts
- `/api/connect/onboarding` - Generate Stripe onboarding links
- `/api/webhooks/stripe-connect` - Handle Connect webhooks
- `/api/admin/payouts/settings` - System-wide payout settings
- `/api/admin/payouts/staff/[id]` - Individual staff payout config
- `/api/admin/payouts/partners/[id]` - Individual partner payout config

**Database Tables:**
- `partners` - Partner organizations with Connect IDs
- `staff_payouts` - Contractor payout records
- `partner_payouts` - Partner payout records
- `company_pool` - Pool allocations (video_editor, qc_fund, operating)
- `time_entries` - QC time tracking
- `payout_settings` - Configurable percentages

**Payout Trigger:** On QC Approval → `processJobPayouts()` → Stripe transfers

**Setup Required:**
1. Add `STRIPE_CONNECT_WEBHOOK_SECRET` to `.env.local` (from Stripe Dashboard → Webhooks)
2. Register webhook in Stripe Dashboard: `https://app.aerialshots.media/api/webhooks/stripe-connect`
3. Partners and staff onboard via `/team/*/settings` pages

### Logging

```typescript
import { apiLogger, dbLogger, webhookLogger, formatError } from '@/lib/logger'

// Simple log
apiLogger.info('Processing request')

// With context
apiLogger.info({ userId, orderId }, 'Processing order')

// Error logging
apiLogger.error({ ...formatError(error) }, 'Failed to process')
```

Available child loggers: `agentLogger`, `apiLogger`, `authLogger`, `dbLogger`, `webhookLogger`, `cronLogger`, `integrationLogger`

---

## Claude Code MCP Servers

The project uses several MCP (Model Context Protocol) servers for AI-assisted development:

### Configured MCPs

| MCP Server | Purpose | Configuration |
|------------|---------|---------------|
| **Clerk** | User management, authentication setup | `npx -y @clerk/agent-toolkit -p=local-mcp` |
| **Supabase** | Database queries, migrations | Project ref: `awoabqaszgeqdlvcevmd` |
| **Stripe** | Payment management, products, customers | Via Stripe MCP |
| **GitHub** | Repository management, PRs | Via GitHub MCP |
| **Vercel** | Deployment management | Via Vercel MCP |
| **Filesystem** | Local file operations | `~/Projects` |

### ⚠️ CRITICAL: Supabase MCP Verification

**Before using any Supabase MCP tools, ALWAYS verify you're connected to the correct project:**

```
Correct Project: awoabqaszgeqdlvcevmd (ASM Portal)
Wrong Project:   slomugiwblohzcwtueav (Coach/Production OS - DIFFERENT PROJECT)
```

**Verification Steps:**
1. Run `mcp__supabase__get_project_url` - should return `https://awoabqaszgeqdlvcevmd.supabase.co`
2. Run `mcp__supabase__list_tables` - should show ASM Portal tables (`listings`, `agents`, `orders`, `media_assets`)
3. If you see Coach tables (`productions`, `shots`, `scripts`), STOP - wrong project!

**If connected to wrong project:**
1. Edit `~/.claude/.credentials.json`
2. In the `mcpOAuth` section, DELETE any Supabase entries pointing to the wrong project:
   - Remove entries with `slomugiwblohzcwtueav` in the serverUrl
   - Remove entries with empty/expired tokens for the correct project
3. Restart Claude Code - it will prompt to re-authenticate with the correct project

### Clerk MCP Usage

The Clerk MCP enables Claude Code to:
- Create and manage users
- Configure authentication settings
- Set up webhooks
- Manage organization settings
- View user sessions and activity

**Required Environment:**
```bash
CLERK_SECRET_KEY=sk_test_...  # Must be set for MCP to authenticate
```

**Webhook Endpoint:** `/api/webhooks/clerk`
- Events: `user.created`, `user.updated`, `user.deleted`
- Syncs users to database tables (agents, staff, partners, sellers)

---

## Current Work Status (2026-01-04)

### ✅ All Core Features Complete

The portal is feature-complete. All major systems are implemented:
- Clerk authentication with role-based sign-in
- Stripe Connect payouts (webhook handler, account management, transfers)
- Virtual staging with real Gemini AI integration
- Time tracking for QC specialists
- 61 database migrations applied
- Marketing site with luxury redesign
- Pricing system synced with master reference

### ✅ Stripe Products Created (Sandbox)

**Listing Packages (One-time):**
| Package | Product ID | Prices (5 sqft tiers) |
|---------|------------|----------------------|
| Essentials | `prod_TjMikkxmcAc8H8` | $315, $375, $425, $485, $580 |
| Signature | `prod_TjMiTFr3nKCG8x` | $449, $529, $579, $619, $700 |
| Premier | `prod_TjMjD33Gcz6obK` | $649, $729, $819, $899, $1,100 |

**Content Retainers (Monthly Subscription):**
| Retainer | Product ID | Price |
|----------|------------|-------|
| Momentum | `prod_TjMk6ERlIB5LPT` | $1,488/month |
| Dominance | `prod_TjMkTth8d40mGM` | $2,500/month |

---

## 🚀 PENDING TASKS (Resume Here After Restart)

**Last Updated:** 2026-01-04
**Status:** Supabase MCP OAuth fixed - removed stale credentials, ready for re-auth on restart

### Quick Start After Restart
1. Claude Code will prompt to authenticate with Supabase → Authorize it
2. Verify connection: `mcp__supabase__get_project_url` should return `awoabqaszgeqdlvcevmd`
3. Say **"continue pending tasks"** to execute Tasks 1-3 automatically

---

### Task 1: Create Stripe À La Carte Products
Create these products in Stripe sandbox using MCP:

**Photography Add-Ons:**
| Service | Price | Notes |
|---------|-------|-------|
| Drone/Aerial (Add-On) | $75 | When added to photo booking |
| Drone/Aerial (Standalone) | $150 | Without base photography |
| 3D Floor Plan | $75 | Interactive 3D floor plan |
| Zillow 3D Tour + Floor Plan | $150 | Virtual tour with floor plan |
| Virtual Twilight | $15 | Per photo |
| Real Twilight Photography | $150 | On-site twilight session |

**Video Services:**
| Service | Price | Notes |
|---------|-------|-------|
| Listing Video | $350 | Script assist; agent optional |
| Lifestyle Listing Video | $425 | Adds 1-2 lifestyle locations |
| Day-to-Night Video | $750 | Day-to-twilight cinematic |
| Cinematic Video (Signature) | $900 | Premium cinematic production |
| 3D Video Render | $250 | 3D walkthrough showcase |

**Virtual Staging:**
| Service | Price | Notes |
|---------|-------|-------|
| Core Staging (per photo) | $12 | Digital furniture & decor |
| Premium Staging (per photo) | $25 | Premium furniture set |
| Core Staging (Full Home) | $125 | All vacant areas staged |

### Task 2: Create Supabase Storage Buckets
Use Supabase MCP `apply_migration` to create storage buckets:
- `virtual-staging` - AI-generated staging images (public)
- `media-assets` - Photos, videos, floor plans (private, authenticated)
- `render-cache` - Carousel/template renders (public, auto-expire)
- `reference-files` - Client reference uploads (private)

### Task 3: Fix Test File TypeScript Errors
167 TypeScript errors in test files (build passes, not blocking):
- Update test mocks to match current interfaces
- Fix type imports for Supabase generated types
- Locations: `src/**/*.test.ts`, `src/**/*.spec.ts`

---

### Task 4: Environment Variables (User Action Required)
Add to `.env.local`:
```bash
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...  # From Stripe Dashboard → Webhooks
CLERK_WEBHOOK_SECRET=whsec_...           # From Clerk Dashboard → Webhooks
GOOGLE_AI_API_KEY=...                    # For virtual staging (Gemini)
RUNPOD_ENDPOINT_ID=...                   # For HDR processing
RUNPOD_API_KEY=...                       # For HDR processing
```

### Task 5: Register Webhooks (User Action Required)
1. **Stripe Dashboard** → Developers → Webhooks → Add endpoint:
   - URL: `https://app.aerialshots.media/api/webhooks/stripe-connect`
   - Events: `account.updated`, `transfer.created`, `payout.paid`

2. **Clerk Dashboard** → Webhooks → Add endpoint:
   - URL: `https://app.aerialshots.media/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`

---

### Build Status
- **Production build**: ✅ Passes
- **TypeScript errors**: 167 in test files only (not blocking build)
- **Tests**: 2,473+ passing (some test type fixes pending)
