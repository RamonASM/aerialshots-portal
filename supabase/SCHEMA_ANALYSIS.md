# ASM Portal - Critical Tables Analysis

**Generated:** 2025-12-31
**Purpose:** Identify and consolidate critical tables referenced in code but potentially missing from migrations

## Tables Analyzed

### ✅ FOUND - Tables with complete definitions in migrations:

1. **orders** - `/supabase/migrations/20241224_009_orders.sql`
   - Main booking/payment tracking table
   - Includes status history tracking
   - Full RLS policies implemented

2. **split_payments & payment_portions** - `/supabase/migrations/20241228_004_phase10_advanced_payments.sql`
   - Multi-card payment support
   - Full workflow implemented

3. **invoices** - `/supabase/migrations/20250102_003_api_keys_and_invoices.sql`
   - Direct agent billing (separate from order-based invoices)
   - Complete with RLS policies

4. **invoice_templates & generated_invoices** - `/supabase/migrations/20241228_004_phase10_advanced_payments.sql`
   - PDF invoice customization
   - Order-based invoice generation

5. **api_keys** - `/supabase/migrations/20241224_014_life_here_api.sql`
   - Life Here API access keys
   - Includes key_prefix and requests_this_month columns (added in 20250102_003)

6. **business_settings** - `/supabase/migrations/20241230_001_enterprise_features_phase1.sql`
   - Travel fees, booking cutoffs, weather alerts
   - JSONB-based configuration

7. **weather_forecasts** - `/supabase/migrations/20241230_001_enterprise_features_phase1.sql`
   - Cached weather data
   - Lat/lng indexed for efficient lookups

8. **service_territories & staff_territories** - `/supabase/migrations/20241228_009_team_territories.sql`
   - Geographic service area management
   - Many-to-many staff assignments

9. **processing_jobs** - `/supabase/migrations/20241228_013_founddr_integration.sql`
   - FoundDR HDR processing pipeline
   - Webhook tracking and status management

10. **ai_agents, ai_agent_executions, ai_agent_workflows** - `/supabase/migrations/20241221_004_ai_agents.sql`
    - AI agent registry and orchestration
    - Execution logging and workflow tracking

11. **listing_campaigns & listing_carousels** - `/supabase/migrations/20241211_003_listinglaunch.sql`
    - ListingLaunch marketing campaigns
    - Instagram carousel generation

### ⚠️ CREATED - Tables added to consolidated script:

12. **payment_summaries**
    - Legacy table potentially referenced in older code
    - Simple order payment summary tracking
    - Added for backward compatibility

### ❌ NOT FOUND - Tables in your original list that don't exist:

- **staging_orders** - No references found in migrations
- **staging_order_items** - No references found in migrations
  - *Note:* Virtual staging functionality may use different table structure or be in development

## Migration Files Analyzed

### Core Schema Files:
- `20241210_001_initial_schema.sql` - Base schema
- `20241224_009_orders.sql` - Orders system
- `20241228_004_phase10_advanced_payments.sql` - Advanced payment features
- `20241228_009_team_territories.sql` - Territory management
- `20241228_013_founddr_integration.sql` - HDR processing pipeline
- `20241221_004_ai_agents.sql` - AI agents system
- `20241211_003_listinglaunch.sql` - Marketing campaigns
- `20241230_001_enterprise_features_phase1.sql` - Enterprise features
- `20241224_014_life_here_api.sql` - API keys
- `20250102_003_api_keys_and_invoices.sql` - API keys enhancements & invoices

### Total Migration Files: 51

## Consolidated Script Details

**Location:** `/Users/aerialshotsmedia/Projects/aerialshots-portal/supabase/CONSOLIDATED_SCHEMA.sql`

### Features:
- ✅ **Idempotent** - Safe to run multiple times
- ✅ **CREATE TABLE IF NOT EXISTS** - Won't fail on existing tables
- ✅ **CREATE INDEX IF NOT EXISTS** - Won't duplicate indexes
- ✅ **Conditional RLS policies** - Checks for existing policies before creating
- ✅ **Default data inserts** - Uses ON CONFLICT DO NOTHING

### Tables Included (19 total):
1. orders
2. order_status_history
3. split_payments
4. payment_portions
5. payment_summaries
6. invoices
7. invoice_templates
8. generated_invoices
9. api_keys
10. business_settings
11. weather_forecasts
12. service_territories
13. staff_territories
14. processing_jobs
15. ai_agents
16. ai_agent_executions
17. ai_agent_workflows
18. listing_campaigns
19. listing_carousels

### Security:
- RLS enabled on all tables
- Basic policies for:
  - Agents viewing own data
  - Staff viewing all data
  - Service role full access where needed
  - Public read access for weather data

### Triggers:
- `updated_at` triggers on all tables with that column
- Order status change tracking
- Helper functions included

## Usage Instructions

### Option 1: Supabase Dashboard
1. Go to Supabase Dashboard > SQL Editor
2. Paste contents of `CONSOLIDATED_SCHEMA.sql`
3. Click "Run"

### Option 2: Supabase CLI
```bash
cd /Users/aerialshotsmedia/Projects/aerialshots-portal
supabase db push
```

### Option 3: Direct psql
```bash
psql -h db.your-project.supabase.co -U postgres -d postgres -f supabase/CONSOLIDATED_SCHEMA.sql
```

## Verification Queries

After running the script, verify tables exist:

```sql
-- Check all critical tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'orders', 'invoices', 'api_keys', 'business_settings',
    'weather_forecasts', 'service_territories', 'staff_territories',
    'processing_jobs', 'ai_agents', 'ai_agent_executions',
    'ai_agent_workflows', 'listing_campaigns', 'listing_carousels',
    'payment_summaries'
  )
ORDER BY table_name;
```

Expected result: 14 rows (all tables present)

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'orders', 'invoices', 'api_keys', 'business_settings'
  );
```

Expected: `rowsecurity = true` for all

```sql
-- Check policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Should see multiple policies per table.

## Notes

1. **Virtual Staging**: The `staging_orders` and `staging_order_items` tables were not found in any migrations. Virtual staging functionality may:
   - Be in development
   - Use a different table structure
   - Be handled through media_assets JSONB columns
   - Check `/src/lib/integrations/virtual-staging/` for implementation details

2. **Payment Summaries**: This table was added for compatibility but may not be actively used. Check code references before relying on it.

3. **Foreign Key Dependencies**: The script assumes the following tables already exist:
   - `agents`
   - `listings`
   - `staff`
   - `seller_schedules`
   - `auth.users` (Supabase built-in)

4. **Invoice Number Sequence**: The script does NOT create the `invoice_number_seq` sequence as it's handled in the original migrations.

## Recommended Next Steps

1. ✅ Run the consolidated script in a development environment first
2. ✅ Verify all tables and indexes are created
3. ✅ Test RLS policies with different user roles
4. ✅ Run application smoke tests
5. ✅ Apply to production during low-traffic window
6. ⚠️ Investigate virtual staging table requirements
7. ⚠️ Consider deprecating `payment_summaries` if unused

## Migration History Reference

The consolidated script captures schema from migrations dated:
- **Earliest:** 2024-12-10 (initial schema)
- **Latest:** 2025-01-02 (schema gaps & API keys)

Any migrations after 2025-01-02 should be applied separately.
