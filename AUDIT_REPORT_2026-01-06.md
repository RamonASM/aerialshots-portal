# ASM Portal Audit (2026-01-06)

## Scope
- Reviewed current codebase state against `CLAUDE.md` requirements and recent dashboard failures.
- Focused on auth/runtime failures, admin API access, and broken dashboard sections shown in screenshots.
- Documented external dependencies (Supabase, Vercel, Stripe, Clerk) that must be verified outside the repo.

## Phase 1: Build & Schema Health
**Findings**
- **Schema drift (staff.skills/certifications)**: Team settings pages query `staff.skills` and `staff.certifications` but the DB may not have those columns. This can throw server errors.
- **Types drift risk**: Supabase types should be regenerated after migrations for accurate TS checks.
- **Test-only TypeScript errors**: ~167 errors remain in `test/` files (non-blocking but polluting CI).

**Action Required (DB)**
```sql
ALTER TABLE staff ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
COMMENT ON COLUMN staff.certifications IS 'Array of certifications (FAA Part 107, etc.)';
COMMENT ON COLUMN staff.skills IS 'Array of skills (drone, video, HDR, etc.)';
```

## Phase 2: Runtime & Auth
**Primary Issues Found**
- **API redirects breaking JSON clients**: Middleware redirected unauthenticated API requests to `/sign-in`, causing JSON parsing errors like “The string did not match the expected pattern.”
- **Auth bypass not honored by server-access**: `getStaffAccess()` returned null when Clerk was disabled and no Supabase session existed, blocking admin APIs even with `AUTH_BYPASS` enabled.
- **Admin API auth mismatch**: Many `/api/admin/*` routes still use Supabase session auth (`createClient()` + `auth.getUser()`), which fails when users authenticate via Clerk only.

**Fixes Applied (Code)**
- Middleware now returns JSON `401/403` for API requests instead of redirects.
- `getStaffAccess()` now supports auth bypass with an optional override identity.

**New/Updated Env Support (Optional)**
- `AUTH_BYPASS_EMAIL` (maps bypass to a real staff/partner email)
- `AUTH_BYPASS_ROLE` (defaults to `admin`)
- `AUTH_BYPASS_ID` (fallback id when no record exists)

**Status Update (Admin API Routes)**
- All `/api/admin/*` routes that previously used Supabase session auth were migrated to `requireStaffAccess()` + `createAdminClient()` for Clerk compatibility.
- Added missing routes for admin UI actions:
  - `src/app/api/admin/analytics/alerts/[id]/route.ts` (PATCH/DELETE)
  - `src/app/api/admin/communities/[id]/route.ts` (PATCH/DELETE)

## Phase 3: Integrations & External Config
**Blocking Config Items**
- Missing envs: `STRIPE_CONNECT_WEBHOOK_SECRET`, `CLERK_WEBHOOK_SECRET`, `GOOGLE_AI_API_KEY`, `RUNPOD_ENDPOINT_ID`, `RUNPOD_API_KEY`.
- Webhooks need verification and registration in Stripe + Clerk dashboards.
- Map view requires `NEXT_PUBLIC_GOOGLE_MAPS_KEY` or `NEXT_PUBLIC_MAPBOX_TOKEN`.

**Known Drift**
- Several email/notification templates still reference `portal.aerialshots.media` rather than `app.aerialshots.media`.

## Phase 4: Deploy & CI
**Risks**
- `AUTH_BYPASS` must be OFF in production after debugging.
- Duplicate Vercel project (`aerialshots_portal`) should be deleted to avoid env confusion.
- Supabase migrations must be applied (`npx supabase db push`) before deployment to avoid RLS/runtime mismatches.

## Changes Applied in This Pass
- Added auth bypass support in `src/lib/auth/server-access.ts`.
- Middleware returns JSON `401/403` for `/api/*` routes instead of HTML redirects.
- Migrated all admin API routes to Clerk-compatible auth + admin Supabase client.
- Added missing analytics alerts and communities admin endpoints.

## Next Steps (Recommended)
1. Apply the staff column fix in Supabase.
2. Set missing env vars and register webhooks in Stripe/Clerk.
3. Re-run deployment, then re-test admin dashboards and agent/partner/staff portals.

---

Report file: `AUDIT_REPORT_2026-01-06.md`
