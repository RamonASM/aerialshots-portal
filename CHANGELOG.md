# Changelog

All notable changes to the ASM Portal are documented here.

## [Unreleased] - 2024-12-29

### Added - Phase 14: Complete Platform

#### Client Self-Service Portal
- `src/app/client/` - Complete client portal with magic link auth
  - `page.tsx` - Dashboard with stats, quick actions, recent bookings/media
  - `layout.tsx` - Portal layout with header and navigation
  - `login/page.tsx` - Magic link authentication
  - `bookings/page.tsx` - Booking history with status filters
- `src/components/client/ClientNav.tsx` - Navigation with profile dropdown
- `src/app/api/client/bookings/route.ts` - Bookings CRUD with discount validation

#### Analytics & Reporting Dashboards
- `src/app/admin/analytics/realtime/page.tsx` - Real-time metrics with auto-refresh
- `src/app/admin/analytics/alerts/page.tsx` - Alert configuration and history
- `src/app/api/admin/analytics/realtime/route.ts` - Live metrics API
- `src/app/api/admin/analytics/alerts/route.ts` - Alerts CRUD API

#### AI Automation Admin UI
- `src/app/admin/agents/schedules/page.tsx` - Schedule management for AI agents
- `src/app/api/admin/agents/schedules/route.ts` - Schedules CRUD API
- Support for cron, interval, and event-based triggers

#### PWA/Mobile Features
- `src/components/pwa/PushNotificationSettings.tsx` - Push notification subscription UI
- Web Push API integration with VAPID keys
- Notification type preferences (orders, deliveries, reminders, marketing)

#### Database Migration (Phase 14)
- `supabase/migrations/20241229_002_phase14_complete_platform.sql`
  - Analytics alerts, goals, geographic, and realtime tables
  - Client accounts and bookings
  - Push subscriptions
  - AI agent schedules and workflow templates
  - Smart pricing rules
  - Service availability and booking time slots
  - Discount codes

---

### Added - Integrations & Automation

#### FoundDR Integration (HDR Photo Processing)
- `src/lib/integrations/founddr/` - Complete API client library
  - `types.ts` - TypeScript interfaces for FoundDR API
  - `client.ts` - API client with job creation, status polling, inpainting
  - `index.ts` - Barrel exports
- `src/app/api/founddr/process/route.ts` - Trigger HDR processing
- `src/app/api/founddr/status/[jobId]/route.ts` - Job status and cancellation
- `src/app/api/webhooks/founddr/route.ts` - Webhook handler for completion callbacks
- `src/components/admin/ops/HDRProcessingPanel.tsx` - UI for HDR processing control

#### Cubicasa Integration (Floor Plans)
- `src/lib/integrations/cubicasa/` - Complete API client library
  - `types.ts` - TypeScript interfaces for Cubicasa API
  - `client.ts` - API client for order creation, GoToScan links, downloads
  - `index.ts` - Barrel exports
- `src/app/api/admin/listings/[id]/cubicasa/route.ts` - Create/manage floor plan orders

#### QuickBooks Integration (Invoicing)
- `src/lib/integrations/quickbooks/client.ts` - OAuth + invoice sync
- `src/app/api/integrations/quickbooks/connect/route.ts` - OAuth initiation
- `src/app/api/integrations/quickbooks/callback/route.ts` - OAuth callback
- `src/app/api/integrations/quickbooks/status/route.ts` - Connection status
- `src/app/api/integrations/quickbooks/sync/route.ts` - Invoice sync

#### Auto Review Request System
- `src/lib/notifications/auto-triggers.ts` - Auto-notification system
  - `handleListingDelivered()` - Triggers on delivery
  - `scheduleReviewRequest()` - Schedules review email (2hr delay default)
  - `processScheduledNotifications()` - Cron processor
- Added `review_request` notification type with email/SMS templates
- `src/app/api/cron/notifications/route.ts` - Cron endpoint for scheduled notifications

#### Bulk Marketing Email System
- `src/lib/marketing/campaigns/` - Complete campaign service
  - `types.ts` - Campaign, recipient, segment types
  - `service.ts` - Create, send, schedule, cancel campaigns
  - `index.ts` - Barrel exports
- `src/app/api/admin/marketing/campaigns/route.ts` - List/create campaigns
- `src/app/api/admin/marketing/campaigns/[id]/route.ts` - Send, test, schedule, cancel

#### Agent Edit Requests (Post-Delivery)
- `src/app/api/delivery/[listingId]/edit-request/route.ts` - Agent-facing edit request submission

#### Aloft Airspace Integration (Drone Authorization)
- `src/lib/integrations/aloft/` - Airspace qualification for drone ops
  - `types.ts` - Airspace, LAANC, authorization types
  - `client.ts` - Airspace checks with FL airport data
  - `index.ts` - Barrel exports
- Complements existing FAA client at `src/lib/integrations/faa/`

#### Credits System
- `supabase/migrations/20241229_001_credits_system.sql` - Credits, packages, transactions

---

## [2024-12-28] - Database Schema Expansion

### Added - Database Migrations
- `20241228_013_founddr_integration.sql` - FoundDR processing jobs, QC sessions
- `20241228_014_founddr_storage_buckets.sql` - Storage buckets for photo pipeline

---

## [2024-12-22] - Subdomain Routing

#### Infrastructure
- Subdomain-based routing to separate admin and agent portals
  - `asm.aerialshots.media` → Admin portal (staff only)
  - `app.aerialshots.media` → Agent portal
  - `aerialshots.media` → Marketing site (external)
- Middleware-first architecture for subdomain detection
- Environment variables for domain configuration
- Cross-subdomain authentication and redirects
- SSL certificates for both subdomains

#### Security
- Complete isolation of admin portal on separate subdomain
- Non-staff users blocked from admin subdomain (redirect to app)
- Staff login accessible at `asm.aerialshots.media/login` and `/staff-login`
- Automatic redirect to appropriate subdomain based on user role

### Added - UX Improvements (Sprint 2-5)

#### Lead Management
- Lead filtering tabs (All/New/Contacted/Closed) with counts
- Bulk selection and actions (Mark Contacted, Close All)
- "Hot" badge for leads less than 24 hours old
- Lead count badges in sidebar navigation

#### Dashboard Analytics
- Trend indicators showing % change vs last month
- Lead counts per listing with "Popular" badge for high-engagement properties
- Total leads stat card on listings page

#### Referral & Rewards
- Social sharing buttons on referrals page (Email, SMS, WhatsApp, native share)
- Tier progress bars on both referrals and rewards pages
- Visual tier progression (Bronze → Silver → Gold → Platinum)

#### Media Delivery
- Visual download progress bar with file count
- "Download Complete" success state with green indicator

#### Navigation
- Active states in sidebar (highlights current page with blue accent)
- Consistent hover/focus states across navigation

### Changed

#### Design System Updates
- Updated text-tertiary color to #8e8e93 for WCAG AA compliance (4.5:1 contrast)
- Button touch targets increased to 44px minimum height
- Added image optimization config for Supabase and CDN domains

#### Dark Theme Fixes
- Converted admin pages to dark theme (admin/page.tsx, admin/curation/page.tsx)
- Fixed agent loading skeleton to use dark theme
- Fixed referral page to use dark theme

### Components Created
- `DashboardNav` - Client component for sidebar with active states and badges
- `MobileContactCTA` - Floating mobile CTA for property/community pages

---

## [2024-12-21] - UI/UX Redesign (Sprint 1)

### Added
- Complete dark theme redesign (Apple iPhone 12 era aesthetic)
- Glass morphism card variants
- Mobile floating CTAs on property and community pages
- Image optimization configuration

### Changed
- Color palette updated to refined blue (#0077ff) instead of neon
- Typography scale aligned with Apple HIG
- All pages converted to dark theme
- Button variants updated with gradient primary, glass secondary

### Fixed
- WCAG color contrast compliance
- Touch target accessibility (44px minimum)
- Light theme artifacts in admin and auth pages

---

## [2024-12-20] - Premium Homepage

### Added
- Bento grid feature layout
- Stats section with glass cards
- Animated gradient background (subtle)
- Responsive hero section

---

## [2024-12-19] - Initial Portal

### Added
- Agent dashboard with listings, leads, AI tools
- Media delivery pages
- Property marketing websites
- Community/neighborhood SEO pages
- Referral program with credit system
- Admin panel with QC workflow
