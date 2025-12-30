-- Open Houses & RSVP System
-- Allows agents to schedule open houses and collect RSVPs

-- Open Houses table
CREATE TABLE IF NOT EXISTS open_houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Scheduling
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',

  -- Details
  title TEXT,
  description TEXT,
  max_attendees INTEGER,
  is_private BOOLEAN DEFAULT false,
  require_registration BOOLEAN DEFAULT true,

  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  cancelled_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Open House RSVPs table
CREATE TABLE IF NOT EXISTS open_house_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  open_house_id UUID NOT NULL REFERENCES open_houses(id) ON DELETE CASCADE,

  -- Attendee Info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  party_size INTEGER DEFAULT 1,

  -- Status
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'attended', 'cancelled', 'no_show')),

  -- Notes
  notes TEXT,
  source TEXT DEFAULT 'website',

  -- Lead conversion
  lead_id UUID REFERENCES leads(id),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_open_houses_listing ON open_houses(listing_id);
CREATE INDEX idx_open_houses_agent ON open_houses(agent_id);
CREATE INDEX idx_open_houses_date ON open_houses(event_date);
CREATE INDEX idx_open_houses_status ON open_houses(status);
CREATE INDEX idx_open_house_rsvps_open_house ON open_house_rsvps(open_house_id);
CREATE INDEX idx_open_house_rsvps_email ON open_house_rsvps(email);

-- Unique constraint - one RSVP per email per open house
CREATE UNIQUE INDEX idx_open_house_rsvps_unique ON open_house_rsvps(open_house_id, email);

-- RLS
ALTER TABLE open_houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_house_rsvps ENABLE ROW LEVEL SECURITY;

-- Open houses are readable by anyone (public pages)
CREATE POLICY "Open houses are readable by anyone"
  ON open_houses FOR SELECT
  USING (true);

-- Agents can manage their own open houses
CREATE POLICY "Agents can manage their open houses"
  ON open_houses FOR ALL
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Staff can manage all open houses
CREATE POLICY "Staff can manage all open houses"
  ON open_houses FOR ALL
  USING (auth.email() LIKE '%@aerialshots.media')
  WITH CHECK (auth.email() LIKE '%@aerialshots.media');

-- RSVPs are insertable by anyone (public registration)
CREATE POLICY "Anyone can create RSVPs"
  ON open_house_rsvps FOR INSERT
  WITH CHECK (true);

-- RSVPs are readable by agents who own the open house
CREATE POLICY "Agents can read RSVPs for their open houses"
  ON open_house_rsvps FOR SELECT
  USING (
    open_house_id IN (
      SELECT id FROM open_houses WHERE agent_id = auth.uid()
    )
  );

-- Staff can read all RSVPs
CREATE POLICY "Staff can read all RSVPs"
  ON open_house_rsvps FOR SELECT
  USING (auth.email() LIKE '%@aerialshots.media');

-- Agents can update RSVPs for their open houses
CREATE POLICY "Agents can update RSVPs for their open houses"
  ON open_house_rsvps FOR UPDATE
  USING (
    open_house_id IN (
      SELECT id FROM open_houses WHERE agent_id = auth.uid()
    )
  );

-- Staff can update all RSVPs
CREATE POLICY "Staff can update all RSVPs"
  ON open_house_rsvps FOR UPDATE
  USING (auth.email() LIKE '%@aerialshots.media');

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_open_house_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_open_houses_timestamp
  BEFORE UPDATE ON open_houses
  FOR EACH ROW
  EXECUTE FUNCTION update_open_house_timestamp();

CREATE TRIGGER update_open_house_rsvps_timestamp
  BEFORE UPDATE ON open_house_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION update_open_house_timestamp();

-- Realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE open_houses;
ALTER PUBLICATION supabase_realtime ADD TABLE open_house_rsvps;
