# CLAUDE.md - ASM Portal

This file provides guidance to Claude Code when working with the ASM Portal codebase.

---

## VERIFICATION RULES (READ FIRST)

These rules override all other instructions. They exist because AI-generated code often looks correct but doesn't actually work.

### Core Principles

1. **Never implement a feature without a corresponding test**
2. **Never modify existing code without running existing tests first**
3. **Ask clarifying questions before assuming requirements**
4. **Build vertically (one complete feature end-to-end) not horizontally**
5. **Verify each layer works before building the next layer**

### Before Writing Any Code

- Confirm you understand what's being asked
- State what files you will create or modify
- Identify what could go wrong
- Wait for approval before proceeding

### After Writing Any Code

- Run the linter: `npm run lint`
- Run tests: `npm run test`
- If anything fails, explain why before trying to fix it
- Report the actual output, not what you expect

### Verification Requirements by Layer

**Database changes:**
- Run the migration
- Verify the table/column exists in Supabase dashboard
- Test a simple query against it
- COMMIT before moving to next layer

**API/Backend changes:**
- Write a test that calls the endpoint
- Run the test - it must PASS
- Test manually with curl or Postman if possible
- COMMIT before moving to UI

**UI changes:**
- Connect to real data (never mocks for production code)
- Verify it works in the browser
- Check browser console for errors
- Check Network tab for failed requests
- COMMIT only when verified

### What NOT To Do

- Do not create mock implementations - build real functionality
- Do not skip error handling
- Do not hardcode API keys or secrets
- Do not assume environment variables exist without checking
- Do not implement auth without using official SDK patterns
- Do not say "this should work" - verify it actually works
- Do not move to the next feature until current feature is verified working

---

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
- **Payments:** Stripe Elements + Stripe Connect
- **Testing:** Vitest (2,939 tests passing)
- **Integrations:** 28+ services

## Key Commands

```bash
npm run dev          # Start development server
npm run build        # Production build (runs TypeScript check)
npm run lint         # ESLint
npm run test         # Run all tests (2,939 passing)
npx supabase db push # Apply migrations (requires linked project)
```

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (sign-in/sign-up)
│   ├── (marketing)/       # Marketing site pages (luxury redesign complete)
│   ├── admin/             # Staff admin panel
│   ├── api/               # API routes (211 endpoints)
│   ├── book/              # Booking flow (4-step wizard)
│   ├── dashboard/         # Agent dashboard
│   ├── team/              # Team portals (photographer, videographer, QC, editor)
│   └── portal/            # Client media delivery
├── components/            # React components by domain
├── stores/                # Zustand stores
├── lib/                   # Business logic, integrations, utilities
└── supabase/
    └── migrations/        # SQL migrations (79 files)
```

---

## Authentication System

The portal uses **Clerk** for all authentication:

**Sign-In Pages:**
- `/sign-in` - Agent portal
- `/sign-in/seller` - Homeowner portal
- `/sign-in/staff` - Team portal (photographer, videographer, QC, admin)
- `/sign-in/partner` - Partner portal

**User Roles:** `agent`, `seller`, `photographer`, `videographer`, `qc`, `admin`, `partner`

**Helper Functions:**
```typescript
import { getCurrentUser, requireAuth, requireRole } from '@/lib/auth/clerk'

const user = await getCurrentUser()
const user = await requireAuth()
const user = await requireRole(['admin', 'photographer'])
```

**Staff Access Pattern:**
```typescript
import { getStaffAccess } from '@/lib/auth/server-access'

const access = await getStaffAccess()
if (!access) redirect('/sign-in/staff')
// access.staff contains staff record with role, is_active, etc.
```

---

## Current Status (2026-01-09)

### ✅ Completed

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication (Clerk) | ✅ Complete | All sign-in pages working |
| Booking Flow | ✅ Complete | 4-step wizard with Stripe |
| Marketing Site | ✅ Complete | Luxury redesign with Revolut-style aesthetic |
| Team Portals | ✅ Complete | Photographer, videographer, QC, editor |
| Stripe Connect | ✅ Complete | Staff/partner payouts ready |
| Virtual Staging | ✅ Complete | Gemini AI integration |
| All Tests | ✅ Passing | 2,939 tests (was 262 failures, now 0) |

### 🔧 Needs Attention

| Issue | Priority | Notes |
|-------|----------|-------|
| Stripe webhook expansion | Medium | Add more event handlers (see `/docs/features/stripe-webhook-expansion.md`) |
| Cubicasa integration | Low | Currently stub - manual floor plan upload works |
| QuickBooks integration | Low | Not in active use |

### 📊 Codebase Stats

| Metric | Count |
|--------|-------|
| API Routes | 211 |
| Test Files | 125 |
| Tests Passing | 2,939 |
| SQL Migrations | 79 |
| Integrations | 28 |

---

## Database Conventions

- All RLS policies use `auth_user_id` (not legacy `user_id`)
- Staff access: Check `staff.auth_user_id = auth.uid() AND is_active = true`
- Agent access: Check `agent_id IN (SELECT id FROM agents WHERE auth_user_id = auth.uid())`
- Admin access: Check staff role IN ('admin', 'owner')

**Supabase Project:** `awoabqaszgeqdlvcevmd`

⚠️ **CRITICAL:** Before using Supabase MCP, verify you're connected to the correct project. Run `mcp__supabase__get_project_url` and confirm it returns `awoabqaszgeqdlvcevmd`.

---

## Environment Variables

Required in `.env.local`:
```bash
# Core
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://app.aerialshots.media

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_WEBHOOK_SECRET=

# AI
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
OPENAI_API_KEY=

# Email
RESEND_API_KEY=

# Additional (see .env.example for full list)
GOOGLE_PLACES_API_KEY=
RUNPOD_ENDPOINT_ID=
RUNPOD_API_KEY=
```

---

## MCP Servers

| MCP Server | Purpose |
|------------|---------|
| **Clerk** | User management, authentication |
| **Supabase** | Database queries, migrations |
| **Stripe** | Payment management, products |
| **GitHub** | Repository management |
| **Vercel** | Deployment management |
| **Filesystem** | Local file operations |

---

## Design System

### Portal Theme (Dashboard, Admin, Team)
Apple-inspired dark theme with blue accents:
```css
--bg-primary: #000000;
--bg-secondary: #0a0a0a;
--bg-elevated: #1c1c1e;
--blue-500: #0077ff;
--text-primary: #ffffff;
--text-secondary: #a1a1a6;
```

### Marketing Site Theme
Luxury black/white aesthetic:
```css
--cta-primary: #ff4533;     /* Orange-red CTAs */
--link: #09f;               /* Cyan links */
--font-primary: 'Satoshi';  /* 500-700 weights */
```

### Component Patterns
- Cards: `rounded-xl border border-white/[0.08] bg-[#1c1c1e]`
- Glass: `bg-[#1c1c1e]/72 backdrop-blur-xl`
- Buttons: Min height 44px for touch targets
- Transitions: CSS-only (no Framer Motion)

---

## Testing Patterns

Tests use Vitest with these common mock patterns:

### Supabase Admin Client Mock
```typescript
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: vi.fn((table) => createChain(mockData)),
  }),
}))
```

### Chainable Query Mock
```typescript
const createChain = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: () => Promise.resolve({ data, error }),
  maybeSingle: () => Promise.resolve({ data, error }),
})
```

### Rate Limit Mock
```typescript
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ success: true })),
  getRateLimitHeaders: vi.fn(() => ({})),
  getIdentifier: vi.fn(() => 'test-id'),
}))
```

---

## Recent Changes

### 2026-01-09
- Fixed all test failures (262 → 0)
- Updated test mocks for Clerk auth, Supabase admin client
- Fixed booking store tests for 4-step flow

### 2026-01-08
- Marketing site luxury redesign complete
- Improved portal navigation with cross-links
- Admin API migration to Clerk-compatible auth

### 2026-01-07
- Partner multi-role access for team dashboards
- Staff skills and certifications system
- RLS and storage hardening

---

## PRD Requirement

For any new feature, create a PRD in `/docs/features/[feature-name].md` before building.

PRDs should include:
- Overview (what and why)
- Success criteria
- User story and acceptance criteria
- Technical requirements (database, API, UI)
- Test cases

---

## Notes for Claude

- Always run `npm run build` before committing to catch TypeScript errors
- Use `app.aerialshots.media` as the production domain
- Migrations go in `supabase/migrations/` with format `YYYYMMDD_NNN_description.sql`
- Pricing is in database - update via Supabase, not JSON files
- Orders have `source` field to track origin (portal vs ai_agent)
- All team portal pages use `getStaffAccess()` for auth
