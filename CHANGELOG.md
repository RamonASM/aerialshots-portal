# Changelog

All notable changes to the ASM Portal are documented here.

## [Unreleased]

### Added - Subdomain Routing (2024-12-22)

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
