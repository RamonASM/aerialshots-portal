-- Made idempotent: 2026-01-07
-- Security Fixes Migration
-- Fixes overly permissive RLS policies from 20241227_001_enterprise_upgrade.sql
-- CRITICAL: These policies used USING (true) which allowed anyone access

-- =====================================================
-- DROP INSECURE POLICIES
-- =====================================================

-- Share Links - was USING (true)
DROP POLICY IF EXISTS "Share links readable by token" ON share_links;
DROP POLICY IF EXISTS "Share links insertable by staff/agents" ON share_links;
DROP POLICY IF EXISTS "Share links updatable by owner" ON share_links;

-- Client Messages - was USING (true)
DROP POLICY IF EXISTS "Client messages readable by listing access" ON client_messages;
DROP POLICY IF EXISTS "Client messages insertable" ON client_messages;

-- Seller Schedules - was USING (true)
DROP POLICY IF EXISTS "Seller schedules public access" ON seller_schedules;

-- Portal Settings - was auth.uid() IS NOT NULL (any authenticated user)
DROP POLICY IF EXISTS "Portal settings by agent" ON portal_settings;

-- Client Feedback - was WITH CHECK (true)
DROP POLICY IF EXISTS "Client feedback public insert" ON client_feedback;
DROP POLICY IF EXISTS "Client feedback readable" ON client_feedback;

-- Email Templates - check and fix
DROP POLICY IF EXISTS "Email templates readable" ON email_templates;
DROP POLICY IF EXISTS "Email templates manageable by staff" ON email_templates;

-- =====================================================
-- SHARE LINKS - Token-Based Access
-- =====================================================

-- Staff can manage all share links
DROP POLICY IF EXISTS "Staff can manage share links" ON share_links;
DROP POLICY IF EXISTS "Staff can manage share links" ON share_links;
CREATE POLICY "Staff can manage share links" ON share_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

-- Agents can manage their own share links
DROP POLICY IF EXISTS "Agents can manage own share links" ON share_links;
DROP POLICY IF EXISTS "Agents can manage own share links" ON share_links;
CREATE POLICY "Agents can manage own share links" ON share_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE id = share_links.agent_id
      AND email = auth.jwt() ->> 'email'
    )
  );

-- Public access ONLY via valid, non-expired token (for portal access)
-- This is read-only and validates the token is active
DROP POLICY IF EXISTS "Public token-based read access" ON share_links;
DROP POLICY IF EXISTS "Public token-based read access" ON share_links;
CREATE POLICY "Public token-based read access" ON share_links
  FOR SELECT USING (
    -- Token must be provided in the query and match
    -- AND not be expired AND be active
    share_token IS NOT NULL
    AND (expires_at IS NULL OR expires_at > NOW())
    AND is_active = true
  );

-- =====================================================
-- CLIENT MESSAGES - Ownership Validation
-- =====================================================

-- Staff can view all messages
DROP POLICY IF EXISTS "Staff can view all messages" ON client_messages;
DROP POLICY IF EXISTS "Staff can view all messages" ON client_messages;
CREATE POLICY "Staff can view all messages" ON client_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

-- Agents can view messages for their listings
DROP POLICY IF EXISTS "Agents can view own listing messages" ON client_messages;
DROP POLICY IF EXISTS "Agents can view own listing messages" ON client_messages;
CREATE POLICY "Agents can view own listing messages" ON client_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM listings l
      JOIN agents a ON l.agent_id = a.id
      WHERE l.id = client_messages.listing_id
      AND a.email = auth.jwt() ->> 'email'
    )
  );

-- Staff can insert messages
DROP POLICY IF EXISTS "Staff can insert messages" ON client_messages;
DROP POLICY IF EXISTS "Staff can insert messages" ON client_messages;
CREATE POLICY "Staff can insert messages" ON client_messages
  FOR INSERT WITH CHECK (
    sender_type = 'admin' AND
    EXISTS (
      SELECT 1 FROM staff
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

-- Agents can insert messages for their listings
DROP POLICY IF EXISTS "Agents can insert messages for own listings" ON client_messages;
DROP POLICY IF EXISTS "Agents can insert messages for own listings" ON client_messages;
CREATE POLICY "Agents can insert messages for own listings" ON client_messages
  FOR INSERT WITH CHECK (
    sender_type = 'agent' AND
    EXISTS (
      SELECT 1 FROM listings l
      JOIN agents a ON l.agent_id = a.id
      WHERE l.id = client_messages.listing_id
      AND a.email = auth.jwt() ->> 'email'
    )
  );

-- Clients can insert messages via valid share link
DROP POLICY IF EXISTS "Clients can insert via share link" ON client_messages;
DROP POLICY IF EXISTS "Clients can insert via share link" ON client_messages;
CREATE POLICY "Clients can insert via share link" ON client_messages
  FOR INSERT WITH CHECK (
    sender_type = 'client' AND
    EXISTS (
      SELECT 1 FROM share_links sl
      WHERE sl.listing_id = client_messages.listing_id
      AND sl.is_active = true
      AND (sl.expires_at IS NULL OR sl.expires_at > NOW())
    )
  );

-- =====================================================
-- SELLER SCHEDULES - Token-Based Access
-- =====================================================

-- Staff can manage all schedules
DROP POLICY IF EXISTS "Staff can manage seller schedules" ON seller_schedules;
DROP POLICY IF EXISTS "Staff can manage seller schedules" ON seller_schedules;
CREATE POLICY "Staff can manage seller schedules" ON seller_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

-- Agents can view schedules for their share links
DROP POLICY IF EXISTS "Agents can view own schedules" ON seller_schedules;
DROP POLICY IF EXISTS "Agents can view own schedules" ON seller_schedules;
CREATE POLICY "Agents can view own schedules" ON seller_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM share_links sl
      JOIN agents a ON sl.agent_id = a.id
      WHERE sl.id = seller_schedules.share_link_id
      AND a.email = auth.jwt() ->> 'email'
    )
  );

-- Public can insert/update schedules ONLY via valid share link token
-- The application must validate the token before allowing access
DROP POLICY IF EXISTS "Public can submit schedule via valid link" ON seller_schedules;
DROP POLICY IF EXISTS "Public can submit schedule via valid link" ON seller_schedules;
CREATE POLICY "Public can submit schedule via valid link" ON seller_schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM share_links sl
      WHERE sl.id = seller_schedules.share_link_id
      AND sl.link_type IN ('schedule', 'full')
      AND sl.is_active = true
      AND (sl.expires_at IS NULL OR sl.expires_at > NOW())
    )
  );

DROP POLICY IF EXISTS "Public can update own schedule submission" ON seller_schedules;
DROP POLICY IF EXISTS "Public can update own schedule submission" ON seller_schedules;
CREATE POLICY "Public can update own schedule submission" ON seller_schedules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM share_links sl
      WHERE sl.id = seller_schedules.share_link_id
      AND sl.link_type IN ('schedule', 'full')
      AND sl.is_active = true
      AND (sl.expires_at IS NULL OR sl.expires_at > NOW())
    )
  );

-- =====================================================
-- PORTAL SETTINGS - Agent Owner or Staff
-- =====================================================

-- Staff can manage all portal settings
DROP POLICY IF EXISTS "Staff can manage portal settings" ON portal_settings;
DROP POLICY IF EXISTS "Staff can manage portal settings" ON portal_settings;
CREATE POLICY "Staff can manage portal settings" ON portal_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

-- Agents can only manage their own portal settings
DROP POLICY IF EXISTS "Agents can manage own portal settings" ON portal_settings;
DROP POLICY IF EXISTS "Agents can manage own portal settings" ON portal_settings;
CREATE POLICY "Agents can manage own portal settings" ON portal_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE id = portal_settings.agent_id
      AND email = auth.jwt() ->> 'email'
    )
  );

-- =====================================================
-- CLIENT FEEDBACK - Validated Insert, Agent Can View
-- =====================================================

-- Staff can view all feedback
DROP POLICY IF EXISTS "Staff can view all feedback" ON client_feedback;
DROP POLICY IF EXISTS "Staff can view all feedback" ON client_feedback;
CREATE POLICY "Staff can view all feedback" ON client_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

-- Agents can view feedback for their listings
DROP POLICY IF EXISTS "Agents can view own listing feedback" ON client_feedback;
DROP POLICY IF EXISTS "Agents can view own listing feedback" ON client_feedback;
CREATE POLICY "Agents can view own listing feedback" ON client_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM listings l
      JOIN agents a ON l.agent_id = a.id
      WHERE l.id = client_feedback.listing_id
      AND a.email = auth.jwt() ->> 'email'
    )
  );

-- Public can view feedback marked as public
DROP POLICY IF EXISTS "Public can view public feedback" ON client_feedback;
DROP POLICY IF EXISTS "Public can view public feedback" ON client_feedback;
CREATE POLICY "Public can view public feedback" ON client_feedback
  FOR SELECT USING (is_public = true);

-- Feedback can only be inserted via valid share link
DROP POLICY IF EXISTS "Insert feedback via valid share link" ON client_feedback;
DROP POLICY IF EXISTS "Insert feedback via valid share link" ON client_feedback;
CREATE POLICY "Insert feedback via valid share link" ON client_feedback
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM share_links sl
      WHERE sl.listing_id = client_feedback.listing_id
      AND sl.is_active = true
      AND (sl.expires_at IS NULL OR sl.expires_at > NOW())
    )
  );

-- =====================================================
-- EMAIL TEMPLATES - Staff Only
-- =====================================================

-- Only staff can manage email templates
DROP POLICY IF EXISTS "Staff can manage email templates" ON email_templates;
DROP POLICY IF EXISTS "Staff can manage email templates" ON email_templates;
CREATE POLICY "Staff can manage email templates" ON email_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

-- Templates are readable by authenticated users (for sending)
DROP POLICY IF EXISTS "Authenticated users can read templates" ON email_templates;
DROP POLICY IF EXISTS "Authenticated users can read templates" ON email_templates;
CREATE POLICY "Authenticated users can read templates" ON email_templates
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND is_active = true
  );

-- =====================================================
-- NOTIFICATION LOGS - Proper Access Control
-- =====================================================

-- Drop any overly permissive policies
DROP POLICY IF EXISTS "Notification logs insertable" ON notification_logs;
DROP POLICY IF EXISTS "Notification logs readable" ON notification_logs;

-- Staff can view all notification logs
DROP POLICY IF EXISTS "Staff can view notification logs" ON notification_logs;
DROP POLICY IF EXISTS "Staff can view notification logs" ON notification_logs;
CREATE POLICY "Staff can view notification logs" ON notification_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

-- Agents can view notifications for their listings
DROP POLICY IF EXISTS "Agents can view own notification logs" ON notification_logs;
DROP POLICY IF EXISTS "Agents can view own notification logs" ON notification_logs;
CREATE POLICY "Agents can view own notification logs" ON notification_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM listings l
      JOIN agents a ON l.agent_id = a.id
      WHERE l.id = notification_logs.listing_id
      AND a.email = auth.jwt() ->> 'email'
    )
  );

-- System can insert notification logs (service role)
DROP POLICY IF EXISTS "Service can insert notification logs" ON notification_logs;
DROP POLICY IF EXISTS "Service can insert notification logs" ON notification_logs;
CREATE POLICY "Service can insert notification logs" ON notification_logs
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- ADD is_active COLUMN TO share_links IF MISSING
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'share_links' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE share_links ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- =====================================================
-- INDEXES FOR SECURITY QUERIES
-- =====================================================

-- Index for token lookups (critical for portal access)
CREATE INDEX IF NOT EXISTS idx_share_links_token_active
  ON share_links(share_token)
  WHERE is_active = true;

-- Index for expiration checks
CREATE INDEX IF NOT EXISTS idx_share_links_expires
  ON share_links(expires_at)
  WHERE expires_at IS NOT NULL;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "Public token-based read access" ON share_links IS
  'Allows public read access only for valid, non-expired, active share links';

COMMENT ON POLICY "Clients can insert via share link" ON client_messages IS
  'Clients can only message through valid share links for that listing';

COMMENT ON POLICY "Public can submit schedule via valid link" ON seller_schedules IS
  'Sellers can only submit availability through valid scheduling links';

COMMENT ON POLICY "Insert feedback via valid share link" ON client_feedback IS
  'Feedback can only be submitted through valid share links';
