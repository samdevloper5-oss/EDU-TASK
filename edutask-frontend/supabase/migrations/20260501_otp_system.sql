CREATE TYPE IF NOT EXISTS otp_type AS ENUM ('email_verify', 'password_reset');

CREATE TABLE IF NOT EXISTS public.otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  otp TEXT NOT NULL CHECK (char_length(otp) = 6),
  type otp_type NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  used BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0 CHECK (attempts <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS otp_codes_lookup_idx ON public.otp_codes (email, type, used, expires_at);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "otp_deny_all_client" ON public.otp_codes FOR ALL USING (false);
