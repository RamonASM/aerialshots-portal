# ASM Portal Audit (2026-01-07)

## Scope
- Re-scanned admin/team dashboards and API access after the latest fixes.
- Focused on admin sections referenced in screenshots (marketing, analytics, team settings, ops editor).

## Phase 1: Auth & Data Access
**Findings**
- Admin/partner APIs still return 401 if Clerk webhooks have not populated `staff`/`partners` records; `getStaffAccess()` depends on those rows.
- Team portals and the admin notification center still use Supabase session auth (`createClient`) and will fail with Clerk-only sign-in.
- Some admin pages were querying Supabase directly in the browser, which broke under Clerk-only sessions.

**Fixes Applied**
- Added Clerk-compatible admin APIs for marketing assets/templates and ops editor jobs.
- Updated the admin marketing assets/templates pages to use the new APIs.
- Replaced a `useState` side-effect in the editor job detail page with `useEffect` and switched to API calls.

**Remaining Action**
- Decide whether team portals should stay Supabase-auth or migrate fully to Clerk; update `/api/team/*` and `src/app/team/*` accordingly.

## Phase 2: Marketing Schema Drift
**Findings**
- `marketing_assets` is defined twice with incompatible schemas (`type/format/status` vs `asset_type/file_url/is_favorite`). The later migration uses `CREATE TABLE IF NOT EXISTS`, so older tables do not get upgraded.
- `social_templates` schema uses `category` + `template_data`, while older UI code expected `template_type` + `content`.

**Fixes Applied**
- Admin marketing pages now read/write `category`/`template_data` and normalize asset fields (`file_url`, `tags`, `is_favorite`, `download_count`) when possible.

**Remaining Action**
- Create/apply a database migration to reconcile `marketing_assets` to the newer schema (or update UI/API to target the legacy schema explicitly).

## Phase 3: External Configuration
- Ensure the live Vercel project includes `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. If the domain points to the wrong project, pages can throw `The string did not match the expected pattern`.
- Ops dashboard realtime errors indicate missing Realtime config or envs.
- Calendar map view needs `NEXT_PUBLIC_GOOGLE_MAPS_KEY` or `NEXT_PUBLIC_MAPBOX_TOKEN`.

## Changes Applied in This Pass
- Added: `src/app/api/admin/marketing/assets/route.ts`
- Added: `src/app/api/admin/marketing/assets/[id]/route.ts`
- Added: `src/app/api/admin/marketing/templates/route.ts`
- Added: `src/app/api/admin/marketing/templates/[id]/route.ts`
- Added: `src/app/api/admin/ops/editor/jobs/[id]/route.ts`
- Updated: `src/app/admin/marketing/assets/page.tsx`
- Updated: `src/app/admin/marketing/templates/page.tsx`
- Updated: `src/app/admin/ops/editor/jobs/[id]/page.tsx`

---

Report file: `AUDIT_REPORT_2026-01-07.md`
