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

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Framework** | Next.js 16 (App Router) | Turbopack enabled |
| **Language** | TypeScript | Strict mode |
| **UI Components** | shadcn/ui + Radix | Custom dark theme |
| **Styling** | Tailwind CSS | Design system in globals.css |
| **Database** | Supabase PostgreSQL | RLS policies, connection pooling |
| **Auth** | Clerk | Role-based (agent, staff, partner, seller) |
| **State Management** | Zustand + Immer | SSR-safe persistence |
| **Payments** | Stripe Elements + Connect | Webhooks, team payouts |
| **AI/ML** | Claude API, Gemini, OpenAI Whisper | Content, vision, transcription |
| **File Storage** | Supabase Storage | Media assets, staging, cache |
| **Email** | Resend | Transactional emails |
| **SMS** | Twilio | Notifications |
| **Testing** | Vitest | 2,939 tests passing |
| **Deployment** | Vercel | Preview + Production |
| **Monitoring** | Vercel Analytics | Performance tracking |

### Tech Stack Quick Reference

```
Frontend:     Next.js 16 + shadcn/ui + Tailwind CSS
Backend:      Next.js API Routes + Supabase PostgreSQL
Auth:         Clerk → Webhook sync → staff/agents/partners tables
Data Flow:    Zustand (client) ↔ API Routes ↔ Supabase (RLS)
Deployment:   Vercel → Edge Network → Serverless Functions
```

---

## Development Workflow

**Always use `npm`, not `yarn` or `pnpm`.**

```sh
# 1. Make changes

# 2. Typecheck (fast feedback)
npm run build

# 3. Run tests
npm run test                          # Full suite
npm run test -- -t "test name"        # Single test

# 4. Lint before committing
npm run lint                          # All files

# 5. Build verification
npm run build
```

### Verification Gates

Before marking ANY task complete, confirm:

1. **Build Gate**: `npm run build` completes with zero errors
2. **Lint Gate**: `npm run lint` passes
3. **Test Gate**: `npm run test` passes
4. **Runtime Gate**: Feature actually works when tested manually

### When Verification Fails

1. Stop immediately - do not add more code on top of broken code
2. Identify the specific failure point
3. Fix that single issue
4. Re-run verification
5. Only proceed when green

---

## Claude Agents

Custom agents in `.claude/agents/` for automated workflows:

| Agent | Purpose | Trigger | Command |
|-------|---------|---------|---------|
| `build-validator.md` | Runs build, lint, tests | After any code changes | `/project:build-validator` |
| `code-architect.md` | Reviews architecture decisions | Before new features | `/project:code-architect` |
| `code-simplifier.md` | Simplifies completed code | After feature completion | `/project:code-simplifier` |
| `verify-app.md` | Tests app in browser/runtime | Before marking done | `/project:verify-app` |
| `pr-reviewer.md` | Reviews code for PR | Before creating PRs | `/project:pr-reviewer` |
| `test-writer.md` | Writes tests for features | When adding features | `/project:test-writer` |

### Agent Workflow

```
1. Plan      → code-architect (review approach)
2. Implement → (write code)
3. Validate  → build-validator (run checks)
4. Simplify  → code-simplifier (reduce complexity)
5. Verify    → verify-app (test in browser)
6. Review    → pr-reviewer (before PR)
```

### Auto-Trigger Checkpoints

**Claude should proactively suggest agents at these checkpoints:**

| Checkpoint | Agent | Prompt to User |
|------------|-------|----------------|
| After editing 3+ files | `build-validator` | "Want me to run build validation?" |
| Before implementing feature | `code-architect` | "Should I review the architecture first?" |
| After completing feature | `code-simplifier` | "Feature done - want me to simplify?" |
| After fixing UI bugs | `verify-app` | "Want me to verify this in the browser?" |
| Before creating PR | `pr-reviewer` | "Ready for PR review?" |
| New API route created | `test-writer` | "Should I write tests for this endpoint?" |

### File Change Triggers

When these file patterns are edited, Claude should remind the user:

| Pattern | Reminder |
|---------|----------|
| `src/app/api/**/*.ts` | "API route changed - run tests and consider test-writer agent" |
| `src/components/**/*.tsx` | "UI component changed - consider verify-app after completion" |
| `src/lib/**/*.ts` | "Core library changed - run build-validator to check impact" |
| `supabase/migrations/*.sql` | "Migration added - verify with `npx supabase db push`" |
| `src/stores/*.ts` | "Store changed - check for hydration issues" |

---

## Proactive Reminders

**Claude should remind the user at these points (without being asked):**

### During Development
- After 5+ file edits: "Consider committing this checkpoint before continuing"
- After adding new API route: "Don't forget to add tests for this endpoint"
- After editing auth logic: "Security-sensitive change - double-check the implementation"
- After editing RLS policies: "Run tests to verify RLS is working correctly"

### Before Completing Tasks
- "Have you run `npm run build` to verify TypeScript?"
- "Have you tested this manually in the browser?"
- "Are there any edge cases we should handle?"

### Before Creating PRs
- "Run `/project:pr-reviewer` for code review"
- "Ensure all tests pass with `npm run test`"
- "Update CHANGELOG.md with changes"

### End of Session
- "Here's what was completed today: [summary]"
- "Remaining items for next session: [list]"
- "Consider creating a commit with: `git add -A && git commit -m 'description'`"

---

## Feedback Loop

**The most important thing: Give Claude a way to verify its work.**

### Verification Methods

| Type | Method | When |
|------|--------|------|
| **Build** | `npm run build` | After every change |
| **Tests** | `npm run test` | After every change |
| **Lint** | `npm run lint` | Before commits |
| **Browser** | Check console + network | UI changes |
| **API** | curl or test endpoint | API changes |

### Feedback Signals to Provide

When something doesn't work, tell Claude:
- **Error messages** - Copy exact output
- **Console errors** - From browser DevTools
- **Network failures** - Status codes, response bodies
- **Screenshots** - For UI issues
- **Expected vs Actual** - What should happen vs what happened

### Improving Quality

1. **Always verify** - Never assume code works
2. **Report actual output** - Not what you expect
3. **One fix at a time** - Don't stack changes on broken code
4. **Commit working code** - Small, verified commits

---

## Key Commands

```bash
npm run dev          # Start development server
npm run build        # Production build (runs TypeScript check)
npm run lint         # ESLint
npm run test         # Run all tests (2,939 passing)
npx supabase db push # Apply migrations (requires linked project)
```

---

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
│   ├── ui/               # Base UI components (shadcn)
│   └── [feature]/        # Feature-specific components
├── stores/                # Zustand stores
├── lib/                   # Business logic, integrations, utilities
│   ├── ai/               # AI agents and prompts
│   ├── auth/             # Authentication utilities
│   ├── supabase/         # Database clients
│   ├── integrations/     # External service clients
│   └── utils/            # General utilities
└── supabase/
    └── migrations/        # SQL migrations (79 files)
```

---

## Authentication

Uses **Clerk** for authentication. User roles: `agent`, `seller`, `photographer`, `videographer`, `qc`, `admin`, `partner`

**Sign-In Pages:** `/sign-in`, `/sign-in/seller`, `/sign-in/staff`, `/sign-in/partner`

---

## Database Operations

### Supabase Client Patterns

```typescript
// Server-side (API routes) - bypass RLS with service role
import { createAdminClient } from '@/lib/supabase/admin';
const supabase = createAdminClient();

// Server-side (with user context) - respects RLS
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();

// Client-side - always respects RLS
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
const supabase = createBrowserSupabaseClient();
```

### Database Conventions

- All RLS policies use `auth_user_id` (not legacy `user_id`)
- Staff access: Check `staff.auth_user_id = auth.uid() AND is_active = true`
- Agent access: Check `agent_id IN (SELECT id FROM agents WHERE auth_user_id = auth.uid())`
- Admin access: Check staff role IN ('admin', 'owner')

**Supabase Project:** `awoabqaszgeqdlvcevmd`

⚠️ **CRITICAL:** Before using Supabase MCP, verify you're connected to the correct project. Run `mcp__supabase__get_project_url` and confirm it returns `awoabqaszgeqdlvcevmd`.

### Migration Naming

Migrations go in `supabase/migrations/` with format: `YYYYMMDD_NNN_description.sql`

---

## API Patterns

### Next.js API Routes (App Router)

```typescript
// app/api/resource/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Business logic
    const data = await fetchData(userId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/resource error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

---

## State Management

### Zustand with SSR-Safe Persistence

```typescript
// stores/example.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useExampleStore = create<ExampleStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
    }),
    {
      name: 'example-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
```

### Hydration Pattern (SSR)

```typescript
// Prevent hydration mismatch
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return <Skeleton />;
```

---

## Code Standards

### TypeScript

- Prefer `type` over `interface`
- **Never use `enum`** - use string literal unions instead
- Explicit return types on exported functions
- No `any` - use `unknown` and narrow with type guards

```typescript
// Bad
enum Status { Active, Inactive }

// Good
type Status = 'active' | 'inactive'
```

### Error Handling

- Always handle errors explicitly
- No empty catch blocks
- Log errors with context

```typescript
// Bad
try { await doThing() } catch (e) {}

// Good
try {
  await doThing()
} catch (error) {
  console.error('Failed to do thing:', { error, context: relevantData })
  throw error
}
```

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

### Test Commands

```sh
npm run test                          # Full suite
npm run test -- path/to/file.test.ts  # Specific file
npm run test -- -t "booking"          # Pattern match
npm run test -- --coverage            # With coverage
```

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

| MCP Server | Purpose | Key Tools |
|------------|---------|-----------|
| **Clerk** | User management | `getUser`, `updateUser`, `createOrganization` |
| **Supabase** | Database queries | `list_tables`, `execute_sql`, `apply_migration` |
| **Stripe** | Payments | `list_customers`, `create_product`, `list_subscriptions` |
| **GitHub** | Repository | `create_pull_request`, `list_issues`, `push_files` |
| **Vercel** | Deployment | `deploy_to_vercel`, `list_deployments`, `get_deployment_build_logs` |
| **Filesystem** | Local files | `read_file`, `write_file`, `search_files` |

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

## Task Completion Checklist

Before saying a task is "done":

- [ ] Code compiles: `npm run build` passes
- [ ] Lint passes: `npm run lint` passes
- [ ] Tests pass: `npm run test` passes
- [ ] Feature works: Manually verified in browser/runtime
- [ ] No console errors in browser
- [ ] No errors in server logs

**If any checkbox fails, the task is not complete.**

---

## Resume Point (2026-01-10)

**Last Session:** Sprint 3 complete, ready for Sprint 4 (Testing & QA)

### Completed Sprints

**Sprint 1 - Team Portal Fixes:** ✅ COMPLETE
- Staff sign-in flow, role-based redirects, settings pages fixed
- Photographer dashboard/schedule/settings working
- Test staff accounts created in Supabase

**Sprint 2 - Integration & Webhooks:** ✅ COMPLETE
- QCImageViewer URL fallback with `aryeo_url`
- Airspace status persistence in booking flow
- Stripe Connect webhook handlers expanded

**Sprint 3 - Code Quality & TODOs:** ✅ COMPLETE
- Google Static Maps integration in SoldMap
- Life Here API endpoint tests (25 tests)
- Airspace status updates, marketing blast filters

### Sprint 4 - Testing & QA (In Progress)

**Completed:**
- ✅ Created Clerk test accounts for QC/Editor/Photographer
- ✅ Browser tested QC portal (Dashboard, Queue, Settings)
- ✅ Verified role-based access control working

**Test Accounts:**
| Email | Role | Password |
|-------|------|----------|
| `ramon+qc@aerialshots.media` | QC | `AsmTest2026Portal!` |
| `ramon+editor@aerialshots.media` | VA/Editor | `AsmTest2026Portal!` |
| `ramon+photographer@aerialshots.media` | Photographer | `AsmTest2026Portal!` |

**Remaining:**
- Test Stripe Connect payout flow end-to-end

**Low Priority TODOs:**
| File | TODO | Priority |
|------|------|----------|
| `lib/integrations/cubicasa/client.ts` | Implement actual Cubicasa API call | Low |
| `lib/agents/workflows/editor.ts` | Uncomment after migration | Low |

---

## Current Status (2026-01-10)

### ✅ Completed

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication (Clerk) | ✅ Complete | All sign-in pages working |
| Booking Flow | ✅ Complete | 4-step wizard with Stripe |
| Marketing Site | ✅ Complete | Luxury redesign with Revolut-style aesthetic |
| Team Portals | ✅ Complete | Photographer, videographer, QC, editor |
| Stripe Connect | ✅ Complete | Staff/partner payouts ready |
| Virtual Staging | ✅ Complete | Gemini AI integration |
| All Tests | ✅ Passing | 2,962 tests (was 262 failures, now 0) |

### 🔧 Needs Attention

| Issue | Priority | Notes |
|-------|----------|-------|
| Create Clerk accounts for QC/Editor testers | Medium | Supabase records exist, need Clerk accounts |
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

## External Services

| Service | Purpose | Env Variable |
|---------|---------|--------------|
| Clerk | Authentication | `CLERK_SECRET_KEY` |
| Supabase | Database + Storage | `SUPABASE_SERVICE_ROLE_KEY` |
| Stripe | Payments + Connect | `STRIPE_SECRET_KEY` |
| Resend | Transactional email | `RESEND_API_KEY` |
| Twilio | SMS notifications | `TWILIO_AUTH_TOKEN` |
| Google Places | Address autocomplete | `GOOGLE_PLACES_API_KEY` |
| RunPod | HDR processing | `RUNPOD_API_KEY` |
| Anthropic | AI content | `ANTHROPIC_API_KEY` |
| Google AI | Vision + staging | `GOOGLE_AI_API_KEY` |
| OpenAI | Whisper transcription | `OPENAI_API_KEY` |

## Webhook Endpoints

| Provider | Endpoint | Purpose |
|----------|----------|---------|
| Clerk | `/api/webhooks/clerk` | User sync to database |
| Stripe | `/api/stripe/webhook` | Payment events |
| Stripe Connect | `/api/webhooks/stripe-connect` | Payout events |
| Cubicasa | `/api/webhooks/cubicasa` | Floor plan delivery |
| Zillow 3D | `/api/webhooks/zillow-3d` | 3D tour completion |

## Life Here API

The Life Here API provides location-based lifestyle data for content enrichment. It's a proprietary Central Florida-focused scoring system.

**Base URL:** `/api/v1/location`

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/scores` | Life Here Score (0-100) by lifestyle profile | ✅ Complete |
| `/dining` | Restaurants, cuisines, ratings | ✅ Complete |
| `/commute` | Drive times to airports, beaches, downtown | ✅ Complete |
| `/events` | Local events and activities | ✅ Complete |
| `/attractions` | Theme parks, beaches, museums | ✅ Complete |
| `/essentials` | Schools, healthcare, grocery | ✅ Complete |
| `/lifestyle` | Gyms, parks, recreation | ✅ Complete |
| `/overview` | Neighborhood summary | ✅ Complete |
| `/news` | Local news integration | ✅ Complete |
| `/movies` | Nearby movie theaters | ✅ Complete |

**Features:**
- API key authentication (`X-ASM-Secret`)
- Rate limiting per endpoint
- Location-based caching (30 min TTL)
- Circuit breaker for resilience
- 5 lifestyle profiles: `balanced`, `family`, `professional`, `active`, `foodie`

**Testing Gap:** API endpoints lack dedicated test files (skill-level tests exist)

---

## Recent Changes

### 2026-01-10 (Sprint 3 Complete)
- **Sprint 3 Final**:
  - Integrated Google Static Maps into SoldMap component
    - Uses `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` for API access
    - Dark theme styling matching portal design
    - CSS grid fallback when API unavailable
  - Added Life Here API endpoint tests (25 new tests)
    - `scores/route.test.ts` - 9 tests for profile-based scoring
    - `dining/route.test.ts` - 9 tests for restaurant/cuisine data
    - `commute/route.test.ts` - 7 tests for travel times
- Build passing, 2962 tests passing

### 2026-01-10 (Sprint 3 - Code Quality)
- **Sprint 3 Progress**:
  - Implemented airspace status update on listings (`airspace-qualify` route)
    - Updates `airspace_status` and `airspace_checked_at` when listingId provided
    - Works for both cached and fresh airspace checks
  - Implemented marketing blast filter types (`by_last_order`, `by_service`, `by_spend`)
    - Filters agents by recent order date, service types, or total spend
  - Fixed QCTimePage test for Clerk auth (was using old Supabase auth mocks)
- Build passing, 2937 tests passing

### 2026-01-10 (Afternoon Session - Sprint 2)
- **Sprint 2 Complete**:
  - Fixed QCImageViewer URL fallback - added `aryeo_url` fallback for legacy assets
  - Integrated AirspaceCheck into booking flow (Property step)
  - API returns `checkId` for airspace cache, order creation links it via `airspace_check_id`
  - Added Stripe Connect webhook handlers for `payout.failed` and `transfer.reversed`
  - Verified RunPod env vars already documented
- Build passing, 2931 tests passing

### 2026-01-10 (Evening Session)
- **Sprint 1 Browser Testing Complete**:
  - Created `/team/page.tsx` for role-based redirects after sign-in
  - Fixed middleware email detection using `clerkClient` API (sessionClaims doesn't include email)
  - Fixed all team settings pages - removed non-existent columns (`payout_type`, `default_payout_percent`, `hourly_rate`)
  - Created test staff accounts in Supabase (photographer, qc, editor)
  - Verified photographer portal pages working: dashboard, schedule, settings
  - Verified role-based access control working correctly

### 2026-01-10 (Earlier)
- **Sprint 1 Complete**: Fixed authentication & navigation issues
  - Fixed QC portal auth (4 pages) - now uses Clerk instead of old Supabase auth
  - Created `/team/photographer/schedule` - weekly schedule view
  - Created `/team/editor/settings` - editor profile with Stripe Connect
  - Created `/team/qc/settings` - QC profile with compensation info
  - Created `/team/photographer/job/[id]` - job detail page with HDR upload
  - Added `PhotographerJobClient` component for HDR bracket uploads
- Added agent triggers and proactive reminders to CLAUDE.md
- Added Claude agents for workflow automation (build-validator, code-architect, code-simplifier, verify-app, pr-reviewer, test-writer)
- Added Feedback Loop section to CLAUDE.md
- Pushed test fixes and CLAUDE.md to origin/main
- Verified marketing redesign live at app.aerialshots.media

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
