# ASM Portal Audit (2026-01-10)

## Summary
- Documented the dual-auth updates, RLS/storage hardening, and admin/portal access fixes completed in the latest phase.
- Highlighted unresolved infra tasks (Stripe à la carte products, env vars, RunPod webhook secrets) so they stay on Claude’s radar.
- Created a status checklist so the next audit can easily pick up where this one leaves off.

## Recent Changes
1. **Authentication & Portals**
   - Added `syncAuthUserRecords` to `/api/auth/callback` and everywhere the code determines redirection so every login now ensures `auth_user_id` is present for staff, partners, agents, and clients.
   - `middleware.ts` accepts Supabase cookies without Clerk, route guards treat partners as staff, and the login pages now send the portal type to the magic-link endpoint for accurate redirection.
2. **API Access**
   - Swapped dozens of server routes from `staff.user_id` to `auth_user_id`, and critical endpoints (orders, render APIs, share links) now call `createAdminClient` so service-role keys bypass RLS.
   - `requireStaff` middleware and admin layout now handle partners, preventing multiple unauthorized redirects.
3. **Database Security**
   - Applied `20260105_001_security_definer_hardening.sql`: every SECURITY DEFINER function now sets search path and grants execution only to `service_role`.
   - Added `20260106_002_rls_and_storage_hardening.sql`: removed legacy `user_id` policies, refreshed RLS for ~30 tables, and tightened storage bucket policies (staff/service-role writes, public reads).

## Outstanding Issues
| Item | Status |
|---|---|
| Stripe à la carte products (photography add-ons, video, virtual staging) | ✅ Not created in sandbox yet |
| TypeScript errors in `test/` (~167 errors) | ⚠️ Still present; not blocking builds |
| Environment vars required by new flows (`STRIPE_CONNECT_WEBHOOK_SECRET`, `CLERK_WEBHOOK_SECRET`, `GOOGLE_AI_API_KEY`, `RUNPOD_ENDPOINT_ID`, `RUNPOD_API_KEY`) | ⚠️ Not all set in Vercel/Supabase |
| Webhooks registered? | ⚠️ Needs verification in Stripe/Clerk dashboards |
| Storage policies for `agent-assets` bucket | ⚠️ Missing; uploads will fail with current RLS |
| `auth_user_id` population | ⚠️ Run `sync_staff_auth_user_ids`/`sync_agent_auth_user_ids` post-migration |
| RunPod-based HDR processing | ⚠️ Disabled until env vars exist |
| Agent/Admin login failure (`Digest 701318681`) | ⚠️ Need Vercel logs; likely env or migration-related |

## Recommendations
1. **Apply new migrations + post-sync**: run `npx supabase db push`, then execute the existing `sync_*_auth_user_ids` helpers to populate `auth_user_id` before re-enabling steady traffic.
2. **Set missing secrets**: add the Clerk/Stripe webhook secrets plus RunPod/Google AI keys in Vercel and Supabase before re-running the login flows or HDR jobs.
3. **Storage policy for `agent-assets`**: extend `20260106_002_rls_and_storage_hardening.sql` with a staff-only policy for that bucket (or access via service-role) so headshot/logo uploads remain functional.
4. **Record/check logs**: inspect the Vercel deployment logs for `Digest: 701318681` and Supabase logs while hitting the portals to identify the precise stack trace.
5. **Audit outstanding tasks**: after the above, re-open this report to confirm the Stripe à la carte catalog exists, the TypeScript errors are resolved, and the TypeScript suite passes CI.

## Next Audit Trigger
- Run a fresh audit after:
  1. All env vars/webhooks are configured and proven working in Vercel/Supabase.
  2. `agent-assets` storage policy has been added and tested.
  3. `auth_user_id` sync job is run.
  4. The portal login issue (digest 701318681) is resolved or logs are available for analysis.
