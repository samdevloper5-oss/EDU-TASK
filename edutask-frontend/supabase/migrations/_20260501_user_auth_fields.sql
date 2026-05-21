ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS remember_me BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_reset_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, email_verified, trust_score, phone, student_id, university_name, department, location, skills, password_hash)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    FALSE, 20, 
    'temp_' || substring(NEW.id::text, 1, 10), 
    'temp_' || substring(NEW.id::text, 1, 10), 
    'Pending', 'Pending', 'Pending', 
    '[]'::jsonb, 
    'supabase_auth'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
