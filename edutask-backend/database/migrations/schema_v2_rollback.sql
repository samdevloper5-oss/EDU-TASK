-- schema_v2_rollback.sql
-- Rollback for schema_v2_migration.sql

-- Phase R1: drop concurrent indexes first
DROP INDEX CONCURRENTLY IF EXISTS idx_tasks_active_status_deadline;
DROP INDEX CONCURRENTLY IF EXISTS idx_disputes_open_by_task;
DROP INDEX CONCURRENTLY IF EXISTS idx_wallet_transactions_related_escrow_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_escrows_status_locked;
DROP INDEX CONCURRENTLY IF EXISTS idx_idempotency_expires_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_idempotency_user_endpoint_key;

BEGIN;

DROP TRIGGER IF EXISTS wallet_transactions_immutable_guard ON wallet_transactions;
DROP FUNCTION IF EXISTS enforce_wallet_tx_immutability();

DROP TRIGGER IF EXISTS escrows_monotonic_status_guard ON escrows;
DROP FUNCTION IF EXISTS enforce_escrow_monotonic_transition();

DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
DROP TRIGGER IF EXISTS audit_logs_no_delete ON audit_logs;
DROP FUNCTION IF EXISTS prevent_audit_log_mutation();

ALTER TABLE IF EXISTS escrows DROP CONSTRAINT IF EXISTS escrows_state_consistency_chk;
ALTER TABLE IF EXISTS disputes DROP CONSTRAINT IF EXISTS disputes_resolved_at_consistency_chk;
ALTER TABLE IF EXISTS tasks DROP CONSTRAINT IF EXISTS tasks_status_timestamps_chk;
ALTER TABLE IF EXISTS submissions DROP CONSTRAINT IF EXISTS submissions_content_not_blank_chk;
ALTER TABLE IF EXISTS wallets DROP CONSTRAINT IF EXISTS wallets_totals_non_negative_chk;
ALTER TABLE IF EXISTS wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_related_escrow_fk;

ALTER TABLE IF EXISTS escrows DROP CONSTRAINT IF EXISTS escrows_task_id_fkey;
ALTER TABLE IF EXISTS escrows
  ADD CONSTRAINT escrows_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS wallets DROP CONSTRAINT IF EXISTS wallets_user_id_fkey;
ALTER TABLE IF EXISTS wallets
  ADD CONSTRAINT wallets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_wallet_id_fkey;
ALTER TABLE IF EXISTS wallet_transactions
  ADD CONSTRAINT wallet_transactions_wallet_id_fkey
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status_old VARCHAR(50);
UPDATE profiles SET verification_status_old = verification_status::text
WHERE verification_status_old IS NULL;
ALTER TABLE profiles DROP COLUMN IF EXISTS verification_status;
ALTER TABLE profiles RENAME COLUMN verification_status_old TO verification_status;
ALTER TABLE profiles ALTER COLUMN verification_status SET DEFAULT 'unverified';

ALTER TABLE escrows ADD COLUMN IF NOT EXISTS release_type_old VARCHAR(50);
UPDATE escrows SET release_type_old = release_type::text
WHERE release_type_old IS NULL;
ALTER TABLE escrows DROP COLUMN IF EXISTS release_type;
ALTER TABLE escrows RENAME COLUMN release_type_old TO release_type;
ALTER TABLE escrows DROP COLUMN IF EXISTS status;

-- Keep idempotency_keys to avoid losing replay-protection history during rollback.
-- The table is intentionally preserved.

COMMIT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_verification_status') THEN
    DROP TYPE profile_verification_status;
  END IF;
EXCEPTION WHEN dependent_objects_still_exist THEN
  RAISE NOTICE 'profile_verification_status still in use, skipped';
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'escrow_release_type') THEN
    DROP TYPE escrow_release_type;
  END IF;
EXCEPTION WHEN dependent_objects_still_exist THEN
  RAISE NOTICE 'escrow_release_type still in use, skipped';
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'escrow_status') THEN
    DROP TYPE escrow_status;
  END IF;
EXCEPTION WHEN dependent_objects_still_exist THEN
  RAISE NOTICE 'escrow_status still in use, skipped';
END $$;
