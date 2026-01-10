-- Made idempotent: 2026-01-07
-- Atomic Credit Deduction Function
-- This function ensures that credit balance checks and deductions happen atomically
-- to prevent race conditions during reward redemptions.

CREATE OR REPLACE FUNCTION deduct_agent_credits(
  p_agent_id uuid,
  p_credits integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  -- Atomically update balance only if sufficient credits exist
  UPDATE agents
  SET credit_balance = credit_balance - p_credits
  WHERE id = p_agent_id
    AND credit_balance >= p_credits
  RETURNING credit_balance INTO v_new_balance;

  -- If no rows were updated, either agent not found or insufficient balance
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits or agent not found';
  END IF;

  RETURN v_new_balance;
END;
$$;

-- Grant execute permission to authenticated users (via service role)
GRANT EXECUTE ON FUNCTION deduct_agent_credits(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_agent_credits(uuid, integer) TO service_role;
