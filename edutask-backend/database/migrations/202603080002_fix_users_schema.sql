-- Add missing columns to users table to match Prisma schema and application logic.
BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0;

-- Add trust_tier if it doesn't exist. 
-- Note: trust_tier is an enum TrustTier in Prisma. We'll use text for now to avoid enum creation complexity if not needed, 
-- or we can check if the type exists.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trusttier') THEN
        CREATE TYPE trusttier AS ENUM ('basic', 'verified', 'trusted');
    END IF;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_tier trusttier DEFAULT 'basic';

COMMIT;
