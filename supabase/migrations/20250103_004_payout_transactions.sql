-- Create infrastructure for atomic payout processing
-- Migration: 20250103_004_payout_transactions.sql

-- Create payout_idempotency table to prevent duplicate payouts
CREATE TABLE IF NOT EXISTS payout_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Index for querying by order_id
CREATE INDEX IF NOT EXISTS idx_payout_idempotency_order_id
ON payout_idempotency(order_id);

-- Index for querying incomplete payouts
CREATE INDEX IF NOT EXISTS idx_payout_idempotency_status
ON payout_idempotency(status, created_at);

-- Enable RLS
ALTER TABLE payout_idempotency ENABLE ROW LEVEL SECURITY;

-- Only staff and service role can access idempotency records
CREATE POLICY "Staff can view payout idempotency"
ON payout_idempotency
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.user_id = auth.uid()
    AND staff.role IN ('admin', 'qc')
  )
);

CREATE POLICY "Service role full access to payout idempotency"
ON payout_idempotency
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to acquire payout lock
CREATE OR REPLACE FUNCTION acquire_payout_lock(
  p_idempotency_key TEXT,
  p_order_id UUID
)
RETURNS TABLE (
  acquired BOOLEAN,
  existing_status TEXT
) AS $$
DECLARE
  v_existing_status TEXT;
BEGIN
  -- Check for existing idempotency record
  SELECT status INTO v_existing_status
  FROM payout_idempotency
  WHERE idempotency_key = p_idempotency_key;

  IF v_existing_status IS NOT NULL THEN
    -- Lock already exists
    RETURN QUERY SELECT false, v_existing_status;
  ELSE
    -- Create new lock
    INSERT INTO payout_idempotency (idempotency_key, order_id, status)
    VALUES (p_idempotency_key, p_order_id, 'processing');

    RETURN QUERY SELECT true, 'processing'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete job payouts atomically
CREATE OR REPLACE FUNCTION complete_job_payouts(
  p_idempotency_key TEXT,
  p_order_id UUID,
  p_staff_payouts JSONB,
  p_partner_payouts JSONB,
  p_company_pool JSONB
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_staff_payout JSONB;
  v_partner_payout JSONB;
  v_pool_allocation JSONB;
  v_idempotency_status TEXT;
BEGIN
  -- Check idempotency
  SELECT status INTO v_idempotency_status
  FROM payout_idempotency
  WHERE idempotency_key = p_idempotency_key;

  IF v_idempotency_status IS NULL THEN
    RETURN QUERY SELECT false, 'Idempotency key not found. Call acquire_payout_lock first.'::TEXT;
    RETURN;
  END IF;

  IF v_idempotency_status = 'completed' THEN
    RETURN QUERY SELECT true, 'Payouts already completed for this idempotency key.'::TEXT;
    RETURN;
  END IF;

  IF v_idempotency_status = 'failed' THEN
    RETURN QUERY SELECT false, 'Payouts previously failed for this idempotency key.'::TEXT;
    RETURN;
  END IF;

  -- Begin transaction
  BEGIN
    -- Insert staff payouts
    IF p_staff_payouts IS NOT NULL THEN
      FOR v_staff_payout IN SELECT * FROM jsonb_array_elements(p_staff_payouts)
      LOOP
        INSERT INTO staff_payouts (
          order_id,
          staff_id,
          amount,
          status,
          stripe_transfer_id,
          role_type
        ) VALUES (
          p_order_id,
          (v_staff_payout->>'staff_id')::UUID,
          (v_staff_payout->>'amount')::DECIMAL,
          COALESCE(v_staff_payout->>'status', 'pending'),
          v_staff_payout->>'stripe_transfer_id',
          v_staff_payout->>'role_type'
        );
      END LOOP;
    END IF;

    -- Insert partner payouts
    IF p_partner_payouts IS NOT NULL THEN
      FOR v_partner_payout IN SELECT * FROM jsonb_array_elements(p_partner_payouts)
      LOOP
        INSERT INTO partner_payouts (
          order_id,
          partner_id,
          amount,
          status,
          stripe_transfer_id
        ) VALUES (
          p_order_id,
          (v_partner_payout->>'partner_id')::UUID,
          (v_partner_payout->>'amount')::DECIMAL,
          COALESCE(v_partner_payout->>'status', 'pending'),
          v_partner_payout->>'stripe_transfer_id'
        );
      END LOOP;
    END IF;

    -- Insert company pool allocations
    IF p_company_pool IS NOT NULL THEN
      FOR v_pool_allocation IN SELECT * FROM jsonb_array_elements(p_company_pool)
      LOOP
        INSERT INTO company_pool (
          amount,
          pool_type,
          allocated_to,
          notes
        ) VALUES (
          (v_pool_allocation->>'amount')::DECIMAL,
          v_pool_allocation->>'pool_type',
          p_order_id,
          v_pool_allocation->>'notes'
        );
      END LOOP;
    END IF;

    -- Update idempotency record
    UPDATE payout_idempotency
    SET
      status = 'completed',
      completed_at = now(),
      result = jsonb_build_object(
        'staff_payouts_count', jsonb_array_length(COALESCE(p_staff_payouts, '[]'::jsonb)),
        'partner_payouts_count', jsonb_array_length(COALESCE(p_partner_payouts, '[]'::jsonb)),
        'company_pool_count', jsonb_array_length(COALESCE(p_company_pool, '[]'::jsonb))
      )
    WHERE idempotency_key = p_idempotency_key;

    RETURN QUERY SELECT true, 'Payouts completed successfully.'::TEXT;

  EXCEPTION WHEN OTHERS THEN
    -- Update idempotency record with failure
    UPDATE payout_idempotency
    SET
      status = 'failed',
      completed_at = now(),
      error = SQLERRM
    WHERE idempotency_key = p_idempotency_key;

    RETURN QUERY SELECT false, ('Payout transaction failed: ' || SQLERRM)::TEXT;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION acquire_payout_lock TO service_role;
GRANT EXECUTE ON FUNCTION complete_job_payouts TO service_role;

COMMENT ON TABLE payout_idempotency IS 'Prevents duplicate payout processing using idempotency keys';
COMMENT ON FUNCTION acquire_payout_lock IS 'Acquires a payout lock to prevent duplicate processing';
COMMENT ON FUNCTION complete_job_payouts IS 'Atomically processes all payouts for a job (staff, partner, company pool)';
