# Code Review Findings

## Scope
- src/app/api (admin analytics, media, Stripe sync, admin media preview)
- src/lib (auth middleware, Stripe Connect, rate limiting, API key cache, SMS)
- package.json (runtime dependencies)

## Severity Legend
- Critical: Unauthenticated data exposure or privilege escalation with broad impact.
- High: Authz bypass, double-spend risk, or high-impact operational failures.
- Medium: Reliability, correctness, or security hardening issues.

## Findings

### CRIT-01: Unauthenticated admin realtime analytics endpoint
- Location: `src/app/api/admin/analytics/realtime/route.ts:1`
- Issue: No auth or staff checks before returning orders, revenue, leads, and listings data.
- Impact: Anyone can hit this endpoint and read sensitive metrics if RLS permits or is misconfigured.
- Recommendation: Require staff auth (and role if needed) at the top of the handler, matching other admin analytics routes.
- Suggested tests: Add a route test that asserts 401/403 for unauthenticated users and non-staff users.

### CRIT-02: Media GET endpoints expose data via service-role client
- Location: `src/app/api/media/listing/[listingId]/route.ts:21`, `src/app/api/media/[id]/route.ts:23`
- Issue: Both GET endpoints use `createAdminClient()` with no auth/ownership checks.
- Impact: Listing media and metadata can be exfiltrated by guessing listing IDs or asset IDs; service-role bypasses RLS.
- Recommendation: Enforce auth and listing ownership (or a verified share token) before using any admin client, or use user-scoped client with RLS.
- Suggested tests: Add tests for unauthenticated requests (401) and cross-tenant access (403).

### HIGH-01: Inconsistent staff auth allows bypass of deactivation and roles
- Location: `src/lib/api/middleware/require-staff.ts:20`, `src/lib/middleware/auth.ts:66`, `src/app/api/admin/skills/execute/route.ts:9`
- Issue: Two staff auth helpers behave differently; the API middleware auto-creates staff and does not check `is_active` or roles, while the core auth does.
- Impact: Offboarded or unauthorized `@aerialshots.media` users can regain access or skip role enforcement on routes that use the API helper.
- Recommendation: Consolidate to a single staff auth function that enforces `is_active` and roles, and remove auto-registration (or gate it behind an admin-only flow).
- Suggested tests: Ensure deactivated staff are blocked across all admin routes; add role-based tests for admin-only actions.

### HIGH-02: Admin media preview GET allows any authenticated user
- Location: `src/app/api/admin/media/[id]/preview/route.ts:10`
- Issue: GET checks only for an authenticated session, not staff/role, then reads media via admin client.
- Impact: Any logged-in user can access admin media preview data by ID.
- Recommendation: Require staff (and role if appropriate) before admin-client reads.
- Suggested tests: Add authz tests for non-staff users on GET.

### HIGH-03: Stripe Connect transfers are not idempotent
- Location: `src/lib/payments/stripe-connect.ts:258`
- Issue: Idempotency key includes `Date.now()`, so retries generate new keys and can create duplicate transfers.
- Impact: Double-payout risk on retries or transient failures.
- Recommendation: Use a deterministic idempotency key (order ID + destination + amount), and persist it with transfer records.
- Suggested tests: Simulate retry and assert only one transfer is created.

### MED-01: Stripe catalog sync auth is domain-only
- Location: `src/app/api/admin/stripe/sync/route.ts:18`
- Issue: `isAdmin()` only checks email domain, not `staff` membership or `is_active`/role.
- Impact: Offboarded or unapproved domain users can sync pricing to Stripe.
- Recommendation: Use the shared staff auth helper with role checks (e.g., `admin`).
- Suggested tests: Ensure non-staff domain users are blocked.

### MED-02: Rate limit headers report current usage as limit
- Location: `src/lib/utils/rate-limit.ts:107`
- Issue: `X-RateLimit-Limit` is set to `result.current` instead of the configured limit.
- Impact: Clients get incorrect limit metadata, which can break backoff or autoscaling logic.
- Recommendation: Populate `X-RateLimit-Limit` with the configured limit value.
- Suggested tests: Unit test header values for a known limit.

### MED-03: API key cache can grow without bound
- Location: `src/lib/api/middleware/api-key.ts:8`
- Issue: In-memory `Map` has TTL checks only on read; no eviction or size cap.
- Impact: High-cardinality keys can leak memory over time.
- Recommendation: Add periodic cleanup or an LRU with a max size; consider Redis-backed cache if needed.
- Suggested tests: Add unit test to verify stale entries are cleaned up.

### MED-04: Twilio dependency missing for SMS
- Location: `src/lib/notifications/sms.ts:21`, `package.json`
- Issue: SMS attempts require `twilio`, but it is not listed in dependencies.
- Impact: SMS will always fail in production even when Twilio credentials are configured.
- Recommendation: Add `twilio` to `dependencies` or make SMS feature explicitly optional with clear feature flags.
- Suggested tests: Add a unit test that mocks the Twilio client and validates send paths.
