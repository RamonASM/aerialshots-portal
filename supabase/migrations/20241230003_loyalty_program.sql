-- Made idempotent: 2026-01-07
-- Enhanced Loyalty Program
-- Points, punch cards, and tier-based rewards

-- Loyalty Tiers
CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  min_points INTEGER NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
  perks JSONB DEFAULT '[]',
  badge_color TEXT DEFAULT '#0077ff',
  badge_icon TEXT DEFAULT 'star',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default tiers
INSERT INTO loyalty_tiers (name, slug, min_points, discount_percent, perks, badge_color, display_order) VALUES
  ('Bronze', 'bronze', 0, 0, '["Priority support"]', '#cd7f32', 1),
  ('Silver', 'silver', 1000, 5, '["Priority support", "Early access to new features"]', '#c0c0c0', 2),
  ('Gold', 'gold', 5000, 10, '["Priority support", "Early access", "Free rush delivery"]', '#ffd700', 3),
  ('Platinum', 'platinum', 15000, 15, '["Priority support", "Early access", "Free rush delivery", "Dedicated account manager"]', '#e5e4e2', 4),
  ('Diamond', 'diamond', 50000, 20, '["All perks", "Custom pricing", "White glove service"]', '#b9f2ff', 5)
ON CONFLICT (slug) DO NOTHING;

-- Loyalty Points Transactions
CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Transaction Details
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired', 'bonus', 'adjustment')),

  -- Source Info
  source TEXT NOT NULL, -- 'order', 'referral', 'review', 'bonus', 'admin'
  source_id UUID, -- Reference to order, etc.

  -- Description
  description TEXT,

  -- Expiration
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Punch Cards
CREATE TABLE IF NOT EXISTS punch_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Card Config
  card_type TEXT NOT NULL DEFAULT 'shoots', -- 'shoots', 'matterport', 'drone', etc.
  punches_required INTEGER NOT NULL DEFAULT 10,
  punches_earned INTEGER NOT NULL DEFAULT 0,

  -- Reward
  reward_type TEXT NOT NULL DEFAULT 'free_service', -- 'free_service', 'discount', 'credit'
  reward_value TEXT, -- Service name or discount amount
  reward_used BOOLEAN DEFAULT false,
  reward_used_at TIMESTAMPTZ,
  reward_order_id UUID,

  -- Status
  is_complete BOOLEAN GENERATED ALWAYS AS (punches_earned >= punches_required) STORED,
  completed_at TIMESTAMPTZ,

  -- Expiration
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Punch Card Punches (History)
CREATE TABLE IF NOT EXISTS punch_card_punches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  punch_card_id UUID NOT NULL REFERENCES punch_cards(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent loyalty summary view
CREATE OR REPLACE VIEW agent_loyalty_summary AS
SELECT
  a.id AS agent_id,
  a.name AS agent_name,
  a.email AS agent_email,
  COALESCE(SUM(CASE WHEN lp.type = 'earned' AND NOT lp.is_expired THEN lp.points ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN lp.type = 'redeemed' THEN lp.points ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN lp.type = 'expired' THEN lp.points ELSE 0 END), 0) AS current_points,
  COALESCE(SUM(CASE WHEN lp.type = 'earned' THEN lp.points ELSE 0 END), 0) AS lifetime_points,
  (
    SELECT lt.name
    FROM loyalty_tiers lt
    WHERE lt.is_active = true
      AND lt.min_points <= (
        COALESCE(SUM(CASE WHEN lp.type = 'earned' THEN lp.points ELSE 0 END), 0)
      )
    ORDER BY lt.min_points DESC
    LIMIT 1
  ) AS current_tier,
  (
    SELECT COUNT(*) FROM punch_cards pc WHERE pc.agent_id = a.id AND pc.is_complete = true AND NOT pc.reward_used
  ) AS available_rewards,
  (
    SELECT COUNT(*) FROM punch_cards pc WHERE pc.agent_id = a.id AND NOT pc.is_complete AND NOT pc.is_expired
  ) AS active_punch_cards
FROM agents a
LEFT JOIN loyalty_points lp ON lp.agent_id = a.id
GROUP BY a.id, a.name, a.email;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_points_agent ON loyalty_points(agent_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_type ON loyalty_points(type);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_source ON loyalty_points(source, source_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_expires ON loyalty_points(expires_at) WHERE NOT is_expired;
CREATE INDEX IF NOT EXISTS idx_punch_cards_agent ON punch_cards(agent_id);
CREATE INDEX IF NOT EXISTS idx_punch_cards_complete ON punch_cards(is_complete) WHERE NOT reward_used;
CREATE INDEX IF NOT EXISTS idx_punch_card_punches_card ON punch_card_punches(punch_card_id);

-- RLS
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE punch_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE punch_card_punches ENABLE ROW LEVEL SECURITY;

-- Tiers are readable by anyone
DROP POLICY IF EXISTS "Loyalty tiers are public" ON loyalty_tiers;
CREATE POLICY "Loyalty tiers are public" ON loyalty_tiers FOR SELECT
  USING (true);

-- Agents can view their own points
DROP POLICY IF EXISTS "Agents can view their loyalty points" ON loyalty_points;
CREATE POLICY "Agents can view their loyalty points" ON loyalty_points FOR SELECT
  USING (agent_id = auth.uid());

-- Staff can view all points
DROP POLICY IF EXISTS "Staff can view all loyalty points" ON loyalty_points;
CREATE POLICY "Staff can view all loyalty points" ON loyalty_points FOR SELECT
  USING (auth.email() LIKE '%@aerialshots.media');

-- Staff can manage points
DROP POLICY IF EXISTS "Staff can manage loyalty points" ON loyalty_points;
CREATE POLICY "Staff can manage loyalty points" ON loyalty_points FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media')
  WITH CHECK (auth.email() LIKE '%@aerialshots.media');

-- Agents can view their own punch cards
DROP POLICY IF EXISTS "Agents can view their punch cards" ON punch_cards;
CREATE POLICY "Agents can view their punch cards" ON punch_cards FOR SELECT
  USING (agent_id = auth.uid());

-- Staff can manage punch cards
DROP POLICY IF EXISTS "Staff can manage punch cards" ON punch_cards;
CREATE POLICY "Staff can manage punch cards" ON punch_cards FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media')
  WITH CHECK (auth.email() LIKE '%@aerialshots.media');

-- Punch card punches follow card access
DROP POLICY IF EXISTS "Punch card punches follow card access" ON punch_card_punches;
CREATE POLICY "Punch card punches follow card access" ON punch_card_punches FOR SELECT
  USING (
    punch_card_id IN (SELECT id FROM punch_cards WHERE agent_id = auth.uid())
    OR auth.email() LIKE '%@aerialshots.media'
  );

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_punch_cards_timestamp ON punch_cards;
CREATE TRIGGER update_punch_cards_timestamp
  BEFORE UPDATE ON punch_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_open_house_timestamp();

-- Function to award points for an order
CREATE OR REPLACE FUNCTION award_loyalty_points(
  p_agent_id UUID,
  p_order_id UUID,
  p_order_total DECIMAL,
  p_points_per_dollar DECIMAL DEFAULT 1.0
)
RETURNS INTEGER AS $$
DECLARE
  v_points INTEGER;
BEGIN
  v_points := FLOOR(p_order_total * p_points_per_dollar);

  IF v_points > 0 THEN
    INSERT INTO loyalty_points (agent_id, points, type, source, source_id, description, expires_at)
    VALUES (
      p_agent_id,
      v_points,
      'earned',
      'order',
      p_order_id,
      'Points earned from order',
      NOW() + INTERVAL '1 year'
    );
  END IF;

  RETURN v_points;
END;
$$ LANGUAGE plpgsql;

-- Function to add a punch to a card
CREATE OR REPLACE FUNCTION add_punch_to_card(
  p_agent_id UUID,
  p_card_type TEXT,
  p_order_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_card_id UUID;
BEGIN
  -- Find or create active punch card
  SELECT id INTO v_card_id
  FROM punch_cards
  WHERE agent_id = p_agent_id
    AND card_type = p_card_type
    AND NOT is_complete
    AND NOT is_expired
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_card_id IS NULL THEN
    -- Create new punch card
    INSERT INTO punch_cards (agent_id, card_type, punches_required, reward_type, reward_value)
    VALUES (p_agent_id, p_card_type, 10, 'free_service', p_card_type)
    RETURNING id INTO v_card_id;
  END IF;

  -- Add punch
  INSERT INTO punch_card_punches (punch_card_id, order_id, description)
  VALUES (v_card_id, p_order_id, 'Punch from order');

  -- Update punch count
  UPDATE punch_cards
  SET punches_earned = punches_earned + 1,
      completed_at = CASE WHEN punches_earned + 1 >= punches_required THEN NOW() ELSE NULL END
  WHERE id = v_card_id;

  RETURN v_card_id;
END;
$$ LANGUAGE plpgsql;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE loyalty_points;
ALTER PUBLICATION supabase_realtime ADD TABLE punch_cards;
