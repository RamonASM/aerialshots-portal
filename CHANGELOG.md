# Changelog

All notable changes to the ASM Portal are documented in this file.

## [Unreleased]

## [2024-12-22] - Security Hardening & UX Improvements

### Security Fixes (Critical)
- **Token encryption bypass** - Removed plaintext fallback in Instagram OAuth callback
  - `src/app/api/instagram/callback/route.ts` - Now fails securely instead of storing unencrypted tokens
  - `src/lib/integrations/instagram/encryption.ts` - Requires encryption key in production

- **Webhook verification bypass** - Fixed Aryeo webhook signature validation
  - `src/app/api/webhooks/aryeo/route.ts` - Now rejects requests without valid signature in production

- **Unauthenticated SMS endpoint** - Added authentication to SMS send API
  - `src/app/api/sms/send/route.ts` - Added `requireStaffOrOwner` middleware

- **Campaign creation authorization** - Added ownership validation
  - `src/app/api/campaigns/create/route.ts` - Added `validateListingOwnership` check

### Added
- **Error Boundaries** - Graceful error handling for dynamic pages
  - `src/app/agents/[agentSlug]/error.tsx` - Agent portfolio error page
  - `src/app/delivery/[listingId]/error.tsx` - Media delivery error page

- **Loading States** - Skeleton loaders for better perceived performance
  - `src/app/property/[listingId]/loading.tsx` - Property page loading skeleton
  - `src/app/agents/[agentSlug]/loading.tsx` - Agent portfolio loading skeleton
  - `src/app/delivery/[listingId]/loading.tsx` - Media delivery loading skeleton

- **Toast Notifications** - Added Sonner Toaster to root layout
  - `src/app/layout.tsx` - Global toast notifications with rich colors

### Performance
- **O(n²) to O(n) optimization** - Fixed media lookup in dashboard listings
  - `src/app/dashboard/listings/page.tsx` - Converted filter-based lookup to Map-based O(n+m)

---

## [2024-12-22] - Community Pages & Post-Delivery Hub Foundation

### Added
- **Community Pages** (`/community/[slug]`) - SEO-optimized neighborhood/area guides
  - CommunityHero with parallax effect, quick facts, gallery
  - OverviewSection with rich text content blocks
  - MarketSnapshot for seller-focused market stats
  - SubdivisionsGrid showing neighborhood cards
  - SchoolsSection with school ratings by level
  - FeaturedAgents showcase
  - ActiveListings grid for nearby properties
  - CommunityLifestyle integrating Places, Events, Curated Items
  - CommunityLeadForm for buyer/seller lead capture
  - CommunityJsonLd for structured data SEO

- **ShareButton Component** (`src/components/ui/share-button.tsx`)
  - Native Web Share API on mobile
  - Clipboard fallback on desktop
  - Visual feedback on copy
  - Added to: delivery, property, and agent pages

- **Rate Limiting** (`src/lib/utils/rate-limit.ts`)
  - In-memory rate limiter for API routes
  - Applied to magic-link endpoint (5 requests/minute)

- **Resend API Validation**
  - Startup validation for RESEND_API_KEY
  - Better error messages for missing configuration

- **Database: Communities Table** (`supabase/migrations/20241222_007_communities.sql`)
  - Full schema with JSONB content fields
  - RLS policies for public read, staff write
  - Indexes for slug, location, and published status

- **Celebration, FL Demo Data** (`supabase/migrations/20241222_008_seed_celebration_demo.sql`)
  - Complete community profile with 5 subdivisions
  - Market snapshot, schools info, quick facts
  - Curated items for area developments

### Changed
- Updated community queries to use `CACHE_REVALIDATION.LISTING` (fixed typo from `LISTINGS`)

## [2024-12-21] - Security & Staff Management

### Added
- Admin security whitelist for staff email domains
- Staff management UI in admin panel
- Magic link authentication via Resend API

### Fixed
- Critical security issues in metadata handling
- Admin link moved to footer for cleaner UI

## [2024-12-20] - Premium Homepage

### Added
- Bento grid layout for homepage
- Animations and stats section
- Changed accent color to blue

---

## Migration Notes

### 2024-12-22: Community Pages
After deploying, run these migrations in Supabase SQL Editor:
1. `supabase/migrations/20241222_007_communities.sql`
2. `supabase/migrations/20241222_008_seed_celebration_demo.sql`

Demo URL: `https://app.aerialshots.media/community/celebration-fl`
