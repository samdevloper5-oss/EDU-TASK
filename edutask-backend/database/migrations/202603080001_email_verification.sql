-- Add email verification token and expiry to users table.
BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP WITH TIME ZONE;

-- Ensure is_verified and email_verified are false for new users.
ALTER TABLE users ALTER COLUMN is_verified SET DEFAULT FALSE;
ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT FALSE;

COMMIT;
