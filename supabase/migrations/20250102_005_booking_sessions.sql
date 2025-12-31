-- Create booking_sessions table for cart recovery
CREATE TABLE IF NOT EXISTS public.booking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  current_step integer NOT NULL DEFAULT 0,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  pricing_snapshot jsonb,
  package_key text,
  property_address text,
  property_city text,
  scheduled_date text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  is_converted boolean NOT NULL DEFAULT false,
  converted_at timestamptz,
  is_abandoned boolean NOT NULL DEFAULT false,
  abandoned_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_booking_sessions_session_id ON public.booking_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_booking_sessions_user_id ON public.booking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_sessions_email ON public.booking_sessions(email);
CREATE INDEX IF NOT EXISTS idx_booking_sessions_is_converted ON public.booking_sessions(is_converted) WHERE is_converted = false;
CREATE INDEX IF NOT EXISTS idx_booking_sessions_last_activity ON public.booking_sessions(last_activity_at);

-- Add RLS policies
ALTER TABLE public.booking_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own booking sessions"
  ON public.booking_sessions
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Service role can do everything (for admin API)
CREATE POLICY "Service role has full access to booking sessions"
  ON public.booking_sessions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Add updated_at trigger
CREATE TRIGGER set_booking_sessions_updated_at
  BEFORE UPDATE ON public.booking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.booking_sessions IS 'Tracks incomplete booking sessions for cart recovery and abandonment analysis';
