-- Made idempotent: 2026-01-07
-- Phase 10: Advanced Payments (276 votes)
-- 10.1 Split Payments (142 votes)
-- 10.2 PDF Invoice Customization (134 votes)

-- ============================================
-- SPLIT PAYMENTS TABLE
-- Tracks multi-card/multi-source payments
-- ============================================

CREATE TABLE IF NOT EXISTS split_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Payment split configuration
  split_type TEXT NOT NULL DEFAULT 'even', -- 'even', 'custom', 'percentage'
  total_amount_cents INTEGER NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, partial, completed, failed

  -- Metadata
  created_by UUID REFERENCES agents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual payment portions
CREATE TABLE IF NOT EXISTS payment_portions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_payment_id UUID NOT NULL REFERENCES split_payments(id) ON DELETE CASCADE,

  -- Amount for this portion
  amount_cents INTEGER NOT NULL,
  percentage DECIMAL(5, 2), -- Optional percentage (e.g., 50.00 for 50%)

  -- Payment details
  payment_method_type TEXT NOT NULL DEFAULT 'card', -- card, bank_transfer, credit
  payment_intent_id TEXT, -- Stripe payment intent
  payment_method_id TEXT, -- Stripe payment method ID

  -- Card details (masked for display)
  card_brand TEXT, -- visa, mastercard, amex, etc.
  card_last_four TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, succeeded, failed, refunded
  error_message TEXT,

  -- Timestamps
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVOICE TEMPLATES TABLE
-- Custom invoice branding per agent/company
-- ============================================

CREATE TABLE IF NOT EXISTS invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,

  -- Template identification
  name TEXT NOT NULL DEFAULT 'Default',
  is_default BOOLEAN DEFAULT FALSE,

  -- Branding
  logo_url TEXT,
  company_name TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_website TEXT,

  -- Styling
  primary_color TEXT DEFAULT '#000000',
  secondary_color TEXT DEFAULT '#666666',
  accent_color TEXT DEFAULT '#0066cc',
  font_family TEXT DEFAULT 'Inter',

  -- Header/Footer content
  header_text TEXT,
  footer_text TEXT,
  terms_and_conditions TEXT,
  payment_instructions TEXT,

  -- Layout options
  show_logo BOOLEAN DEFAULT TRUE,
  show_qr_code BOOLEAN DEFAULT FALSE,
  show_due_date BOOLEAN DEFAULT TRUE,
  show_payment_link BOOLEAN DEFAULT TRUE,
  show_line_item_details BOOLEAN DEFAULT TRUE,

  -- PDF settings
  paper_size TEXT DEFAULT 'letter', -- letter, a4, legal
  margin_top DECIMAL(5, 2) DEFAULT 1.0,
  margin_bottom DECIMAL(5, 2) DEFAULT 1.0,
  margin_left DECIMAL(5, 2) DEFAULT 0.75,
  margin_right DECIMAL(5, 2) DEFAULT 0.75,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GENERATED INVOICES TABLE
-- Track generated PDF invoices
-- ============================================

CREATE TABLE IF NOT EXISTS generated_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  template_id UUID REFERENCES invoice_templates(id),

  -- Invoice details
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, viewed, paid, overdue, cancelled

  -- PDF storage
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- Tracking
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- Email tracking
  sent_to_email TEXT,
  email_opened_at TIMESTAMPTZ,

  -- Notes
  internal_notes TEXT,
  customer_notes TEXT,

  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1001;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invoice number
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_invoice_number ON generated_invoices;
CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON generated_invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- ============================================
-- PAYMENT HISTORY VIEW
-- Comprehensive payment tracking
-- ============================================

CREATE OR REPLACE VIEW payment_history AS
SELECT
  o.id AS order_id,
  o.contact_name,
  o.contact_email,
  o.total_cents,
  o.payment_status,
  o.paid_at,
  sp.id AS split_payment_id,
  sp.split_type,
  sp.status AS split_status,
  pp.id AS portion_id,
  pp.amount_cents AS portion_amount,
  pp.card_brand,
  pp.card_last_four,
  pp.status AS portion_status,
  pp.processed_at
FROM orders o
LEFT JOIN split_payments sp ON sp.order_id = o.id
LEFT JOIN payment_portions pp ON pp.split_payment_id = sp.id
ORDER BY o.created_at DESC;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_split_payments_order ON split_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_split_payments_status ON split_payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_portions_split ON payment_portions(split_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_portions_status ON payment_portions(status);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_agent ON invoice_templates(agent_id);
CREATE INDEX IF NOT EXISTS idx_generated_invoices_order ON generated_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_generated_invoices_status ON generated_invoices(status);
CREATE INDEX IF NOT EXISTS idx_generated_invoices_number ON generated_invoices(invoice_number);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE split_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_portions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_invoices ENABLE ROW LEVEL SECURITY;

-- Split payments - staff and order owner can view
DROP POLICY IF EXISTS "Split payments viewable by staff" ON split_payments;
DROP POLICY IF EXISTS "Split payments viewable by staff" ON split_payments;
CREATE POLICY "Split payments viewable by staff" ON split_payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = TRUE)
    OR EXISTS (
      SELECT 1 FROM orders o
      JOIN agents a ON a.id = o.agent_id
      WHERE o.id = split_payments.order_id
      AND a.email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Split payments insertable by staff" ON split_payments;
DROP POLICY IF EXISTS "Split payments insertable by staff" ON split_payments;
CREATE POLICY "Split payments insertable by staff" ON split_payments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = TRUE)
  );

DROP POLICY IF EXISTS "Split payments updatable by staff" ON split_payments;
DROP POLICY IF EXISTS "Split payments updatable by staff" ON split_payments;
CREATE POLICY "Split payments updatable by staff" ON split_payments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = TRUE)
  );

-- Payment portions - same as split payments
DROP POLICY IF EXISTS "Payment portions viewable by staff" ON payment_portions;
DROP POLICY IF EXISTS "Payment portions viewable by staff" ON payment_portions;
CREATE POLICY "Payment portions viewable by staff" ON payment_portions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = TRUE)
  );

DROP POLICY IF EXISTS "Payment portions insertable by staff" ON payment_portions;
DROP POLICY IF EXISTS "Payment portions insertable by staff" ON payment_portions;
CREATE POLICY "Payment portions insertable by staff" ON payment_portions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = TRUE)
  );

DROP POLICY IF EXISTS "Payment portions updatable by staff" ON payment_portions;
DROP POLICY IF EXISTS "Payment portions updatable by staff" ON payment_portions;
CREATE POLICY "Payment portions updatable by staff" ON payment_portions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = TRUE)
  );

-- Invoice templates - agents can manage their own, staff can manage all
DROP POLICY IF EXISTS "Invoice templates viewable by owner or staff" ON invoice_templates;
DROP POLICY IF EXISTS "Invoice templates viewable by owner or staff" ON invoice_templates;
CREATE POLICY "Invoice templates viewable by owner or staff" ON invoice_templates
  FOR SELECT USING (
    agent_id IS NULL
    OR EXISTS (SELECT 1 FROM agents WHERE id = invoice_templates.agent_id AND email = auth.jwt() ->> 'email')
    OR EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = TRUE)
  );

DROP POLICY IF EXISTS "Invoice templates insertable by owner or staff" ON invoice_templates;
DROP POLICY IF EXISTS "Invoice templates insertable by owner or staff" ON invoice_templates;
CREATE POLICY "Invoice templates insertable by owner or staff" ON invoice_templates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM agents WHERE id = invoice_templates.agent_id AND email = auth.jwt() ->> 'email')
    OR EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = TRUE)
  );

DROP POLICY IF EXISTS "Invoice templates updatable by owner or staff" ON invoice_templates;
DROP POLICY IF EXISTS "Invoice templates updatable by owner or staff" ON invoice_templates;
CREATE POLICY "Invoice templates updatable by owner or staff" ON invoice_templates
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM agents WHERE id = invoice_templates.agent_id AND email = auth.jwt() ->> 'email')
    OR EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = TRUE)
  );

DROP POLICY IF EXISTS "Invoice templates deletable by owner or staff" ON invoice_templates;
DROP POLICY IF EXISTS "Invoice templates deletable by owner or staff" ON invoice_templates;
CREATE POLICY "Invoice templates deletable by owner or staff" ON invoice_templates
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM agents WHERE id = invoice_templates.agent_id AND email = auth.jwt() ->> 'email')
    OR EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = TRUE)
  );

-- Generated invoices - staff and order owner can view
DROP POLICY IF EXISTS "Generated invoices viewable by staff or owner" ON generated_invoices;
DROP POLICY IF EXISTS "Generated invoices viewable by staff or owner" ON generated_invoices;
CREATE POLICY "Generated invoices viewable by staff or owner" ON generated_invoices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = TRUE)
    OR EXISTS (
      SELECT 1 FROM orders o
      JOIN agents a ON a.id = o.agent_id
      WHERE o.id = generated_invoices.order_id
      AND a.email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Generated invoices insertable by staff" ON generated_invoices;
DROP POLICY IF EXISTS "Generated invoices insertable by staff" ON generated_invoices;
CREATE POLICY "Generated invoices insertable by staff" ON generated_invoices
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = TRUE)
  );

DROP POLICY IF EXISTS "Generated invoices updatable by staff" ON generated_invoices;
DROP POLICY IF EXISTS "Generated invoices updatable by staff" ON generated_invoices;
CREATE POLICY "Generated invoices updatable by staff" ON generated_invoices
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM staff WHERE email = auth.jwt() ->> 'email' AND is_active = TRUE)
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get split payment summary for an order
CREATE OR REPLACE FUNCTION get_split_payment_summary(p_order_id UUID)
RETURNS TABLE (
  split_payment_id UUID,
  total_amount_cents INTEGER,
  paid_amount_cents INTEGER,
  remaining_amount_cents INTEGER,
  portion_count INTEGER,
  completed_portions INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.total_amount_cents,
    COALESCE(SUM(CASE WHEN pp.status = 'succeeded' THEN pp.amount_cents ELSE 0 END), 0)::INTEGER AS paid,
    (sp.total_amount_cents - COALESCE(SUM(CASE WHEN pp.status = 'succeeded' THEN pp.amount_cents ELSE 0 END), 0))::INTEGER AS remaining,
    COUNT(pp.id)::INTEGER AS portion_count,
    COUNT(CASE WHEN pp.status = 'succeeded' THEN 1 END)::INTEGER AS completed,
    sp.status
  FROM split_payments sp
  LEFT JOIN payment_portions pp ON pp.split_payment_id = sp.id
  WHERE sp.order_id = p_order_id
  GROUP BY sp.id, sp.total_amount_cents, sp.status;
END;
$$ LANGUAGE plpgsql;

-- Get invoice statistics
CREATE OR REPLACE FUNCTION get_invoice_stats()
RETURNS TABLE (
  total_invoices INTEGER,
  draft_count INTEGER,
  sent_count INTEGER,
  paid_count INTEGER,
  overdue_count INTEGER,
  total_amount_cents BIGINT,
  paid_amount_cents BIGINT,
  outstanding_amount_cents BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER,
    COUNT(CASE WHEN gi.status = 'draft' THEN 1 END)::INTEGER,
    COUNT(CASE WHEN gi.status = 'sent' THEN 1 END)::INTEGER,
    COUNT(CASE WHEN gi.status = 'paid' THEN 1 END)::INTEGER,
    COUNT(CASE WHEN gi.status = 'overdue' THEN 1 END)::INTEGER,
    COALESCE(SUM(o.total_cents), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN gi.status = 'paid' THEN o.total_cents ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN gi.status IN ('sent', 'viewed', 'overdue') THEN o.total_cents ELSE 0 END), 0)::BIGINT
  FROM generated_invoices gi
  JOIN orders o ON o.id = gi.order_id;
END;
$$ LANGUAGE plpgsql;

-- Create default invoice template for agent
CREATE OR REPLACE FUNCTION create_default_invoice_template(p_agent_id UUID)
RETURNS UUID AS $$
DECLARE
  v_template_id UUID;
  v_agent RECORD;
BEGIN
  -- Get agent info
  SELECT * INTO v_agent FROM agents WHERE id = p_agent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent not found';
  END IF;

  -- Create default template
  INSERT INTO invoice_templates (
    agent_id,
    name,
    is_default,
    company_name,
    company_email,
    primary_color
  ) VALUES (
    p_agent_id,
    'Default Template',
    TRUE,
    v_agent.name,
    v_agent.email,
    COALESCE(v_agent.brand_color, '#000000')
  )
  RETURNING id INTO v_template_id;

  RETURN v_template_id;
END;
$$ LANGUAGE plpgsql;
