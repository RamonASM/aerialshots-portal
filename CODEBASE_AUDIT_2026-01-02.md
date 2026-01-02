# ASM Portal Codebase Audit Report

**Date:** January 2, 2026
**Auditor:** Claude Code (Opus 4.5)
**Scope:** Full codebase review for production readiness
**Build Status:** Passing (2,473+ tests)

---

## Executive Summary

This comprehensive audit reviewed the ASM Portal codebase across 7 key areas: database schema, API security, TypeScript type safety, integration connections, test coverage, environment variables, and business logic. The application builds successfully and is functional, but **75+ issues** were identified that should be addressed for enterprise-grade production code.

### Risk Assessment

| Severity | Count | Description |
|----------|-------|-------------|
| **Critical** | 5 | Immediate fix required - data integrity or security risk |
| **High** | 25+ | Fix this week - stability or reliability concerns |
| **Medium** | 30+ | Fix this month - code quality improvements |
| **Low** | 15+ | Backlog - documentation and housekeeping |

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
2. [API Security Audit](#2-api-security-audit)
3. [Integration Connection Issues](#3-integration-connection-issues)
4. [TypeScript Type Safety](#4-typescript-type-safety)
5. [Database & Migration Issues](#5-database--migration-issues)
6. [Test Coverage Analysis](#6-test-coverage-analysis)
7. [Environment Variable Audit](#7-environment-variable-audit)
8. [Business Logic Issues](#8-business-logic-issues)
9. [Prioritized Fix Plan](#9-prioritized-fix-plan)

---

## 1. Critical Issues

### 1.1 Missing Database Transactions in Payout Processing

**File:** `src/lib/payments/payout-processor.ts`
**Severity:** CRITICAL
**Lines:** 384-422, 464-502

**Issue:** The payout processor performs Stripe transfers and database inserts without transaction wrapping:

```typescript
// Current flow (NO TRANSACTION):
processJobPayouts()
  → createTransfer()           // Stripe API call
  → recordStaffPayout()        // DB insert (can fail independently)
  → recordPartnerPayout()      // DB insert (can fail independently)
  → allocateToCompanyPools()   // DB insert (can fail independently)
```

**Impact:**
- If Stripe transfer succeeds but database record fails → money moved but not tracked
- If one payout succeeds but another fails → partial state with no rollback
- No idempotency protection against duplicate processing
- Financial reconciliation becomes impossible

**Fix Required:**
- Wrap all operations in a database transaction
- Implement idempotency keys for Stripe transfers
- Add compensation/reversal logic for partial failures

---

### 1.2 Virtual Staging Returns Hardcoded Mock URLs

**File:** `src/lib/integrations/virtual-staging/client.ts`
**Severity:** CRITICAL
**Lines:** 346-365

**Issue:** All staging providers return mock URLs instead of actual processed images:

```typescript
switch (provider) {
  case 'gemini':
    return `https://storage.example.com/staged/${Date.now()}.jpg`  // MOCK
  case 'stable_diffusion':
    return `https://storage.example.com/staged/${Date.now()}.jpg`  // MOCK
  case 'apply_design':
    return `https://storage.example.com/staged/${Date.now()}.jpg`  // MOCK
}
```

**Impact:** Virtual staging feature is completely non-functional. Clients ordering staging receive placeholder URLs.

**Fix Required:** Implement actual provider integrations or remove feature from offerings.

---

### 1.3 RLS Policies Block Anonymous Booking Sessions

**File:** `supabase/migrations/20250102_005_booking_sessions.sql`
**Severity:** CRITICAL
**Lines:** 37-48

**Issue:** Booking sessions are created by unauthenticated users during checkout, but RLS policies require authentication:

```sql
CREATE POLICY "Users can read own sessions"
  ON booking_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);  -- Requires auth.uid()
```

**Impact:** Cart recovery feature is blocked - anonymous users cannot create or access their booking sessions.

**Fix Required:** Add policies for anonymous/service role access or use different session storage.

---

### 1.4 Missing Ownership Verification on Media Endpoints

**File:** `src/app/api/media/[id]/route.ts`
**Severity:** CRITICAL
**Lines:** 23-57

**Issue:** GET endpoint retrieves media assets with no authentication or authorization:

```typescript
export async function GET(request: NextRequest, { params }: Props) {
  const supabase = createAdminClient()  // Uses admin client directly
  // NO auth check
  // NO ownership verification
  const { data } = await supabase.from('media_assets').select('*').eq('id', id)
  return NextResponse.json(data)
}
```

**Impact:** Any user can enumerate and access any media asset by guessing IDs.

**Fix Required:** Add authentication and verify user owns the listing associated with the media.

---

### 1.5 Booking Reference Files - No Authorization

**File:** `src/app/api/booking/reference-files/route.ts`
**Severity:** CRITICAL
**Lines:** 205-269 (GET), 275-336 (DELETE)

**Issue:** Both GET and DELETE operations use `listingId` or `bookingToken` without verifying ownership:

```typescript
export async function GET(request: NextRequest) {
  const listingId = searchParams.get('listingId')
  // NO ownership check - anyone can fetch files for any listing
  const { data } = await supabase.from('reference_files').select('*').eq('listing_id', listingId)
}
```

**Impact:** Attackers can fetch or delete reference files for any listing by guessing IDs.

**Fix Required:** Verify authenticated user owns the listing before returning/deleting files.

---

## 2. API Security Audit

### 2.1 Routes Missing Authentication

| Route | Method | File | Line | Issue |
|-------|--------|------|------|-------|
| `/api/media/[id]` | GET | `media/[id]/route.ts` | 23 | No auth, uses admin client |
| `/api/booking/session` | GET | `booking/session/route.ts` | 125 | Session retrieval without auth |

### 2.2 Routes Missing Authorization (Ownership Verification)

| Route | Method | File | Line | Issue |
|-------|--------|------|------|-------|
| `/api/booking/reference-files` | GET | `booking/reference-files/route.ts` | 205 | No listing ownership check |
| `/api/booking/reference-files` | DELETE | `booking/reference-files/route.ts` | 275 | No listing ownership check |
| `/api/loyalty/points` | GET | `loyalty/points/route.ts` | 34 | Wrong ID comparison |
| `/api/share-links` | POST | `share-links/route.ts` | 59 | Agent can create links for others |
| `/api/messages` | POST | `messages/route.ts` | 41 | No HTML sanitization |

### 2.3 Routes Missing Rate Limiting

| Route | Method | File | Risk |
|-------|--------|------|------|
| `/api/notifications/send` | POST | `notifications/send/route.ts` | SMS/email spam |
| `/api/sms/send` | POST | `sms/send/route.ts` | Budget exhaustion |
| `/api/media/[id]` | DELETE | `media/[id]/route.ts` | Rapid deletion |
| `/api/booking/session` | GET | `booking/session/route.ts` | Session enumeration |

### 2.4 Insufficient Input Validation

| Route | File | Line | Issue |
|-------|------|------|-------|
| `/api/messages` | `messages/route.ts` | 41 | No HTML/script sanitization |
| `/api/booking/session` | `booking/session/route.ts` | 82 | `form_data` accepts any Record |
| `/api/admin/payouts/settings` | `admin/payouts/settings/route.ts` | 106 | Invalid keys silently skipped |

### 2.5 Information Disclosure

| Route | File | Line | Issue |
|-------|------|------|-------|
| `/api/invoices/[id]/pdf` | `invoices/[id]/pdf/route.ts` | 71, 104 | Detailed error messages enable enumeration |
| `/api/payments/webhook` | `payments/webhook/route.ts` | 61-87 | Error details in response |

---

## 3. Integration Connection Issues

### 3.1 Missing Timeouts on External API Calls

| Integration | File | Line | Method |
|-------------|------|------|--------|
| RunPod HDR | `founddr/runpod-client.ts` | 142 | `processHDRAsync` |
| RunPod HDR | `founddr/runpod-client.ts` | 160 | `processHDRFromURLs` |
| Google Places | `google-places/client.ts` | 127 | `searchNearbyPlaces` |
| Google Maps | `google-maps/client.ts` | 70 | `getDriveTime` |
| Weather | `weather/client.ts` | 150 | `fetchFromOpenWeatherMap` |
| Slack | `slack/client.ts` | 482 | `apiCall` |
| Dropbox | `dropbox/client.ts` | 258 | `hasChanges` |
| Ticketmaster | `ticketmaster/client.ts` | 160 | API calls |
| News | `news/client.ts` | - | API calls |
| Movies | `movies/client.ts` | - | API calls |
| Instagram | `instagram/oembed.ts` | - | oembed fetch |

**Impact:** Any of these integrations can cause the application to hang indefinitely if the external service is slow or unresponsive.

**Fix Required:** Add `AbortController` with timeout to all fetch calls:
```typescript
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 30000)
const response = await fetch(url, { signal: controller.signal })
clearTimeout(timeout)
```

### 3.2 Missing HTTP Response Status Checks

| Integration | File | Line | Issue |
|-------------|------|------|-------|
| Google Places | `google-places/client.ts` | 137 | No `response.ok` check before JSON parse |
| Ticketmaster | `ticketmaster/client.ts` | 160 | Silently returns empty on 429 |
| Bannerbear | `bannerbear/client.ts` | 134-155 | `getImage()`, `getCollection()` miss checks |
| RunPod | `runpod-client.ts` | 167 | Direct JSON parse without status check |

### 3.3 Missing Retry Logic

These integrations make single requests without retry for transient failures:
- All Google API calls (Places, Maps, Calendar)
- Stripe Connect transfers
- Twilio SMS
- Resend emails

### 3.4 Rate Limiting Issues

**File:** `src/lib/integrations/instagram/publish.ts`
**Lines:** 173-193

**Issue:** Instagram carousel publishing uses fixed 500ms delay between requests:
```typescript
for (let i = 0; i < items.length; i++) {
  const container = await createImageContainer(...)
  await new Promise(resolve => setTimeout(resolve, 500))  // Fixed delay
}
```

**Impact:** Instagram API requires exponential backoff. Publishing fails with orphaned containers.

### 3.5 Hardcoded Configuration

| Item | File | Line | Issue |
|------|------|------|-------|
| Weather API v3.0 | `weather/client.ts` | 150 | Hardcoded API version |
| FoundDR Webhook | `founddr/client.ts` | 47 | Optional but undocumented |
| Cubicasa Webhook | `cubicasa/client.ts` | 109 | Optional but undocumented |

---

## 4. TypeScript Type Safety

### 4.1 `as any` Casts (151+ occurrences)

**Root Cause:** Supabase generated types don't match actual database schema.

**Most Affected Files:**

| File | Count | Pattern |
|------|-------|---------|
| `lib/analytics/lapsed-clients.ts` | 7 | `(supabase as any).from('agent_activity_summary')` |
| `lib/loyalty/service.ts` | 12 | `(supabase as any).from('loyalty_tiers')` |
| `lib/financial/reports.ts` | 12 | Various analytics views |
| `lib/staging/service.ts` | 9 | Staging table queries |
| `lib/coupons/service.ts` | 10 | Coupon queries |
| `lib/skills/execution-service.ts` | 8 | Skill execution records |
| `lib/payments/stripe-catalog.ts` | 3 | Stripe product sync |

### 4.2 `as unknown as` Double Casts (70+ occurrences)

**Pattern:** Double type assertions indicate fundamental type mismatches.

| File | Lines | Pattern |
|------|-------|---------|
| `hooks/useRealtimeCollaboration.ts` | 146, 172 | `presences[0] as unknown as PresenceState` |
| `agents/definitions/operations/media-tips.ts` | 198, 212 | Context input casting |
| `agents/definitions/content/carousel-creator.ts` | 388, 517, 583 | Input/output casting |
| `app/campaigns/[campaignId]/carousels/page.tsx` | 145 | JSONB slide casting |

### 4.3 Unsafe Array Access

| File | Line | Issue |
|------|------|-------|
| `lib/scheduling/waitlist.ts` | 298 | `entries[0]` without length check |
| `lib/agents/definitions/operations/listing-data-enricher.ts` | 61 | `data.results[0]` unchecked |
| `lib/skills/data/life-here.ts` | 162-163 | `results[0].geometry.location` |
| `lib/integrations/google-maps/client.ts` | 207 | `data.results[0].geometry.location` |
| `lib/payments/stripe-catalog.ts` | 112, 154, 251, 286 | Multiple unchecked array accesses |

### 4.4 Unsafe JSON.parse()

| File | Line | Issue |
|------|------|-------|
| `lib/shooting/shoot-mode.ts` | 480 | No try-catch |
| `lib/loyalty/service.ts` | 86 | Parsing perks field |
| `lib/skills/image/gemini-provider.ts` | 102 | No validation |
| `lib/listinglaunch/content-generator.ts` | 347 | No try-catch |

### 4.5 Helper Functions to Bypass Types

| File | Line | Purpose |
|------|------|---------|
| `lib/skills/render/carousel-render.ts` | 21 | `asRenderClient = (client: unknown) => client as any` |
| `lib/skills/render/template-render.ts` | 16 | Same pattern |

### 4.6 @ts-expect-error Comments

| File | Line | Reason |
|------|------|--------|
| `lib/integrations/virtual-staging/providers/gemini.ts` | 101 | `responseModalities` not in types |

---

## 5. Database & Migration Issues

### 5.1 Migration Order Problem

**Issue:** RLS policies reference `auth_user_id` column before it's created.

**Affected Migrations:**
- `20241230_007_skill_executions.sql` - Lines 96, 107, 120, 125, 137, 142, 154, 159
- `20250102_003_api_keys_and_invoices.sql` - Lines 113, 125, 137, 148
- `20250102_004_render_api.sql` - Lines 446, 456, 471, 481, 484, 494, 507, 508, 518, 528, 531, 546, 556, 565, 580, 595, 634

**Fix Migration:** `20241229_003_auth_user_id_fix.sql` exists but runs after affected migrations.

**Impact:** Fresh database initialization may fail.

### 5.2 Missing `IF NOT EXISTS` Clauses

| Table | File | Line |
|-------|------|------|
| `render_jobs` | `20250102_004_render_api.sql` | 146 |
| `render_job_slides` | `20250102_004_render_api.sql` | 220 |

**Impact:** Migration re-runs fail with "table already exists" error.

### 5.3 Missing Foreign Key Indexes

| Column | Table | File | Line |
|--------|-------|------|------|
| `allocated_to` | `company_pool` | `20250101_001_stripe_connect.sql` | 221 |
| `pay_period_id` | `time_entries` | `20250101_001_stripe_connect.sql` | 280 |
| `paid_by` | `pay_periods` | `20250101_001_stripe_connect.sql` | 355 |
| `updated_by` | `payout_settings` | `20250101_001_stripe_connect.sql` | 404 |
| `stripe_connect_id` | `partners` | `20250101_001_stripe_connect.sql` | 23 |

**Impact:** Slow queries on frequently-used foreign key joins.

### 5.4 RLS Policy Issues

| Table | File | Line | Issue |
|-------|------|------|-------|
| `render_cache` | `20250102_004_render_api.sql` | 536-539 | All authenticated users see all cache |
| `booking_sessions` | `20250102_005_booking_sessions.sql` | 37-48 | Blocks anonymous users |

### 5.5 Missing `updated_at` Triggers

| Table | File |
|-------|------|
| `company_pool` | `20250101_001_stripe_connect.sql` |
| `pay_periods` | `20250101_001_stripe_connect.sql` |
| `payout_settings` | `20250101_001_stripe_connect.sql` |

### 5.6 Inconsistent Cascade Behavior

| Relationship | Current | Issue |
|--------------|---------|-------|
| `staff.partner_id` → `partners` | No `ON DELETE` clause | Defaults to RESTRICT |
| `partner_payouts.staff_id` | `ON DELETE SET NULL` | No `ON UPDATE CASCADE` |
| `orders.agent_id` → `agents` | No cascade | Orphaned orders possible |

### 5.7 Type Mismatch in payout_settings

**File:** `supabase/migrations/20250101_001_stripe_connect.sql:399-406`

Numbers stored as JSON strings with quotes (`'"40"'`), requiring fragile parsing:
```typescript
settings[row.key] = typeof row.value === 'string'
  ? row.value.replace(/"/g, '')  // Strip quotes from JSON string
  : String(row.value)
```

---

## 6. Test Coverage Analysis

### 6.1 Overall Coverage

| Metric | Value |
|--------|-------|
| Total API Routes | 211 |
| Routes with Tests | 16 |
| Coverage | 7.6% |

### 6.2 Critical Untested Routes

#### Payment & Billing (HIGHEST PRIORITY)
- `/api/payments/create-intent` - Stripe payment intent creation
- `/api/payments/webhook` - Stripe webhook handler
- `/api/payments/split` - Payment splitting logic
- `/api/orders` - Order creation & retrieval

#### Stripe Connect & Payouts
- `/api/connect/staff/account` - Contractor Connect account creation
- `/api/connect/partner/account` - Partner Connect account setup
- `/api/connect/onboarding` - Stripe onboarding flow
- `/api/admin/payouts/settings` - System payout configuration
- `/api/admin/payouts/staff/[id]` - Individual staff payout config
- `/api/admin/payouts/partners/[id]` - Partner payout settings

#### Credits & Rewards
- `/api/credits/purchase` - Credit package purchases
- `/api/credits/spend` - Credit spending transactions
- `/api/credits/verify` - Credit verification endpoint
- `/api/rewards/redeem` - Reward redemption

### 6.3 Untested Business Logic Files

| File | Purpose | Risk |
|------|---------|------|
| `lib/payments/split-payment.ts` | Payment splitting calculation | Financial accuracy |
| `lib/payments/stripe-catalog.ts` | Stripe product catalog | Product sync issues |
| `lib/middleware/auth.ts` | Authentication middleware | Security bypass |
| `lib/email/resend.ts` | Email sending | Notification failures |
| `lib/pdf/invoice-generator.ts` | Invoice generation | Billing errors |
| `lib/queries/pricing.ts` | Pricing lookup | Quote accuracy |

### 6.4 Tests with Skip Logic

| File | Lines | Issue |
|------|-------|-------|
| `api/booking/availability/route.test.ts` | 18 | Skips without real Supabase |
| `test/integration/e2e-booking.test.ts` | 50, 55, 60, 67 | `it.skipIf()` for schema |

### 6.5 Fully Mocked Integration Tests

| File | Issue |
|------|-------|
| `lib/payments/stripe-connect.test.ts` | All Stripe/Supabase calls mocked |
| `lib/payments/payout-processor.test.ts` | All DB/Stripe calls mocked |

**Impact:** Tests verify code paths but not actual API behavior or database interactions.

### 6.6 Missing Edge Case Tests

- **Idempotency:** No tests for duplicate payment requests
- **Partial failures:** Order creation success but email failure
- **Webhook race conditions:** Out-of-order event processing
- **Concurrent requests:** Credit spending race conditions
- **Transaction rollback:** Partial payout failures

---

## 7. Environment Variable Audit

### 7.1 Undocumented Environment Variables (20+)

These variables are used in code but not documented in CLAUDE.md:

| Variable | File | Purpose |
|----------|------|---------|
| `LIFEHERE_API_KEY` | `app/developers/page.tsx:146` | Life Here API access |
| `NEWS_API_KEY` | `integrations/news/client.ts:10` | News integration |
| `EVENTBRITE_API_KEY` | `integrations/eventbrite/client.ts:9` | Events integration |
| `OPENWEATHERMAP_API_KEY` | `integrations/weather/client.ts:141` | Weather data |
| `TMDB_API_KEY` | `integrations/movies/client.ts:10` | Movie listings |
| `GOOGLE_CLIENT_ID` | `integrations/google-calendar/client.ts:20` | Calendar OAuth |
| `GOOGLE_CLIENT_SECRET` | `integrations/google-calendar/client.ts:21` | Calendar OAuth |
| `RAPIDAPI_PROXY_SECRET` | `api/middleware/api-key.ts:46` | RapidAPI proxy |
| `UPSTASH_REDIS_REST_URL` | `api/cache/redis.ts:56` | Rate limiting cache |
| `UPSTASH_REDIS_REST_TOKEN` | `api/cache/redis.ts:57` | Rate limiting cache |
| `LOG_LEVEL` | `lib/logger.ts:34` | Logging configuration |
| `NEXT_PUBLIC_APP_DOMAIN` | `middleware.ts:54` | Domain routing |
| `NEXT_PUBLIC_ADMIN_DOMAIN` | `middleware.ts:78` | Admin domain routing |
| `NEXT_PUBLIC_MARKETING_SITE` | `middleware.ts:148` | Marketing redirects |
| `NEXT_PUBLIC_BASE_URL` | `admin/ops/qc/[id]/page.tsx:101` | Alternative to APP_URL |
| `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` | `components/booking/GooglePlacesAutocomplete.tsx:145` | Client-side Places |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | `components/admin/ops/CalendarMapView.tsx:97` | Map rendering |
| `META_APP_TOKEN` | `integrations/instagram/oembed.ts:37` | Instagram access |
| `FOUNDDR_WEBHOOK_URL` | `integrations/founddr/client.ts:47` | HDR webhooks |
| `CUBICASA_WEBHOOK_URL` | `integrations/cubicasa/client.ts:109` | Floor plan webhooks |

### 7.2 Missing Startup Validation

Critical variables accessed with `!` assertion without initialization checks:

| Variable | File | Line |
|----------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL!` | `lib/supabase/server.ts` | 9 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY!` | `lib/supabase/server.ts` | 10 |
| `SUPABASE_SERVICE_ROLE_KEY!` | `lib/supabase/admin.ts` | 9 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!` | `components/booking/PaymentStep.tsx` | 19 |
| `LIFEHERE_API_KEY!` | `app/developers/page.tsx` | 146 |

### 7.3 Inconsistent Naming

| Issue | Examples |
|-------|----------|
| Same key, different names | `GOOGLE_PLACES_API_KEY` vs `GOOGLE_MAPS_API_KEY` |
| Template ID patterns | `BANNERBEAR_JUST_LISTED_SQUARE` vs `BANNERBEAR_CAROUSEL_TEMPLATE_ID` |
| Meta/Instagram overlap | `META_APP_TOKEN` vs `INSTAGRAM_ACCESS_TOKEN` |

### 7.4 Health Endpoint Gaps

`/api/health/integrations` is missing checks for:
- `LOG_LEVEL`
- `NEXT_PUBLIC_APP_DOMAIN` / `NEXT_PUBLIC_ADMIN_DOMAIN`
- `LIFEHERE_API_KEY`
- `NEWS_API_KEY` / `EVENTBRITE_API_KEY` / `OPENWEATHERMAP_API_KEY`
- `UPSTASH_REDIS_*` (cache layer)
- All `BANNERBEAR_*_TEMPLATE_ID` vars

---

## 8. Business Logic Issues

### 8.1 Payout Calculation Potential Overflow

**File:** `src/lib/payments/payout-processor.ts:167-228`

Payout percentages can theoretically exceed 100% if individual defaults are misconfigured:
- Photographer: 40%
- Videographer: 20%
- Partner: 25%
- Video Editor Pool: 5%
- QC Pool: 5%
- Operating Pool: 5%
- **Total: 100%** (but no validation prevents exceeding)

### 8.2 Zapier Filter Type Coercion Bug

**File:** `src/lib/integrations/zapier/client.ts:161-197`

```typescript
if ('$gt' in operators && !(Number(dataValue) > Number(operators.$gt))) return false
```

**Issue:** `Number(undefined)` returns `NaN`, causing all comparisons to fail silently.

### 8.3 Videographer Assignment Logic

**File:** `src/lib/payments/payout-processor.ts:142-162`

```typescript
async function getVideographerForListing(listingId: string): Promise<StaffMember | null> {
  const { data: assignment } = await supabase
    .from('photographer_assignments')  // Uses photographer_assignments table
    .select('photographer_id')
    .eq('listing_id', listingId)
    .single()
  // Then checks if role === 'videographer'
}
```

**Issue:** Queries photographer assignments to find videographers. If videographers have separate assignments, this won't find them.

### 8.4 Console Logging in Serverless Routes

**File:** `src/app/api/booking/airspace-qualify/route.ts:117,144`

```typescript
console.warn('[Airspace Qualify] Cache error:', cacheError)
console.error('[Airspace Qualify API] Error:', error)
```

**Issue:** `console.error` in serverless functions may not be captured by logging infrastructure.

### 8.5 TODO Comments Indicating Incomplete Features

| File | Line | TODO |
|------|------|------|
| `lib/analytics/reports/revenue.ts` | 661 | `by_service: [], // TODO: Implement if needed` |
| `components/agents/SoldMap.tsx` | 47, 349 | Map integration TODOs |
| `api/ops/listings/[id]/status/route.ts` | 132 | Migration dependency |
| `api/booking/airspace-qualify/route.ts` | 120 | Migration dependency |
| `api/admin/listings/[id]/integration/route.ts` | 262 | Cubicasa API stub |
| `api/admin/marketing/blast/route.ts` | 121 | Filter types stub |

---

## 9. Prioritized Fix Plan

### Week 1: Critical Security & Data Integrity

| Priority | Task | Files |
|----------|------|-------|
| 1 | Add database transaction to payout processor | `lib/payments/payout-processor.ts` |
| 2 | Add auth/ownership check to `/api/media/[id]` | `app/api/media/[id]/route.ts` |
| 3 | Add ownership verification to `/api/booking/reference-files` | `app/api/booking/reference-files/route.ts` |
| 4 | Fix loyalty points ID comparison | `app/api/loyalty/points/route.ts` |
| 5 | Add ownership check to `/api/share-links` | `app/api/share-links/route.ts` |
| 6 | Fix booking sessions RLS for anonymous users | `migrations/20250102_005_booking_sessions.sql` |

### Week 2: Integration Stability

| Priority | Task | Files |
|----------|------|-------|
| 7 | Add AbortController timeouts to all fetch calls | 15+ integration files |
| 8 | Add `response.ok` checks before JSON parse | `google-places`, `ticketmaster`, `bannerbear` |
| 9 | Add rate limiting to notifications/SMS | `app/api/notifications/send`, `app/api/sms/send` |
| 10 | Fix Instagram publishing rate limiting | `lib/integrations/instagram/publish.ts` |
| 11 | Remove or implement virtual staging | `lib/integrations/virtual-staging/client.ts` |

### Week 3: Type Safety & Database

| Priority | Task | Files |
|----------|------|-------|
| 12 | Regenerate Supabase types from actual schema | `lib/supabase/types.ts` |
| 13 | Fix migration order for `auth_user_id` | Multiple migration files |
| 14 | Add `IF NOT EXISTS` to render tables | `migrations/20250102_004_render_api.sql` |
| 15 | Add missing FK indexes | `migrations/20250101_001_stripe_connect.sql` |
| 16 | Fix render_cache RLS scope | `migrations/20250102_004_render_api.sql` |

### Week 4: Testing & Documentation

| Priority | Task | Files |
|----------|------|-------|
| 17 | Add tests for payment webhook | `app/api/payments/webhook/route.test.ts` |
| 18 | Add tests for order creation | `app/api/orders/route.test.ts` |
| 19 | Add tests for payout processor (integration) | `lib/payments/payout-processor.test.ts` |
| 20 | Document missing environment variables | `CLAUDE.md` |
| 21 | Add startup env validation module | `lib/env.ts` |

### Ongoing Improvements

- Increase test coverage to 50% of API routes
- Standardize error handling patterns across integrations
- Replace `as any` casts with proper type definitions
- Add structured logging to all routes

---

## Appendix A: File Reference

### Critical Files Requiring Immediate Attention

```
src/lib/payments/payout-processor.ts
src/app/api/media/[id]/route.ts
src/app/api/booking/reference-files/route.ts
src/app/api/loyalty/points/route.ts
src/app/api/share-links/route.ts
src/lib/integrations/virtual-staging/client.ts
supabase/migrations/20250102_005_booking_sessions.sql
```

### Integration Files Requiring Timeout Addition

```
src/lib/integrations/founddr/runpod-client.ts
src/lib/integrations/google-places/client.ts
src/lib/integrations/google-maps/client.ts
src/lib/integrations/weather/client.ts
src/lib/integrations/slack/client.ts
src/lib/integrations/dropbox/client.ts
src/lib/integrations/ticketmaster/client.ts
src/lib/integrations/news/client.ts
src/lib/integrations/movies/client.ts
src/lib/integrations/instagram/oembed.ts
src/lib/integrations/instagram/publish.ts
```

### Files with Excessive `as any` Casts

```
src/lib/analytics/lapsed-clients.ts (7)
src/lib/loyalty/service.ts (12)
src/lib/financial/reports.ts (12)
src/lib/staging/service.ts (9)
src/lib/coupons/service.ts (10)
src/lib/skills/execution-service.ts (8)
```

---

## Appendix B: Statistics Summary

| Category | Count |
|----------|-------|
| Total Issues Found | 75+ |
| Critical Issues | 5 |
| Security Vulnerabilities | 8 routes |
| Missing Timeouts | 15+ integrations |
| Type Safety Issues (`as any`) | 151+ occurrences |
| Double Casts (`as unknown as`) | 70+ occurrences |
| Untested API Routes | 195 of 211 (92.4%) |
| Undocumented Env Vars | 20+ |
| Database Migration Issues | 10 |

---

*Report generated by Claude Code (Opus 4.5) on January 2, 2026*
