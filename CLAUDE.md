# CLAUDE.md - ASM Portal

This file provides guidance to Claude Code when working with the ASM Portal codebase.

## Project Overview

ASM Portal is a Next.js 16 application for Aerial Shots Media, providing:
- **Agent Dashboard** - Real estate agents manage listings, leads, AI tools
- **Media Delivery** - Post-shoot media delivery pages for clients
- **Property Websites** - Public-facing property marketing pages
- **Community Pages** - SEO-optimized neighborhood/area guides
- **Admin Panel** - Staff management, QC workflow, curation tools

**Production URL:** `https://app.aerialshots.media`

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Styling:** Tailwind CSS + shadcn/ui components
- **AI:** Anthropic Claude API for content generation
- **Integrations:** Aryeo (media), Google Places, Ticketmaster, Resend (email)

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
│   ├── admin/             # Staff admin panel
│   ├── agents/[agentSlug] # Agent portfolio pages
│   ├── api/               # API routes
│   ├── community/[slug]   # Community/neighborhood pages
│   ├── dashboard/         # Agent dashboard
│   ├── delivery/[listingId]  # Media delivery
│   └── property/[listingId]  # Property websites
├── components/
│   ├── community/         # Community page components
│   ├── dashboard/         # Dashboard-specific components
│   ├── delivery/          # Media delivery components
│   ├── property/          # Property website components
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── integrations/      # External API clients
│   │   ├── google-places/ # Nearby places
│   │   └── ticketmaster/  # Local events
│   ├── queries/           # Cached data fetching
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

## Recent Changes

See [CHANGELOG.md](./CHANGELOG.md) for detailed change history.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
GOOGLE_PLACES_API_KEY=
TICKETMASTER_API_KEY=
ARYEO_API_KEY=
```

## Notes for Claude

- Always run `npm run build` before committing to catch TypeScript errors
- Use `app.aerialshots.media` as the production domain (not `portal.`)
- Migrations go in `supabase/migrations/` with format `YYYYMMDD_NNN_description.sql`
- Check CHANGELOG.md for context on recent work
