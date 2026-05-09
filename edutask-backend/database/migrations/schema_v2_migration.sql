-- schema_v2_migration.sql
-- Production-safe v2 migration for EDUTASK (Supabase/PostgreSQL).
-- Run in ordered phases as written.

-- ============================================================================
-- PHASE A (transaction-safe structural changes + backfill)
-- ============================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'escrow_status') THEN
    CREATE TYPE escrow_status AS ENUM ('locked', 'released', 'refunded');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'escrow_release_type') THEN
    CREATE TYPE escrow_release_type AS ENUM ('approval', 'auto_release', 'dispute_resolution', 'refund');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_verification_status') THEN
    CREATE TYPE profile_verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
  END IF;
END $$;

ALTER TABLE escrows ADD COLUMN IF NOT EXISTS status escrow_status;

UPDATE escrows
SET status = CASE
  WHEN released_at IS NULL THEN 'locked'::escrow_status
  WHEN release_type = 'refund' THEN 'refunded'::escrow_status
  ELSE 'released'::escrow_status
END
WHERE status IS NULL;

ALTER TABLE escrows ALTER COLUMN status SET DEFAULT 'locked';
ALTER TABLE escrows ALTER COLUMN status SET NOT NULL;

ALTER TABLE escrows ADD COLUMN IF NOT EXISTS release_type_v2 escrow_release_type;
UPDATE escrows
SET release_type_v2 = CASE
  WHEN release_type IS NULL THEN NULL
  ELSE release_type::escrow_release_type
END
WHERE release_type_v2 IS NULL;
ALTER TABLE escrows DROP COLUMN release_type;
ALTER TABLE escrows RENAME COLUMN release_type_v2 TO release_type;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status_v2 profile_verification_status;
UPDATE profiles
SET verification_status_v2 = CASE
  WHEN verification_status IN ('unverified','pending','verified','rejected')
    THEN verification_status::profile_verification_status
  ELSE 'unverified'::profile_verification_status
END
WHERE verification_status_v2 IS NULL;
ALTER TABLE profiles DROP COLUMN verification_status;
ALTER TABLE profiles RENAME COLUMN verification_status_v2 TO verification_status;
ALTER TABLE profiles ALTER COLUMN verification_status SET DEFAULT 'unverified';
ALTER TABLE profiles ALTER COLUMN verification_status SET NOT NULL;

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  request_hash VARCHAR(128) NOT NULL,
  response_hash VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  CONSTRAINT idempotency_status_chk CHECK (status IN ('in_progress','completed','failed'))
);

ALTER TABLE escrows DROP CONSTRAINT IF EXISTS escrows_task_id_fkey;
ALTER TABLE escrows
  ADD CONSTRAINT escrows_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_user_id_fkey;
ALTER TABLE wallets
  ADD CONSTRAINT wallets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_wallet_id_fkey;
ALTER TABLE wallet_transactions
  ADD CONSTRAINT wallet_transactions_wallet_id_fkey
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE wallet_transactions
  ADD CONSTRAINT wallet_transactions_related_escrow_fk
  FOREIGN KEY (related_escrow_id) REFERENCES escrows(id) ON DELETE SET NULL
  NOT VALID;

ALTER TABLE wallets
  ADD CONSTRAINT wallets_totals_non_negative_chk
  CHECK (total_earned >= 0 AND total_spent >= 0)
  NOT VALID;

ALTER TABLE submissions
  ADD CONSTRAINT submissions_content_not_blank_chk
  CHECK (LENGTH(TRIM(submission_content)) > 0)
  NOT VALID;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_timestamps_chk
  CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR
    (status = 'cancelled' AND cancelled_at IS NOT NULL)
    OR
    (status NOT IN ('completed','cancelled'))
  )
  NOT VALID;

ALTER TABLE disputes
  ADD CONSTRAINT disputes_resolved_at_consistency_chk
  CHECK (
    (status IN ('resolved','auto_resolved') AND resolved_at IS NOT NULL)
    OR
    (status NOT IN ('resolved','auto_resolved'))
  )
  NOT VALID;

ALTER TABLE escrows
  ADD CONSTRAINT escrows_state_consistency_chk
  CHECK (
    (status = 'locked' AND released_at IS NULL AND release_type IS NULL)
    OR
    (status = 'released' AND released_at IS NOT NULL AND release_type IN ('approval','auto_release','dispute_resolution') AND executor_wallet_id IS NOT NULL)
    OR
    (status = 'refunded' AND released_at IS NOT NULL AND release_type IN ('refund','dispute_resolution'))
  )
  NOT VALID;

CREATE OR REPLACE FUNCTION enforce_escrow_monotonic_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF; 

  IF OLD.status IN ('released', 'refunded') THEN
    RAISE EXCEPTION 'escrow status transition from % to % is not allowed', OLD.status, NEW.status;
  END IF;

  IF OLD.status = 'locked' AND NEW.status NOT IN ('released', 'refunded') THEN
    RAISE EXCEPTION 'escrow status transition from % to % is not allowed', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS escrows_monotonic_status_guard ON escrows;
CREATE TRIGGER escrows_monotonic_status_guard
BEFORE UPDATE OF status ON escrows
FOR EACH ROW EXECUTE FUNCTION enforce_escrow_monotonic_transition();

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
CREATE TRIGGER audit_logs_no_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS audit_logs_no_delete ON audit_logs;
CREATE TRIGGER audit_logs_no_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE OR REPLACE FUNCTION enforce_wallet_tx_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'wallet_transactions is immutable';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'completed/failed wallet_transactions cannot be updated';
    END IF;

    IF OLD.transaction_type <> 'withdrawal_request' THEN
      RAISE EXCEPTION 'only pending withdrawal_request may be updated';
    END IF;

    IF NEW.status NOT IN ('completed','failed','cancelled') THEN
      RAISE EXCEPTION 'invalid status transition for pending withdrawal_request';
    END IF;

    IF NEW.wallet_id IS DISTINCT FROM OLD.wallet_id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.transaction_type IS DISTINCT FROM OLD.transaction_type
      OR NEW.amount IS DISTINCT FROM OLD.amount
      OR NEW.balance_before IS DISTINCT FROM OLD.balance_before
      OR NEW.balance_after IS DISTINCT FROM OLD.balance_after
      OR NEW.escrow_balance_before IS DISTINCT FROM OLD.escrow_balance_before
      OR NEW.escrow_balance_after IS DISTINCT FROM OLD.escrow_balance_after
      OR NEW.related_task_id IS DISTINCT FROM OLD.related_task_id
      OR NEW.related_escrow_id IS DISTINCT FROM OLD.related_escrow_id
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.metadata IS DISTINCT FROM OLD.metadata THEN
      RAISE EXCEPTION 'only status/processed_at may change for pending withdrawal_request';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wallet_transactions_immutable_guard ON wallet_transactions;
CREATE TRIGGER wallet_transactions_immutable_guard
BEFORE UPDATE OR DELETE ON wallet_transactions
FOR EACH ROW EXECUTE FUNCTION enforce_wallet_tx_immutability();

COMMIT;

-- ============================================================================
-- PHASE B (validate constraints online)
-- ============================================================================
ALTER TABLE escrows VALIDATE CONSTRAINT escrows_task_id_fkey;
ALTER TABLE wallets VALIDATE CONSTRAINT wallets_user_id_fkey;
ALTER TABLE wallet_transactions VALIDATE CONSTRAINT wallet_transactions_wallet_id_fkey;
ALTER TABLE wallet_transactions VALIDATE CONSTRAINT wallet_transactions_related_escrow_fk;
ALTER TABLE wallets VALIDATE CONSTRAINT wallets_totals_non_negative_chk;
ALTER TABLE submissions VALIDATE CONSTRAINT submissions_content_not_blank_chk;
ALTER TABLE tasks VALIDATE CONSTRAINT tasks_status_timestamps_chk;
ALTER TABLE disputes VALIDATE CONSTRAINT disputes_resolved_at_consistency_chk;
ALTER TABLE escrows VALIDATE CONSTRAINT escrows_state_consistency_chk;

-- ============================================================================
-- PHASE C (concurrent indexes, outside transaction)
-- ============================================================================
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_idempotency_user_endpoint_key
  ON idempotency_keys(user_id, endpoint, idempotency_key);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_idempotency_expires_at
  ON idempotency_keys(expires_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_escrows_status_locked
  ON escrows(status)
  WHERE status = 'locked';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_related_escrow_created
  ON wallet_transactions(related_escrow_id, created_at DESC)
  WHERE related_escrow_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_disputes_open_by_task
  ON disputes(task_id, status)
  WHERE status IN ('pending','under_review','escalated');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_active_status_deadline
  ON tasks(status, deadline)
  WHERE status IN ('application_open','executor_selected','in_progress','under_review','disputed');
