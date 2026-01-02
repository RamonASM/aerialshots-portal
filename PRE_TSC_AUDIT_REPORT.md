# Pre-TypeScript Codebase Audit Report

Date: 2026-01-02T14:09:09Z
Scope: Manual review of API routes, supporting libs, and Supabase migrations. No code changes. No runtime tests executed.

## Summary
- Multiple public endpoints use admin or service-role clients without authentication or ownership checks.
- Several schema and enum mismatches can break inserts or hide data.
- OAuth and webhook verification gaps can enable account linking abuse or spoofed callbacks.
- Credits and payments flows have consistency and idempotency risks.

## Findings By Severity

### Critical

C-01. ListingLaunch endpoints are unauthenticated and use admin client. Any caller can trigger research, generate questions, submit answers, generate content, render carousels, update slides/captions, and spend credits.
- Evidence: `src/app/api/campaigns/[campaignId]/research/route.ts:61` `src/app/api/campaigns/[campaignId]/questions/route.ts:20` `src/app/api/campaigns/[campaignId]/questions/route.ts:53` `src/app/api/campaigns/[campaignId]/answers/route.ts:14` `src/app/api/campaigns/[campaignId]/generate/route.ts:27` `src/app/api/campaigns/[campaignId]/blog/route.ts:28` `src/app/api/campaigns/[campaignId]/carousels/[carouselId]/render/route.ts:22` `src/app/api/campaigns/[campaignId]/carousels/[carouselId]/slides/route.ts:19` `src/app/api/campaigns/[campaignId]/carousels/[carouselId]/caption/route.ts:9`
- Impact: Unauthorized content generation, credit theft, and campaign tampering.

C-02. Media asset endpoints are public and use admin client.
- Evidence: `src/app/api/media/[id]/route.ts:23` `src/app/api/media/listing/[listingId]/route.ts:21`
- Impact: Anyone with an ID can enumerate media assets and metadata.

C-03. Booking reference files API allows unauthenticated upload/read/delete using admin client and returns public URLs.
- Evidence: `src/app/api/booking/reference-files/route.ts:49` `src/app/api/booking/reference-files/route.ts:196` `src/app/api/booking/reference-files/route.ts:266` `src/app/api/booking/reference-files/route.ts:134`
- Impact: Sensitive attachments can be uploaded, exfiltrated, or deleted if listingId or bookingToken is guessed.

C-04. Booking session API is unauthenticated. Session ID grants access to PII and session mutations.
- Evidence: `src/app/api/booking/session/route.ts:48` `src/app/api/booking/session/route.ts:116` `src/app/api/booking/session/route.ts:180`
- Impact: Anyone can read or alter another user’s booking session if they guess a session ID.

C-05. Rewards redeem API is unauthenticated and uses admin client.
- Evidence: `src/app/api/rewards/redeem/route.ts:11`
- Impact: Any caller can deduct credits for any agent and create redemptions.

C-06. Instagram connect/publish/disconnect APIs are unauthenticated.
- Evidence: `src/app/api/instagram/connect/route.ts:6` `src/app/api/instagram/publish/route.ts:8` `src/app/api/instagram/disconnect/route.ts:4`
- Impact: Attackers can link, publish, or revoke Instagram for any agent ID.

C-07. Admin realtime analytics endpoint has no auth check.
- Evidence: `src/app/api/admin/analytics/realtime/route.ts:4`
- Impact: Potential exposure of revenue, orders, and leads data if RLS is permissive.

C-08. Amenity categories admin content endpoint has no auth check.
- Evidence: `src/app/api/admin/content/amenity-categories/route.ts:10`
- Impact: Internal content can be scraped by anonymous users.

C-09. Booking availability uses service-role key on a public endpoint.
- Evidence: `src/app/api/booking/availability/route.ts:12`
- Impact: RLS bypass and exposure of internal scheduling data.

C-10. Airspace qualify is public and uses admin client cache.
- Evidence: `src/app/api/booking/airspace-qualify/route.ts:18` `src/app/api/booking/airspace-qualify/route.ts:39`
- Impact: Public callers can write to airspace cache and probe internal integrations.

C-11. RLS policy allows public SELECT on media assets.
- Evidence: `supabase/migrations/20241210_001_initial_schema.sql:468`
- Impact: Media asset records are readable by anyone, increasing exposure when paired with public endpoints.

### High

H-01. OAuth state is unsigned and not server-validated for Google Calendar and Instagram.
- Evidence: `src/app/api/integrations/google-calendar/callback/route.ts:31` `src/app/api/integrations/google-calendar/callback/route.ts:34` `src/app/api/instagram/callback/route.ts:35` `src/app/api/instagram/callback/route.ts:39` `src/app/api/instagram/connect/route.ts:42`
- Impact: Account linking spoofing and takeover by state tampering.

H-02. OAuth tokens are stored in plaintext.
- Evidence: `src/app/api/integrations/google-calendar/callback/route.ts:68` `src/app/api/integrations/google-calendar/callback/route.ts:78` `src/lib/integrations/canva/oauth.ts:106`
- Impact: Token leakage from database compromises connected accounts.

H-03. FoundDR and inpaint webhooks only verify a secret if env is set.
- Evidence: `src/app/api/webhooks/founddr/route.ts:33` `src/app/api/inpaint/webhook/route.ts:24`
- Impact: If secrets are missing in production, spoofed webhooks can mutate data.

H-04. Stripe Connect refresh/return endpoints have no auth or state validation.
- Evidence: `src/app/api/connect/refresh/route.ts:11` `src/app/api/connect/return/route.ts:11`
- Impact: Onboarding links can be generated/synced for arbitrary staff/partners.

H-05. Credit verification trusts Stripe session metadata and is not tied to the authenticated user.
- Evidence: `src/app/api/credits/verify/route.ts:35` `src/app/api/credits/verify/route.ts:53` `src/app/api/credits/verify/route.ts:82`
- Impact: If a session ID leaks, credits can be applied to an arbitrary agent.

H-06. Inpaint API checks authentication only, not staff role or listing ownership.
- Evidence: `src/app/api/inpaint/route.ts:17` `src/app/api/inpaint/route.ts:54`
- Impact: Any authenticated user can create inpainting jobs for any media asset.

H-07. Low-balance cron endpoint allows unauthenticated access when CRON_SECRET is missing.
- Evidence: `src/app/api/cron/check-low-balances/route.ts:12` `src/app/api/cron/check-low-balances/route.ts:16`
- Impact: Unauthenticated callers can trigger email spam or load spikes.

H-08. Domain-only staff checks (no staff record or is_active validation) on sensitive endpoints.
- Evidence: `src/app/api/media/upload/route.ts:105` `src/app/api/media/migrate/route.ts:34` `src/app/api/media/[id]/route.ts:77` `src/app/api/founddr/retry/route.ts:31`
- Impact: Any user with an @aerialshots.media email can act as staff even if not active or provisioned.

### Data Integrity and Schema Mismatches

D-01. credit_transactions types used in code do not exist in the original check constraint.
- Evidence: `src/app/api/campaigns/[campaignId]/research/route.ts:329` `src/app/api/campaigns/[campaignId]/generate/route.ts:205` `src/app/api/campaigns/[campaignId]/blog/route.ts:159` `src/app/api/campaigns/[campaignId]/carousels/[carouselId]/render/route.ts:193` `src/lib/credits/service.ts:269` `supabase/migrations/20241210_001_initial_schema.sql:250` `supabase/migrations/20241210_001_initial_schema.sql:254`
- Impact: Inserts fail, leaving credit balances and ledgers inconsistent.

D-02. Credit verification inserts `type: purchase`, which is not in the original constraint. Later migration uses CREATE TABLE IF NOT EXISTS, so the constraint may never update.
- Evidence: `src/app/api/credits/verify/route.ts:113` `supabase/migrations/20241210_001_initial_schema.sql:254` `supabase/migrations/20241229_001_credits_system.sql:28`
- Impact: Purchase transactions can fail at runtime.

D-03. reward_type mismatch in redemptions.
- Evidence: `src/app/api/rewards/redeem/route.ts:8` `supabase/migrations/20241210_001_initial_schema.sql:271`
- Impact: Redemption insert may fail after credits are deducted.

D-04. media_assets type/category mismatch for floor plans.
- Evidence: `supabase/migrations/20241210_001_initial_schema.sql:150` `supabase/migrations/20241210_001_initial_schema.sql:154` `supabase/migrations/20241210_001_initial_schema.sql:155` `src/app/api/webhooks/cubicasa/route.ts:170` `src/app/api/seller/[token]/deliverables/route.ts:122`
- Impact: Floor plans can fail inserts or be excluded from deliverables.

D-05. qc_status values are inconsistent with the database constraint.
- Evidence: `supabase/migrations/20241228_013_founddr_integration.sql:71` `src/app/api/processing/route.ts:155` `src/app/api/founddr/process-runpod/route.ts:142`
- Impact: Media updates can fail and assets get stuck in processing.

D-06. Staff role constraint conflicts with policies and code.
- Evidence: `supabase/migrations/20241210_001_initial_schema.sql:31` `supabase/migrations/20241228_009_team_territories.sql:57` `supabase/migrations/20241228_006_phase13_team_portals.sql:290` `src/lib/api/middleware/require-staff.ts:47`
- Impact: Policies expect owner/manager roles that are not allowed by the constraint; auto-creation uses role `staff` which is invalid.

D-07. Staff auth identity mismatch (user_id vs auth_user_id) breaks authorization in multiple admin endpoints.
- Evidence: `supabase/migrations/20241229_003_auth_user_id_fix.sql:8` `src/app/api/admin/analytics/revenue/route.ts:20` `src/app/api/admin/analytics/export/route.ts:20` `src/app/api/admin/analytics/geographic/route.ts:35` `src/app/api/admin/media/[id]/preview/route.ts:82` `src/app/api/push/send/route.ts:37`
- Impact: Staff checks fail or use the wrong identifier, blocking access or misattributing permissions.

D-08. Seller portal uses `payment_status = 'paid'` but webhooks set `succeeded`.
- Evidence: `src/app/api/seller/[token]/route.ts:131` `src/app/api/seller/[token]/deliverables/route.ts:56` `src/app/api/payments/webhook/route.ts:110`
- Impact: Seller media access may never unlock after payment.

### Reliability and Behavior

R-01. Credits service updates balance and ledger without transactions; idempotency uses description strings.
- Evidence: `src/lib/credits/service.ts:131` `src/lib/credits/service.ts:164` `src/lib/credits/service.ts:221`
- Impact: Race conditions can desync balances and double-spend credits.

R-02. Coupon max discount calculation caps percent instead of dollars.
- Evidence: `src/app/api/coupons/validate/route.ts:71`
- Impact: Discounts can exceed configured max_discount_cents.

R-03. Booking availability conflict detection only checks exact timestamps.
- Evidence: `src/app/api/booking/availability/route.ts:107` `src/app/api/booking/availability/route.ts:136` `src/app/api/booking/availability/route.ts:228`
- Impact: Overlapping bookings can slip through and cause double-booking.

R-04. Stripe payments webhook uses anon client; RLS likely blocks updates.
- Evidence: `src/app/api/payments/webhook/route.ts:89`
- Impact: Orders may not update to paid/failed status.

R-05. Cubicasa webhook uses anon client and never marks webhook_events processed due to mismatched event ID.
- Evidence: `src/app/api/webhooks/cubicasa/route.ts:101` `src/app/api/webhooks/cubicasa/route.ts:121` `src/app/api/webhooks/cubicasa/route.ts:224`
- Impact: Duplicate processing and incorrect webhook state.

R-06. Booking session read/update has no auth; sessionId acts as full access token.
- Evidence: `src/app/api/booking/session/route.ts:116` `src/app/api/booking/session/route.ts:180`
- Impact: PII exposure and session tampering.

R-07. Rate limiting is in-memory and misreports the limit header.
- Evidence: `src/lib/utils/rate-limit.ts:14` `src/lib/utils/rate-limit.ts:107`
- Impact: Ineffective throttling in multi-instance deployments and incorrect client guidance.

R-08. Magic-link route logs action link prefixes.
- Evidence: `src/app/api/auth/magic-link/route.ts:83` `src/app/api/auth/magic-link/route.ts:100`
- Impact: Log leakage can enable account takeover if logs are exposed.

R-09. Instagram embed caches and returns raw HTML.
- Evidence: `src/app/api/instagram/embed/route.ts:33` `src/app/api/instagram/embed/route.ts:91`
- Impact: XSS risk if embed HTML is rendered without sanitization.

R-10. Processing endpoint does not validate listing ownership.
- Evidence: `src/app/api/processing/route.ts:55`
- Impact: Authenticated users can trigger processing for arbitrary listings.

## Open Questions
- Should ListingLaunch be internal-only rather than public API endpoints?
- Which credit ledger is authoritative: `credit_transactions` or `unified_credit_transactions`?
- What is the single source of truth for staff identity (email, auth_user_id, or clerk_user_id)?
- What payment status values are canonical for granting seller access?

