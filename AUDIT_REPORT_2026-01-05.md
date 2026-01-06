# ASM Portal Audit (2026-01-05)

## Scope
- Reviewed current codebase and `CLAUDE.md` to align with intended architecture and recent changes.
- Focused on login failures, admin/ops dashboard errors, and data-loading issues seen in screenshots.
- Checked auth/data flow paths and Supabase/Vercel config references in code.

## Phase 1: Build & Auth Foundations
**Primary Findings**
- **Clerk provider hard dependency**: `src/app/layout.tsx` wrapped the entire app in `ClerkProvider` unconditionally. If Clerk keys are unset/paused, this causes a server-side crash (`Digest 701318681`).
- **Auth bypass left enabled**: `src/middleware.ts` still exposes `/admin`, `/team`, and `/dashboard` as public routes for testing. This is a production security risk.
- **Clerk-only UI components**: `/sign-in/*` and `/sign-up/*` pages always render Clerk components; if Clerk is paused, these pages can crash.

**Fixes Applied (Code)**
- Added a conditional `ClerkProvider` guard to allow the app to run when Clerk is paused.
- Added an auth bypass toggle (`AUTH_BYPASS` / `NEXT_PUBLIC_AUTH_BYPASS`) instead of hard-coding admin routes as public.
- Added Clerk-disabled fallbacks on all sign-in/sign-up pages.

## Phase 2: Runtime & Data Access
**Primary Findings**
- **Dual-auth mismatch**: Most admin API routes used Supabase session auth (`supabase.auth.getUser()`), but the portal uses Clerk. Without a Supabase session, admin APIs return 401/403 or empty data, which matches dashboard failures.
- **Operations dashboard empty state**: `src/app/admin/ops/page.tsx` used the anon Supabase client and RLS. This returns empty data if the user only has a Clerk session.
- **Calendar map date mismatch**: `src/app/admin/ops/calendar-map/page.tsx` called `/api/admin/team/assignments?date=...`, but the API expected `from`/`to`.
- **Realtime connection errors**: Realtime hooks didn’t guard missing Supabase env values; errors surfaced as “Connection error”.

**Fixes Applied (Code)**
- Added `src/lib/auth/server-access.ts` to unify Clerk + Supabase auth and return a staff/partner record.
- Updated admin API routes to use the unified auth and the admin Supabase client:
  - `src/app/api/admin/staff/route.ts`
  - `src/app/api/admin/staff/[id]/route.ts`
  - `src/app/api/admin/analytics/route.ts`
  - `src/app/api/admin/marketing/campaigns/route.ts`
  - `src/app/api/admin/team/assignments/route.ts`
- Switched `src/app/admin/ops/page.tsx` to use the admin Supabase client with staff/partner auth.
- Fixed calendar map query to use `from`/`to`, and added `date` fallback in the API.
- Added Supabase env guards in realtime hooks.

## Phase 3: Integrations & External Config
**Primary Findings**
- **Missing env vars** block key integrations (Stripe Connect webhook, Clerk webhook, Gemini/RunPod, etc.).
- **Maps**: Calendar map explicitly needs `NEXT_PUBLIC_GOOGLE_MAPS_KEY` or `NEXT_PUBLIC_MAPBOX_TOKEN`.
- **Supabase migrations**: RLS updates rely on `auth_user_id` but require `sync_staff_auth_user_ids()` / `sync_agent_auth_user_ids()` to be run after deployment.

**Action Required (External)**
- Set env vars in Vercel/Supabase:
  - `STRIPE_CONNECT_WEBHOOK_SECRET`
  - `CLERK_WEBHOOK_SECRET`
  - `GOOGLE_AI_API_KEY`
  - `RUNPOD_ENDPOINT_ID` / `RUNPOD_API_KEY`
- Register webhooks in Stripe/Clerk dashboards.
- Apply latest Supabase migrations and run the auth-user-id sync helpers.

## Phase 4: CI & Testing
**Primary Findings**
- **TypeScript test errors**: ~167 errors remain in test files (non-blocking but noisy in CI).
- **DB schema drift**: Staff columns (`skills`, `certifications`) are referenced in code but not guaranteed in DB unless the SQL fix in `CLAUDE.md` has been applied.
- **Supabase types** appear stale relative to the current schema; regen recommended after migrations.

## Summary of Code Changes in This Pass
- Added unified server auth helper: `src/lib/auth/server-access.ts`.
- Added Clerk-disabled fallback in root layout and auth pages:
  - `src/app/layout.tsx`
  - `src/app/sign-in/*`
  - `src/app/sign-up/*`
- Guarded auth bypass in middleware: `src/middleware.ts`.
- Patched admin API routes to work with Clerk sessions and admin Supabase client.
- Fixed ops/calendar map date mismatch and added realtime guard.

## Open Questions / Decisions Needed
1. **Clerk vs Supabase**: Should Clerk remain primary for staff/agents, or should we move admin APIs to Supabase-only auth? The current fixes support both, but confirming the desired final state will prevent future drift.
2. **Auth bypass**: Should `AUTH_BYPASS` be enabled for staging only? Production should keep it off.
3. **Partner permissions**: Partner role is treated as admin-equivalent for some endpoints. Confirm if partners should manage staff/analytics globally.

---

### Where this report lives
- `AUDIT_REPORT_2026-01-05.md`
