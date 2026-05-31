-- Admin Setup Script
-- Run this in Supabase SQL Editor after creating the first user account.
-- Replace the email below with your admin email.

-- Step 1: Find your user ID (replace with your email)
-- SELECT id FROM users WHERE email = 'your-admin@example.com';

-- Step 2: Promote to admin
-- UPDATE users SET is_admin = true WHERE id = '<user-id-from-step-1>';

-- Combined: Run this with your email
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE email = 'your-admin@example.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Create an account first, then run this with the correct email.';
  END IF;

  UPDATE users SET is_admin = true, profile_complete = true WHERE id = v_user_id;
  RAISE NOTICE 'User % promoted to admin successfully!', v_user_id;
END $$;
