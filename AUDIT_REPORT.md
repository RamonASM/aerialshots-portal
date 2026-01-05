# Audit Report: Portal Media URL Migration & Supabase Types

## Scope
- Reviewed references to `media_url` and `aryeo_url` usage across the portal.
- Checked Supabase generated types and custom types for table coverage.
- Spot-checked Storywork and Instagram-related tables.
- No tests or builds were executed.

## Findings
### Critical
- `media_assets` queries still select `media_url` (and sometimes `processed_storage_path`), but `src/lib/supabase/types.ts` shows `media_assets` only has `aryeo_url` and `storage_path`. If the DB matches those types, these queries will fail at runtime.
  - `src/app/team/videographer/job/[id]/page.tsx:119`
  - `src/app/team/editor/job/[id]/page.tsx:84`
  - `src/app/api/admin/qc/listings/[id]/approve/route.ts:77`
  - `src/app/admin/ops/jobs/[id]/page.tsx:131`
  - `src/app/team/qc/rejected/page.tsx:47`
  - `src/app/team/qc/review/[id]/page.tsx:125`
  - `src/lib/queries/portfolio.ts:31`
  - `src/app/api/admin/media/[id]/preview/route.ts:31`

### High
- Some UI paths only render `media_url` with no `aryeo_url` fallback, so images disappear if `media_url` is null or removed.
  - `src/components/community/ActiveListings.tsx:43`
  - `src/app/team/videographer/job/[id]/page.tsx:316`
- `client_messages` is referenced via `Database['public']['Tables']` but is missing from generated types; this will fail TypeScript builds and risks runtime schema drift.
  - `src/hooks/useClientMessages.ts:8`
  - `src/components/dashboard/OrderMessages.tsx:7`

### Medium
- Storywork uses `stories` and `brand_kits`, while generated types include `storywork_stories` and `storywork_brand_kits`. If the DB uses the prefixed tables, Storywork queries will fail.
  - `src/app/dashboard/storywork/page.tsx:31`
  - `src/app/dashboard/storywork/brand-kit/page.tsx:73`
  - `src/app/api/storywork/generate/route.ts:47`
- `resolveMediaUrl` references `media_url`, `approved_storage_path`, `processed_storage_path`, and `migration_status` fields not present in generated `media_assets` types, and the comment priority order does not match the implementation.
  - `src/lib/storage/resolve-url.ts:33`
  - `src/lib/storage/resolve-url.ts:59`

### Low
- Instagram tables are queried with `as any` and local interfaces, so schema drift will not be caught during builds and could surface at runtime.
  - `src/app/api/admin/social/route.ts:39`
  - `src/app/admin/social/page.tsx:20`

## Open Questions
- Is `media_url` still present in `media_assets` in your DB, or should all queries use `aryeo_url`/`storage_path`?
- Are Storywork tables named `stories`/`brand_kits`, or `storywork_stories`/`storywork_brand_kits`?
- Should we regenerate Supabase types or extend `src/lib/supabase/types-custom.ts` to include `client_messages`, `instagram_connections`, and Storywork tables?

## Recommended Next Steps
1. Confirm DB schema for `media_assets` and Storywork tables; align queries to the actual column/table names.
2. Regenerate Supabase types or add custom table typings to eliminate TypeScript/type drift.
3. Update UI rendering paths to always fall back to `aryeo_url` when `media_url` is missing.

