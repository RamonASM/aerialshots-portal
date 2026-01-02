# TypeScript Audit Report

Command: `./node_modules/.bin/tsc --noEmit --incremental false --pretty false`

Total errors: 991
Files with errors: 133
Errors in test files (filename contains `.test.`): 164

## Errors By Top-Level Path

| Path | Errors |
| --- | ---: |
| src/app | 549 |
| src/lib | 375 |
| src/components | 49 |
| src/test | 13 |
| src/hooks | 3 |
| src/stores | 2 |

## Top Files By Error Count

| File | Errors |
| --- | ---: |
| `src/app/community/[slug]/page.tsx` | 47 |
| `src/lib/time-tracking/service.ts` | 46 |
| `src/app/api/share-links/[token]/route.ts` | 35 |
| `src/app/api/seller/[token]/deliverables/route.ts` | 33 |
| `src/lib/skills/execution-service.test.ts` | 31 |
| `src/app/team/editor/job/[id]/page.tsx` | 29 |
| `src/lib/payments/payout-processor.ts` | 27 |
| `src/app/portal/[shareToken]/page.tsx` | 26 |
| `src/app/api/seller/[token]/reschedule/route.ts` | 25 |
| `src/app/schedule/[token]/page.tsx` | 25 |
| `src/app/api/team/routes/route.ts` | 24 |
| `src/lib/skills/image/image.test.ts` | 21 |
| `src/app/api/seller/[token]/schedule/route.ts` | 20 |
| `src/app/api/seller-schedules/route.ts` | 19 |
| `src/lib/storage/resolve-url.test.ts` | 19 |
| `src/app/client/media/page.tsx` | 18 |
| `src/lib/scheduling/skill-match.ts` | 18 |
| `src/app/api/seller/[token]/route.ts` | 17 |
| `src/lib/skills/content/content.test.ts` | 17 |
| `src/lib/skills/render/render.test.ts` | 17 |
| `src/components/community/CommunityJsonLd.tsx` | 16 |
| `src/app/team/editor/page.tsx` | 13 |
| `src/lib/agents/workflows/post-delivery.test.ts` | 13 |
| `src/app/api/webhooks/cubicasa/route.ts` | 12 |
| `src/app/dashboard/storywork/page.tsx` | 12 |

## Top Error Codes

| Code | Count | Notes |
| --- | ---: | --- |
| TS2339 | 510 | Property does not exist on type |
| TS2769 | 155 | No overload matches this call |
| TS2322 | 88 | Type is not assignable to type |
| TS2353 | 62 | Object literal may only specify known properties |
| TS7006 | 46 | Parameter implicitly has an any type |
| TS2345 | 29 | Argument of type is not assignable to parameter type |
| TS18046 | 26 | Value is of type unknown |
| TS2305 | 25 | Module has no exported member |
| TS2540 | 12 |  |
| TS2589 | 10 | Type instantiation is excessively deep |
| TS18047 | 9 | Possibly null/undefined value |
| TS2352 | 4 |  |
| TS2722 | 3 |  |
| TS18048 | 3 |  |
| TS2551 | 3 |  |

## Unrecognized Supabase Relation Names
These appear in `from(...)` calls but are not present in the generated Supabase types.

| Relation | Count |
| --- | ---: |
| `share_links` | 46 |
| `photographer_assignments` | 24 |
| `time_entries` | 24 |
| `seller_schedules` | 16 |
| `reschedule_requests` | 12 |
| `marketing_campaigns` | 12 |
| `stories` | 10 |
| `zapier_webhooks` | 10 |
| `delivery_notifications` | 10 |
| `pay_periods` | 10 |
| `staff_payouts` | 8 |
| `partner_payouts` | 8 |
| `brand_kits` | 8 |
| `portal_settings` | 6 |
| `portal_activity_log` | 6 |
| `communities` | 6 |
| `zapier_webhook_logs` | 6 |
| `seller_access_controls` | 4 |
| `daily_routes` | 4 |
| `route_stops` | 4 |
| `partners` | 4 |
| `instagram_connections` | 4 |
| `client_messages` | 4 |
| `drive_time_cache` | 4 |
| `clients` | 2 |

## Missing Properties (Top 25)
Properties referenced in code but not present on the inferred types.

| Property | Count |
| --- | ---: |
| `id` | 95 |
| `listing_id` | 38 |
| `expires_at` | 35 |
| `status` | 32 |
| `listing` | 26 |
| `name` | 26 |
| `media_url` | 19 |
| `is_active` | 18 |
| `type` | 13 |
| `agent` | 12 |
| `created_at` | 10 |
| `client_name` | 9 |
| `stripe_transfer_id` | 8 |
| `duration_minutes` | 8 |
| `total_pay_cents` | 8 |
| `client_email` | 7 |
| `ops_status` | 7 |
| `link_type` | 6 |
| `media_access_enabled` | 6 |
| `agent_id` | 6 |
| `share_token` | 6 |
| `story_type` | 6 |
| `team_role` | 6 |
| `photographer_id` | 6 |
| `hourly_rate` | 6 |

## Full Error Output
The complete TypeScript error list is in `TSC_AUDIT_ERRORS.txt`.
