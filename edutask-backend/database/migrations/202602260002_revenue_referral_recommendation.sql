BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Revenue tracking for escrow settlements.
CREATE TABLE IF NOT EXISTS platform_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE RESTRICT,
  escrow_id UUID NOT NULL UNIQUE REFERENCES escrows(id) ON DELETE RESTRICT,
  gross_amount NUMERIC(20,4) NOT NULL CHECK (gross_amount >= 0),
  fee_amount NUMERIC(20,4) NOT NULL CHECK (fee_amount >= 0),
  net_amount NUMERIC(20,4) NOT NULL CHECK (net_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_earnings_amount_consistency_chk
    CHECK (gross_amount = fee_amount + net_amount)
);

CREATE INDEX IF NOT EXISTS idx_platform_earnings_created
  ON platform_earnings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_task
  ON platform_earnings(task_id);

-- Referral support and attribution.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code_unique
  ON users(referral_code)
  WHERE referral_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  milestone TEXT NOT NULL CHECK (milestone IN ('first_completed_task', 'first_withdrawal')),
  reward_amount NUMERIC(20,4) NOT NULL CHECK (reward_amount >= 0),
  status TEXT NOT NULL DEFAULT 'credited' CHECK (status IN ('credited', 'skipped')),
  ledger_journal_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referred_user_id, milestone)
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer
  ON referral_rewards(referrer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred
  ON referral_rewards(referred_user_id, created_at DESC);

-- Task skills for recommendation model.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS required_skills JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_required_skills_array_chk'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_required_skills_array_chk
      CHECK (jsonb_typeof(required_skills) = 'array');
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_tasks_required_skills_gin
  ON tasks USING GIN (required_skills);

COMMIT;
