-- Storywork and Unified Credits Schema
-- Version: 1.0.0
-- Date: 2024-12-10

-- =====================
-- STORYWORK USERS (Clerk authentication)
-- =====================
CREATE TABLE storywork_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  credit_balance INTEGER DEFAULT 0 CHECK (credit_balance >= 0),
  lifetime_credits INTEGER DEFAULT 0,
  asm_agent_id UUID REFERENCES agents(id), -- Link to ASM Portal agent
  stripe_customer_id TEXT UNIQUE,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
  subscription_tier TEXT CHECK (subscription_tier IN ('starter', 'pro', 'team', 'media_partner')),
  subscription_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_storywork_users_clerk_id ON storywork_users(clerk_id);
CREATE INDEX idx_storywork_users_email ON storywork_users(email);
CREATE INDEX idx_storywork_users_asm_agent_id ON storywork_users(asm_agent_id);

CREATE TRIGGER storywork_users_updated_at
  BEFORE UPDATE ON storywork_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- STORYWORK BRAND KITS
-- =====================
CREATE TABLE storywork_brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES storywork_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Brand',
  primary_color TEXT DEFAULT '#ff4533',
  secondary_color TEXT DEFAULT '#000000',
  font_family TEXT DEFAULT 'Inter',
  logo_url TEXT,
  headshot_url TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_storywork_brand_kits_user_id ON storywork_brand_kits(user_id);

CREATE TRIGGER storywork_brand_kits_updated_at
  BEFORE UPDATE ON storywork_brand_kits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- STORYWORK STORIES
-- =====================
CREATE TABLE storywork_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES storywork_users(id) ON DELETE CASCADE,
  brand_kit_id UUID REFERENCES storywork_brand_kits(id),

  -- Story input
  title TEXT,
  story_type TEXT NOT NULL CHECK (story_type IN ('against_the_odds', 'fresh_drop', 'behind_the_deal')),
  raw_input TEXT,
  voice_recording_url TEXT,
  transcription TEXT,
  answers JSONB DEFAULT '{}',

  -- Generated content
  generated_content JSONB, -- slides, hashtags, caption

  -- Carousel
  carousel_template TEXT,
  carousel_images JSONB, -- Array of image URLs from Bannerbear
  bannerbear_render_id TEXT,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed', 'failed')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_storywork_stories_user_id ON storywork_stories(user_id);
CREATE INDEX idx_storywork_stories_status ON storywork_stories(status);
CREATE INDEX idx_storywork_stories_created_at ON storywork_stories(created_at);

CREATE TRIGGER storywork_stories_updated_at
  BEFORE UPDATE ON storywork_stories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- STORYWORK CREDIT TRANSACTIONS
-- =====================
CREATE TABLE storywork_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES storywork_users(id),
  amount INTEGER NOT NULL, -- positive = earn, negative = spend
  type TEXT NOT NULL CHECK (type IN (
    'storywork_basic_story', 'storywork_voice_story', 'storywork_carousel',
    'subscription_monthly', 'subscription_bonus', 'adjustment', 'refund'
  )),
  description TEXT,
  source TEXT CHECK (source IN ('storywork_credits', 'asm_credits', 'subscription', 'admin')),
  story_id UUID REFERENCES storywork_stories(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_storywork_credit_txns_user_id ON storywork_credit_transactions(user_id);
CREATE INDEX idx_storywork_credit_txns_created_at ON storywork_credit_transactions(created_at);

-- =====================
-- UNIFIED USERS (Cross-platform identity)
-- =====================
CREATE TABLE unified_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,

  -- Platform links
  asm_user_id UUID, -- Supabase Auth user ID (for ASM Portal)
  asm_agent_id UUID REFERENCES agents(id),
  storywork_user_id UUID REFERENCES storywork_users(id),
  storywork_clerk_id TEXT,

  -- Unified credits
  credit_balance INTEGER DEFAULT 0 CHECK (credit_balance >= 0),
  lifetime_credits INTEGER DEFAULT 0,

  -- Metadata
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_unified_users_email ON unified_users(email);
CREATE INDEX idx_unified_users_asm_agent_id ON unified_users(asm_agent_id);
CREATE INDEX idx_unified_users_storywork_user_id ON unified_users(storywork_user_id);

CREATE TRIGGER unified_users_updated_at
  BEFORE UPDATE ON unified_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- UNIFIED CREDIT TRANSACTIONS (Cross-platform ledger)
-- =====================
CREATE TABLE unified_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unified_user_id UUID NOT NULL REFERENCES unified_users(id),
  amount INTEGER NOT NULL, -- positive = earn, negative = spend
  running_balance INTEGER NOT NULL,

  -- Transaction details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    -- Earning types (ASM Portal)
    'referral_photo', 'referral_video', 'referral_premium',
    'milestone_5', 'milestone_10', 'milestone_25', 'milestone_50',
    -- Spending types (ASM Portal)
    'asm_ai_tool', 'asm_discount', 'asm_free_service',
    -- Spending types (Storywork)
    'storywork_basic_story', 'storywork_voice_story', 'storywork_carousel',
    -- Subscription types
    'subscription_credit', 'subscription_bonus',
    -- Admin types
    'adjustment', 'expiry', 'refund', 'migration'
  )),

  source_platform TEXT NOT NULL CHECK (source_platform IN ('asm_portal', 'storywork', 'system')),
  description TEXT,

  -- Idempotency
  idempotency_key TEXT UNIQUE,

  -- References
  reference_id TEXT, -- External reference (story ID, tool usage ID, etc.)
  reference_type TEXT, -- 'story', 'ai_tool', 'referral', etc.

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_unified_credit_txns_user_id ON unified_credit_transactions(unified_user_id);
CREATE INDEX idx_unified_credit_txns_type ON unified_credit_transactions(transaction_type);
CREATE INDEX idx_unified_credit_txns_created_at ON unified_credit_transactions(created_at);
CREATE INDEX idx_unified_credit_txns_idempotency ON unified_credit_transactions(idempotency_key);

-- =====================
-- CREDIT RESERVATIONS (Two-phase commit)
-- =====================
CREATE TABLE credit_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unified_user_id UUID NOT NULL REFERENCES unified_users(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  purpose TEXT NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'committed', 'released', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),

  -- References
  reference_id TEXT,
  reference_type TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  committed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ
);

CREATE INDEX idx_credit_reservations_user_id ON credit_reservations(unified_user_id);
CREATE INDEX idx_credit_reservations_status ON credit_reservations(status);
CREATE INDEX idx_credit_reservations_expires_at ON credit_reservations(expires_at);

-- =====================
-- ATOMIC CREDIT FUNCTIONS
-- =====================

-- Reserve credits (optimistic locking)
CREATE OR REPLACE FUNCTION reserve_credits(
  p_unified_user_id UUID,
  p_amount INTEGER,
  p_purpose TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, reservation_id UUID, error TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_balance INTEGER;
  v_reserved_total INTEGER;
  v_available INTEGER;
  v_reservation_id UUID;
BEGIN
  -- Lock the user row
  SELECT credit_balance INTO v_current_balance
  FROM unified_users
  WHERE id = p_unified_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'User not found'::TEXT;
    RETURN;
  END IF;

  -- Calculate reserved amount
  SELECT COALESCE(SUM(amount), 0) INTO v_reserved_total
  FROM credit_reservations
  WHERE unified_user_id = p_unified_user_id
    AND status = 'pending'
    AND expires_at > NOW();

  v_available := v_current_balance - v_reserved_total;

  IF v_available < p_amount THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Insufficient credits'::TEXT;
    RETURN;
  END IF;

  -- Create reservation
  INSERT INTO credit_reservations (
    unified_user_id, amount, purpose, reference_id, reference_type
  )
  VALUES (
    p_unified_user_id, p_amount, p_purpose, p_reference_id, p_reference_type
  )
  RETURNING id INTO v_reservation_id;

  RETURN QUERY SELECT TRUE, v_reservation_id, NULL::TEXT;
END;
$$;

-- Commit a reservation (deduct credits)
CREATE OR REPLACE FUNCTION commit_reservation(
  p_reservation_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_reservation RECORD;
  v_new_balance INTEGER;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM unified_credit_transactions
      WHERE idempotency_key = p_idempotency_key
    ) THEN
      SELECT credit_balance INTO v_new_balance
      FROM unified_users u
      JOIN credit_reservations r ON r.unified_user_id = u.id
      WHERE r.id = p_reservation_id;
      RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Lock and get reservation
  SELECT r.*, u.credit_balance
  INTO v_reservation
  FROM credit_reservations r
  JOIN unified_users u ON u.id = r.unified_user_id
  WHERE r.id = p_reservation_id
  FOR UPDATE OF r, u;

  IF v_reservation IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Reservation not found'::TEXT;
    RETURN;
  END IF;

  IF v_reservation.status != 'pending' THEN
    RETURN QUERY SELECT FALSE, 0, 'Reservation already processed'::TEXT;
    RETURN;
  END IF;

  IF v_reservation.expires_at < NOW() THEN
    UPDATE credit_reservations SET status = 'expired' WHERE id = p_reservation_id;
    RETURN QUERY SELECT FALSE, 0, 'Reservation expired'::TEXT;
    RETURN;
  END IF;

  -- Deduct credits
  v_new_balance := v_reservation.credit_balance - v_reservation.amount;

  UPDATE unified_users
  SET credit_balance = v_new_balance, updated_at = NOW()
  WHERE id = v_reservation.unified_user_id;

  -- Mark reservation as committed
  UPDATE credit_reservations
  SET status = 'committed', committed_at = NOW()
  WHERE id = p_reservation_id;

  -- Log transaction
  INSERT INTO unified_credit_transactions (
    unified_user_id, amount, running_balance, transaction_type,
    source_platform, description, idempotency_key, reference_id, reference_type
  )
  VALUES (
    v_reservation.unified_user_id,
    -v_reservation.amount,
    v_new_balance,
    'storywork_carousel', -- Default, should be passed
    'storywork',
    v_reservation.purpose,
    p_idempotency_key,
    v_reservation.reference_id,
    v_reservation.reference_type
  );

  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$;

-- Release a reservation (cancel)
CREATE OR REPLACE FUNCTION release_reservation(p_reservation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE credit_reservations
  SET status = 'released', released_at = NOW()
  WHERE id = p_reservation_id
    AND status = 'pending';
  RETURN FOUND;
END;
$$;

-- Direct spend (without reservation)
CREATE OR REPLACE FUNCTION spend_unified_credits(
  p_unified_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_source_platform TEXT,
  p_description TEXT,
  p_idempotency_key TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_balance INTEGER;
  v_reserved_total INTEGER;
  v_available INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM unified_credit_transactions
      WHERE idempotency_key = p_idempotency_key
    ) THEN
      SELECT credit_balance INTO v_new_balance
      FROM unified_users
      WHERE id = p_unified_user_id;
      RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Lock the user row
  SELECT credit_balance INTO v_current_balance
  FROM unified_users
  WHERE id = p_unified_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'User not found'::TEXT;
    RETURN;
  END IF;

  -- Calculate reserved amount
  SELECT COALESCE(SUM(amount), 0) INTO v_reserved_total
  FROM credit_reservations
  WHERE unified_user_id = p_unified_user_id
    AND status = 'pending'
    AND expires_at > NOW();

  v_available := v_current_balance - v_reserved_total;

  IF v_available < p_amount THEN
    RETURN QUERY SELECT FALSE, v_current_balance, 'Insufficient credits'::TEXT;
    RETURN;
  END IF;

  -- Deduct credits
  v_new_balance := v_current_balance - p_amount;

  UPDATE unified_users
  SET credit_balance = v_new_balance, updated_at = NOW()
  WHERE id = p_unified_user_id;

  -- Log transaction
  INSERT INTO unified_credit_transactions (
    unified_user_id, amount, running_balance, transaction_type,
    source_platform, description, idempotency_key, reference_id, reference_type
  )
  VALUES (
    p_unified_user_id,
    -p_amount,
    v_new_balance,
    p_transaction_type,
    p_source_platform,
    p_description,
    p_idempotency_key,
    p_reference_id,
    p_reference_type
  );

  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$;

-- Earn credits
CREATE OR REPLACE FUNCTION earn_unified_credits(
  p_unified_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_source_platform TEXT,
  p_description TEXT,
  p_idempotency_key TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM unified_credit_transactions
      WHERE idempotency_key = p_idempotency_key
    ) THEN
      SELECT credit_balance INTO v_new_balance
      FROM unified_users
      WHERE id = p_unified_user_id;
      RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Lock and get user
  SELECT credit_balance INTO v_current_balance
  FROM unified_users
  WHERE id = p_unified_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'User not found'::TEXT;
    RETURN;
  END IF;

  -- Add credits
  v_new_balance := v_current_balance + p_amount;

  UPDATE unified_users
  SET
    credit_balance = v_new_balance,
    lifetime_credits = lifetime_credits + p_amount,
    updated_at = NOW()
  WHERE id = p_unified_user_id;

  -- Log transaction
  INSERT INTO unified_credit_transactions (
    unified_user_id, amount, running_balance, transaction_type,
    source_platform, description, idempotency_key, reference_id, reference_type
  )
  VALUES (
    p_unified_user_id,
    p_amount,
    v_new_balance,
    p_transaction_type,
    p_source_platform,
    p_description,
    p_idempotency_key,
    p_reference_id,
    p_reference_type
  );

  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$;

-- Get or create unified user
CREATE OR REPLACE FUNCTION get_or_create_unified_user(
  p_email TEXT,
  p_asm_agent_id UUID DEFAULT NULL,
  p_storywork_user_id UUID DEFAULT NULL,
  p_storywork_clerk_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Try to find existing user
  SELECT id INTO v_user_id
  FROM unified_users
  WHERE email = p_email;

  IF v_user_id IS NULL THEN
    -- Create new user
    INSERT INTO unified_users (
      email, asm_agent_id, storywork_user_id, storywork_clerk_id
    )
    VALUES (
      p_email, p_asm_agent_id, p_storywork_user_id, p_storywork_clerk_id
    )
    RETURNING id INTO v_user_id;
  ELSE
    -- Update links if provided
    UPDATE unified_users
    SET
      asm_agent_id = COALESCE(p_asm_agent_id, asm_agent_id),
      storywork_user_id = COALESCE(p_storywork_user_id, storywork_user_id),
      storywork_clerk_id = COALESCE(p_storywork_clerk_id, storywork_clerk_id),
      last_activity_at = NOW()
    WHERE id = v_user_id;
  END IF;

  RETURN v_user_id;
END;
$$;

-- =====================
-- SCHEDULED JOBS (Cleanup expired reservations)
-- =====================

-- Function to clean up expired reservations
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE credit_reservations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE storywork_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE storywork_brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE storywork_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE storywork_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_reservations ENABLE ROW LEVEL SECURITY;

-- Storywork users: accessible via service role only (Clerk auth handled server-side)
CREATE POLICY "Service role access for storywork_users" ON storywork_users
  FOR ALL USING (true);

CREATE POLICY "Service role access for storywork_brand_kits" ON storywork_brand_kits
  FOR ALL USING (true);

CREATE POLICY "Service role access for storywork_stories" ON storywork_stories
  FOR ALL USING (true);

CREATE POLICY "Service role access for storywork_credit_transactions" ON storywork_credit_transactions
  FOR ALL USING (true);

CREATE POLICY "Service role access for unified_users" ON unified_users
  FOR ALL USING (true);

CREATE POLICY "Service role access for unified_credit_transactions" ON unified_credit_transactions
  FOR ALL USING (true);

CREATE POLICY "Service role access for credit_reservations" ON credit_reservations
  FOR ALL USING (true);
