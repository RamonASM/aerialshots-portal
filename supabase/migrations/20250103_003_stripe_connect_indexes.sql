-- Add missing foreign key indexes for Stripe Connect tables
-- Migration: 20250103_003_stripe_connect_indexes.sql

-- Index on company_pool.allocated_to (foreign key to orders.id)
-- Improves JOIN performance when querying pool allocations by order
CREATE INDEX IF NOT EXISTS idx_company_pool_allocated_to
ON company_pool(allocated_to);

-- Index on time_entries.pay_period_id (foreign key to pay_periods.id)
-- Improves JOIN performance when querying time entries by pay period
CREATE INDEX IF NOT EXISTS idx_time_entries_pay_period_id
ON time_entries(pay_period_id);

-- Index on pay_periods.paid_by (foreign key to staff.id)
-- Improves JOIN performance when querying pay periods by staff member
CREATE INDEX IF NOT EXISTS idx_pay_periods_paid_by
ON pay_periods(paid_by);

-- Index on payout_settings.updated_by (foreign key to staff.id)
-- Improves JOIN performance when auditing payout setting changes
CREATE INDEX IF NOT EXISTS idx_payout_settings_updated_by
ON payout_settings(updated_by);

-- Additional composite indexes for common query patterns

-- Index on staff_payouts for filtering by staff and status
CREATE INDEX IF NOT EXISTS idx_staff_payouts_staff_status
ON staff_payouts(staff_id, status);

-- Index on partner_payouts for filtering by partner and status
CREATE INDEX IF NOT EXISTS idx_partner_payouts_partner_status
ON partner_payouts(partner_id, status);

-- Index on time_entries for filtering by staff and date range
CREATE INDEX IF NOT EXISTS idx_time_entries_staff_dates
ON time_entries(staff_id, clock_in_at);

-- Index on company_pool for querying by pool type and date
CREATE INDEX IF NOT EXISTS idx_company_pool_type_created
ON company_pool(pool_type, created_at);
