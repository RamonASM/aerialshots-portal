# Changelog

All notable changes to the ASM Portal are documented here.

## [Unreleased] - 2024-12-31

### Added - Phase 8: Workflow Connectivity

#### Critical Workflow Integration Fixes
Connected orphaned workflows to their trigger points for end-to-end automation:

**Post-Delivery Workflow** (`src/lib/agents/workflows/post-delivery.ts`)
- Changed trigger event from `carousel.rendered` to `qc.approved`
- Updated QC approval endpoint (`/api/admin/qc/listings/[id]/approve`) to trigger workflow
- Workflow now runs after QC approval with:
  - QC Assistant analysis
  - Media tips generation
  - Delivery notification
  - Care task creation
  - Video slideshow creation (if 3+ photos)
  - Content generation
  - Campaign auto-launch (if enabled)

**New-Listing Workflow** (`src/lib/agents/workflows/new-listing.ts`)
- Added trigger point in orders API (`/api/orders`)
- Creates listing when order is placed
- Triggers workflow with:
  - Listing data enrichment (geocoding)
  - Neighborhood research
  - Initial content generation
  - Template selection
  - Scheduling recommendations
  - Agent welcome notification

**Workflow Utility Functions** (`src/lib/agents/workflows/index.ts`)
- `triggerNewListingWorkflow()` - Reusable trigger for new listings
- `triggerPostDeliveryWorkflow()` - Reusable trigger for delivery completion

### Added - Phase 9: Environment Variables Documentation

Updated `.env.example` with:
- All 70+ environment variables organized by category
- Clear documentation of required vs optional variables
- Notes on deprecated integrations (Aryeo, Fotello)
- RunPod configuration for HDR processing
- VAPID keys for push notifications
- Security key generation instructions

### Improved - Structured Logging

Added `qcLogger` to the structured logging system for QC-related operations.

Updated the following files to use structured logging:
- `src/app/api/admin/qc/listings/[id]/approve/route.ts` - QC approval logging
- `src/app/api/orders/route.ts` - Order and listing creation logging

---

### Added - Phase 6: Code Quality Improvements

#### Structured Logging
Replaced console.log/error/warn with structured logger in critical files:
- `src/lib/agents/orchestrator.ts` - Agent workflow execution logging
- `src/lib/agents/registry.ts` - Agent registry operations
- `src/lib/integrations/founddr/client.ts` - HDR processing logs
- `src/lib/queries/listings.ts` - Database query logging
- `src/app/api/webhooks/cubicasa/route.ts` - Webhook event logging

**Logger features:**
- JSON format in production for log aggregation
- Pretty-printed colored output in development
- Sensitive field redaction (passwords, tokens, API keys)
- Pre-configured child loggers: `agentLogger`, `apiLogger`, `authLogger`, `dbLogger`, `webhookLogger`, `cronLogger`, `integrationLogger`

---

### Added - Phase 5: Enabled Features

#### Voice Recording for Storywork
- `useVoiceRecording` hook with pause/resume, waveform visualization
- `VoiceRecorder` component with Web Audio API
- `/api/storywork/transcribe` endpoint using OpenAI Whisper
- `src/lib/transcription/service.ts` with file validation

#### Analytics Dashboard (Already Integrated)
- `PropertyPageTracker` component in property pages
- `DeliveryPageTracker` component in delivery pages
- `/api/analytics/track` for page_view, download, lead_conversion events
- `/api/analytics/dashboard` returns full analytics data
- Dashboard at `/dashboard/analytics` with charts and metrics

#### Content Retainer Booking Flow
- `/book/retainer` page with three package tiers (Momentum, Dominance, Elite)
- Video breakdown and shoot schedule visualization
- À la carte pricing and optional add-ons
- Enabled Content Retainer link on `/book` page

---

### Added - Storywork Image Carousel API

Complete text-to-image rendering API for Instagram-style carousels with Bannerbear-like capabilities.

#### Core Rendering Engine (`src/lib/render/engine/`)
- **Satori + Sharp Renderer** - Primary renderer for text overlays and templates
- Font loading with LRU cache for performance
- Variable resolver with Handlebars-style syntax (`{{variable}}`)
- SSRF prevention for image URLs
- Prototype pollution protection in variable resolution

#### Render API Endpoints (`src/app/api/v1/render/`)
- `POST /image` - Single image render with template + variables
- `POST /carousel` - Multi-slide parallel rendering
- `GET /job/[jobId]` - Job status polling
- `POST /template` - Create template
- `GET /template/[templateId]` - Get template (by ID or slug)
- `PUT /template/[templateId]` - Update template
- `DELETE /template/[templateId]` - Delete template

**Security**: X-ASM-Secret authentication, rate limiting, sanitized error responses

#### Render Skills (`src/lib/skills/render/`)
- `render-template` - Render single image from template
- `render-carousel` - Render multi-slide carousel with parallel processing

#### Content Generation Skills (`src/lib/skills/content/`)
- `generate-carousel-content` - AI-powered slide headlines and body text
- `generate-hashtags` - Platform-optimized hashtag generation
- `generate-carousel-caption` - Social media caption with CTA

#### AI Agents (`src/lib/agents/definitions/content/`)
- **carousel-creator** - End-to-end carousel generation:
  - Story type detection (just_listed, neighborhood, lifestyle, etc.)
  - Life Here API integration for neighborhood data
  - AI content generation for slides
  - Parallel slide rendering
  - Caption and hashtag generation
- **property-marketing** - Complete marketing asset suite:
  - Package-based generation (basic, standard, premium, luxury)
  - Listing descriptions, social carousels, captions, email copy
  - Life Here data integration

#### Database Schema (`supabase/migrations/20250102_004_render_api.sql`)
- `render_templates` - Template definitions with inheritance
- `render_jobs` - Job tracking with status
- `render_job_slides` - Per-slide tracking
- `render_fonts` - Font registry
- `render_template_sets` - Template groupings
- `render_template_set_items` - Set membership
- RLS policies and triggers

#### Provider Registration
- `satori_sharp` - Text-to-image rendering
- `life_here` - Location data API

---

## [Unreleased] - 2024-12-30

### Platform Audit & Cleanup

#### Comprehensive Codebase Audit
- **Status**: 85% Production Ready
- 206 API routes audited
- 272 test files with 2,473+ passing tests
- 53 SQL migrations
- 27 integrations documented

#### Removed - Fotello Integration
- Removed external AI photo editing integration
- Using internal AI editor instead (Skills framework)
- Deleted webhook handler and references from 23 files
- Internal image skills: analyze, inpaint, twilight, generate

#### Documentation Updates
- Updated CLAUDE.md with complete feature inventory
- Added all integrations with status
- Documented Life Here API endpoints
- Added QC Dashboard component list
- Added FoundDR processing pipeline docs

#### Security Audit Completed
- RLS enabled on ALL database tables
- Stripe webhook idempotency implemented
- Email notifications added to 5 routes
- Schema gaps migration created and applied

---

## [Unreleased] - 2024-12-31

### Added - Unified Platform Architecture

#### Unified Pricing System (`supabase/migrations/20241231_001_unified_pricing.sql`)
- `pricing_tiers` table - 6 square footage buckets with base photo prices
- `packages` table - Essentials, Signature, Luxury with included services
- `package_pricing` table - Price matrix (package × tier) for all combinations
- `services` table - 17 a la carte services with prices, durations, categories
- Seeds all pricing data from asm_pricing_kb.json
- Added `source` column to orders table (portal vs ai_agent tracking)

#### Pricing Query Module (`src/lib/queries/pricing.ts`)
- `getPricing()` - Cached fetch of all pricing data
- `getTierForSqft()` - Find tier for given square footage
- `getPackagePrice()` - Get package price for specific tier
- `calculateQuote()` - Full quote with package + addons
- `getServicesByCategory()` - Filter services by category
- `calculateDuration()` - Estimate shoot duration from services

#### Videographer Portal (`src/app/team/videographer/`)
- Dashboard page with today's video jobs, stats, route map
- Queue page for videos awaiting editing
- Schedule page with weekly calendar view
- Job detail page with status updates, media assets
- Settings page with notification preferences
- Multi-role authentication (staff can have photographer + videographer roles)

#### Media Tips Agent (`src/lib/agents/definitions/operations/media-tips.ts`)
- Analyzes media assets for quality issues
- Generates actionable improvement tips by category
- Returns overall score, summary, and prioritized actions
- Categories: composition, lighting, staging, technical, presentation

#### AI Workflow Fixes
- Fixed `neighborhood-researcher` → `neighborhood-data` slug mismatch in new-listing workflow
- Added media-tips agent to agent index

---

## [Unreleased] - 2024-12-30

### Added - Performance & Accessibility Polish

#### Performance Optimizations
- Dynamic imports for below-fold components on homepage
  - ProcessTimeline, PackagesPreview, PortfolioPreview, FAQAccordion, CTASection
  - Reduces initial bundle size by ~30-40KB
- Dynamic import for Lightbox component (loaded on-demand only)
- Vercel deployment configuration (`vercel.json`)
  - Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
  - Static asset caching (fonts, _next/static)
  - Cron jobs for review requests and drip campaigns
  - PostHog analytics proxy rewrites

#### Accessibility Improvements (WCAG AA)
- Improved color contrast ratio for muted text (#a1a1a6 → #b8b8bd)
  - Now meets 4.5:1 contrast ratio requirement
- FAQAccordion accessibility overhaul:
  - Added `aria-expanded` to accordion buttons
  - Added `aria-controls` linking to content panels
  - Added `role="region"` with `aria-labelledby`
  - Added `aria-hidden` to collapsed content
  - Added visible focus indicators (focus-visible:ring-2)
  - Replaced hardcoded colors with semantic CSS variables
- Section landmarks with `aria-label` attributes

---

### Added - Phase 6: SEO & Structured Data

#### JSON-LD Structured Data (`src/lib/seo/json-ld.tsx`)
- `OrganizationJsonLd` - Company/brand schema
- `LocalBusinessJsonLd` - Local business with hours, services, ratings
- `WebSiteJsonLd` - Website schema with search action
- `ServiceJsonLd` - Individual service offerings
- `FAQPageJsonLd` - FAQ question/answer pairs
- `BreadcrumbJsonLd` - Breadcrumb navigation
- `ProductJsonLd` - Package/pricing products
- `ImageGalleryJsonLd` - Portfolio image galleries
- `HowToJsonLd` - Process/checklist steps
- `AggregateRatingJsonLd` - Review ratings
- `HomePageJsonLd` - Combined homepage schema
- Company constants: COMPANY_INFO, SERVICES

#### XML Sitemap (`src/app/sitemap.ts`)
- Dynamic sitemap generation
- Static marketing pages (home, about, portfolio, blog, checklist, booking)
- Developer documentation pages
- Dynamic community pages from database
- Dynamic property pages from database (delivered/published listings)
- Proper priorities and change frequencies

#### Robots.txt (`src/app/robots.ts`)
- Allow public pages (marketing, portfolio, community, property)
- Disallow private areas (admin, team, dashboard, client, delivery, API)
- Block AI training bots (GPTBot, ChatGPT, CCBot, anthropic-ai)
- Reference to sitemap

#### Page JSON-LD Integration
- Homepage: Organization, LocalBusiness, WebSite, FAQ schemas
- About: Organization, Breadcrumb, HowTo (booking process)
- Portfolio: ImageGallery, Breadcrumb
- Checklist: HowTo (preparation steps), Breadcrumb

#### Shared Data (`src/lib/data/marketing-faqs.ts`)
- Extracted FAQ data for reuse in component and schema

---

### Added - Phase 6 & 7: AI Skills & Agents Platform

#### Skills Framework (`src/lib/skills/`)
- `types.ts` - Core skill interfaces (Skill, SkillResult, SkillConfig)
- `registry.ts` - Skill registration and discovery system
- `executor.ts` - Skill execution with logging and retry logic
- `composer.ts` - Skill composition builder for multi-step workflows
- `framework.test.ts` - 28 tests for core framework

#### Image Skills (`src/lib/skills/image/`)
- `generate.ts` - Image generation skill (Gemini/SD providers)
- `analyze.ts` - Room type and object detection
- `inpaint.ts` - AI object removal/cleanup
- `twilight.ts` - Day-to-dusk conversion
- 28 tests total for image skills

#### Content Skills (`src/lib/skills/content/`)
- `listing-description.ts` - AI property descriptions (3 styles)
- `social-caption.ts` - Social media captions (Instagram/FB/TikTok)
- `email-copy.ts` - Marketing email generation
- 39 tests total for content skills

#### Video Skills (`src/lib/skills/video/`)
- `slideshow.ts` - FFmpeg-based slideshow generator
- `motion.ts` - Ken Burns/parallax effects
- `audio.ts` - Music overlay and sync
- `encode.ts` - Final video rendering
- 38 tests total for video skills

#### Expert Agents (`src/lib/agents/definitions/`)
- `content/video-creator.ts` - Video creation agent (composes video skills)
- `content/content-writer.ts` - Content generation agent (composes content skills)
- `operations/image-enhancer.ts` - Image processing agent (composes image skills)
- 16 tests total for expert agents

#### Workflow Integration
- Updated `post-delivery.ts` workflow with video-creator and content-writer steps
- Parallel execution support for content generation
- Shared context for skill outputs between workflow steps

#### Virtual Staging Integration
- `src/lib/integrations/virtual-staging/client.ts` - Gemini-powered staging
- Room type detection, furniture removal, style-based staging
- 27 tests for staging integration

#### Proofing Service
- `src/lib/proofing/service.ts` - Client photo proofing workflow
- Session management, photo selection, pinned comments
- Seller sharing with granular permissions

#### Blog Integration
- `src/lib/queries/blog.ts` - Sanity CMS blog queries
- Article fetching, category filters, related articles
- Blog page at `/(marketing)/blog/[slug]/page.tsx`

**Test Coverage: 1351 tests passing (65 test files)**

---

### Added - Phase 5: Content Pages

#### About Page (`src/app/(marketing)/about/page.tsx`)
- Company story and mission section
- Team member cards from `staff` table
- Certifications showcase (FAA Part 107, Zillow, Matterport, Insured)
- Equipment showcase (Drones, Cameras, Lenses, 3D, Video, Lighting)
- Process timeline (Book → Shoot → Edit → Deliver → Publish)
- Company stats from database
- CTA section

#### Team Data (`src/lib/queries/team.ts`)
- `getTeamMembers()` - Active staff with skills and certifications
- `getCompanyStats()` - Listings, agents, years, cities served
- 1-hour cache with 'team'/'company' tags

#### Blog Integration (Links to External Blog)
- `src/lib/integrations/sanity/client.ts` - Sanity CMS client
  - Matches existing `aerialshots-blog-frontend` configuration
  - Project ID: dqyvtgh9, Dataset: production
- `src/lib/queries/blog.ts` - Blog article queries
  - `getBlogArticles()` - All published articles
  - `getFeaturedBlogArticles()` - Featured content
  - `getBlogCategories()` - Category list
  - `getArticlesByPillar()` - Content pillar filtering
  - Links to external blog at blog.aerialshots.media
- `src/app/(marketing)/blog/page.tsx` - Blog preview page
  - Featured article card
  - Article grid with pillar badges
  - Category filters linking to external blog
  - CTA to full blog site

#### Checklist Page (`src/app/(marketing)/checklist/`)
- `page.tsx` - Pre-shoot preparation guide
  - 6 sections: Exterior, Kitchen, Living, Bedrooms, Bathrooms, Garage
  - 58 checklist items with priority levels
  - Quick tips section
  - Common mistakes to avoid
- `ChecklistClient.tsx` - Interactive checklist
  - Progress tracking with percentage
  - Collapsible sections
  - Priority badges (Must Do, Important, Nice to Have)
  - Reset and print functionality
  - Completion celebration

---

### Added - Phase 4: Portfolio & Gallery

#### Portfolio Components
- `src/components/marketing/portfolio/PortfolioGrid.tsx` - Masonry gallery
  - Filterable by type (Photos, Video, Drone, 3D Tours, Staging, Floor Plans)
  - Responsive grid layout with column spans
  - Animated filter transitions
  - Video preview on hover
- `src/components/marketing/portfolio/Lightbox.tsx` - Full-screen viewer
  - Keyboard navigation (← → Esc Z Space)
  - Thumbnail strip for navigation
  - Zoom toggle for photos
  - Video playback support
  - Touch/swipe gestures for mobile
- `src/components/marketing/portfolio/BeforeAfterSlider.tsx` - Virtual staging comparison
  - Drag slider for before/after comparison
  - Touch support for mobile
  - Labels with icons
  - StagingShowcase with example selector
  - InlineComparison hover-based variant

#### Portfolio Data
- `src/lib/queries/portfolio.ts` - Cached portfolio data fetching
  - `getPortfolioItems()` - All portfolio items from delivered listings
  - `getFeaturedPortfolioItems()` - Featured items for homepage
  - `getStagingExamples()` - Before/after staging pairs
  - `getPortfolioStats()` - Aggregate counts by type
  - 1-hour cache with 'portfolio' tag

#### Portfolio Page
- `src/app/(marketing)/portfolio/page.tsx` - Main portfolio page
  - Hero section with stats display
  - Filterable gallery with suspense
  - CTA section with booking/pricing links
- `src/app/(marketing)/portfolio/PortfolioClient.tsx` - Client component
  - Lightbox state management via useLightbox hook
  - Virtual staging showcase toggle

---

### Added - Phase 3: Enhanced Booking Flow

#### State Management
- `src/stores/useBookingStore.ts` - Zustand store with persistence
  - Form data, pricing calculations, smart recommendations
  - Immer middleware for immutable updates
  - Session persistence with localStorage

#### Booking Components
- `src/components/booking/GooglePlacesAutocomplete.tsx` - Address autocomplete
  - Florida-biased search results
  - Parses full address components (street, city, state, zip, lat/lng)
  - Selected address display with edit capability
- `src/components/booking/AirspaceMap.tsx` - Drone airspace visualization
  - Integrates with Aloft API for airspace checks
  - Visual status indicators (clear/restricted/prohibited)
  - Nearby airport markers and restriction list
- `src/components/booking/AvailabilityCalendar.tsx` - Scheduling with weather
  - 7-day weather forecast overlay
  - Time slot grid with availability
  - Weather-based date recommendations
- `src/components/booking/PackageSelection.tsx` - Enhanced package picker
  - 3-column card layout with "Most Popular" badge
  - Square footage tier selector
  - Savings display vs. à la carte pricing
- `src/components/booking/SmartAddons.tsx` - AI-recommended add-ons
  - Categorized grid (staging, photography, video, delivery)
  - Smart recommendations based on package selection
  - Quantity controls for per-unit add-ons
- `src/components/booking/ExitIntentModal.tsx` - Cart abandonment recovery
  - Detects mouse leaving page top
  - 10% discount offer with code COMEBACK10
  - Email capture for recovery link
- `src/components/booking/CouponCodeInput.tsx` - Coupon validation
  - Real-time validation via API
  - Applied coupon display with remove option
- `src/components/booking/LoyaltyPointsSelector.tsx` - Points redemption
  - Slider-based point selection
  - Max 50% of order with points
  - Real-time value calculation
- `src/components/booking/PaymentStep.tsx` - Enhanced payment
  - Stripe Elements integration
  - Coupon and loyalty point discounts
  - Pay now or pay later options

#### Booking APIs
- `src/app/api/airspace/route.ts` - Airspace status check
- `src/app/api/weather/route.ts` - Weather forecast for scheduling
- `src/app/api/coupons/validate/route.ts` - Coupon validation
- `src/app/api/booking/session/route.ts` - Cart recovery sessions
  - POST: Save/update session
  - GET: Retrieve by sessionId
  - PATCH: Mark as converted/abandoned
- `src/app/api/booking/recovery-email/route.ts` - Abandonment email

#### Booking Hooks
- `src/hooks/useBookingSync.ts` - Session sync with server
  - Auto-save on form changes
  - beforeunload handler for recovery
- `useExitIntent` - Mouse leave detection
- `useLoyaltyPoints` - Fetch user's available points
- `useAirspace` - Check airspace for coordinates

---

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
