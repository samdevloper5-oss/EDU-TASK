-- ============================================================================
-- EDUTASK Fintech Core Schema (PostgreSQL 17 / Supabase)
-- Fresh bootstrap migration (for empty database)
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('student', 'admin', 'system');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM (
      'draft',
      'published',
      'application_open',
      'executor_selected',
      'in_progress',
      'under_review',
      'completed',
      'cancelled',
      'disputed'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'escrow_status') THEN
    CREATE TYPE escrow_status AS ENUM ('pending', 'locked', 'released', 'refunded');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'escrow_release_type') THEN
    CREATE TYPE escrow_release_type AS ENUM ('approval', 'auto_release', 'refund', 'dispute_resolution');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_status') THEN
    CREATE TYPE dispute_status AS ENUM ('pending', 'under_review', 'resolved', 'auto_resolved', 'escalated', 'dismissed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_direction') THEN
    CREATE TYPE ledger_direction AS ENUM ('debit', 'credit');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status') THEN
    CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'processing', 'paid', 'failed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webhook_event_status') THEN
    CREATE TYPE webhook_event_status AS ENUM ('received', 'processed', 'failed', 'ignored');
  END IF;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1) users (minimal stub for external auth mapping)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_auth_id TEXT UNIQUE,
  email TEXT UNIQUE,
  role app_role NOT NULL DEFAULT 'student',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Minimal task anchor needed for escrow/dispute relations
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  executor_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  status task_status NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  amount NUMERIC(20,4) CHECK (amount IS NULL OR amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) wallets
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  currency CHAR(3) NOT NULL DEFAULT 'BDT',
  balance NUMERIC(20,4) NOT NULL DEFAULT 0,
  escrow_balance NUMERIC(20,4) NOT NULL DEFAULT 0,
  version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wallets_balance_non_negative_chk CHECK (balance >= 0),
  CONSTRAINT wallets_escrow_balance_non_negative_chk CHECK (escrow_balance >= 0)
);

-- 3) escrows
CREATE TABLE IF NOT EXISTS escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE RESTRICT,
  poster_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  executor_user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  poster_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  executor_wallet_id UUID REFERENCES wallets(id) ON DELETE RESTRICT,
  amount NUMERIC(20,4) NOT NULL CHECK (amount > 0),
  status escrow_status NOT NULL DEFAULT 'pending',
  release_type escrow_release_type,
  locked_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT escrows_state_consistency_chk CHECK (
    (status = 'pending' AND locked_at IS NULL AND released_at IS NULL AND refunded_at IS NULL AND release_type IS NULL)
    OR
    (status = 'locked' AND locked_at IS NOT NULL AND released_at IS NULL AND refunded_at IS NULL AND release_type IS NULL)
    OR
    (status = 'released' AND locked_at IS NOT NULL AND released_at IS NOT NULL AND refunded_at IS NULL
     AND release_type IN ('approval', 'auto_release', 'dispute_resolution'))
    OR
    (status = 'refunded' AND locked_at IS NOT NULL AND refunded_at IS NOT NULL AND released_at IS NULL
     AND release_type IN ('refund', 'dispute_resolution'))
  )
);

-- 4) disputes
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
  escrow_id UUID REFERENCES escrows(id) ON DELETE RESTRICT,
  filed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_admin_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  status dispute_status NOT NULL DEFAULT 'pending',
  reason_code TEXT NOT NULL,
  description TEXT NOT NULL,
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT disputes_resolution_consistency_chk CHECK (
    (status IN ('resolved', 'auto_resolved', 'dismissed') AND resolved_at IS NOT NULL)
    OR
    (status IN ('pending', 'under_review', 'escalated') AND resolved_at IS NULL)
  )
);

-- 5) ledger_entries (immutable double-entry records)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL,
  entry_seq SMALLINT NOT NULL,
  wallet_id UUID REFERENCES wallets(id) ON DELETE RESTRICT,
  escrow_id UUID REFERENCES escrows(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  account_code TEXT NOT NULL,
  direction ledger_direction NOT NULL,
  amount NUMERIC(20,4) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'BDT',
  external_reference TEXT,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ledger_entries_journal_seq_uniq UNIQUE (journal_id, entry_seq),
  CONSTRAINT ledger_entries_account_ref_chk CHECK (wallet_id IS NOT NULL OR escrow_id IS NOT NULL)
);

-- 6) idempotency_keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  endpoint TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_hash TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  http_status_code INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  CONSTRAINT idempotency_actor_endpoint_key_uniq UNIQUE (actor_user_id, endpoint, idempotency_key)
);

-- 7) withdrawal_requests (future-proof)
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  amount NUMERIC(20,4) NOT NULL CHECK (amount > 0),
  status withdrawal_status NOT NULL DEFAULT 'pending',
  idempotency_key TEXT,
  approved_by_admin_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  external_reference TEXT UNIQUE,
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT withdrawal_status_timestamps_chk CHECK (
    (status = 'pending' AND approved_at IS NULL AND processed_at IS NULL)
    OR
    (status IN ('approved', 'processing') AND approved_at IS NOT NULL)
    OR
    (status IN ('paid', 'failed', 'cancelled') AND processed_at IS NOT NULL)
  )
);

-- 8) webhook_events (future-proof)
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  signature TEXT,
  payload JSONB NOT NULL,
  status webhook_event_status NOT NULL DEFAULT 'received',
  related_escrow_id UUID REFERENCES escrows(id) ON DELETE RESTRICT,
  related_withdrawal_request_id UUID REFERENCES withdrawal_requests(id) ON DELETE RESTRICT,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT webhook_events_provider_event_uniq UNIQUE (provider, event_id)
);

COMMIT;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tasks_poster_user_id ON tasks(poster_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_executor_user_id ON tasks(executor_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

CREATE INDEX IF NOT EXISTS idx_escrows_task_id ON escrows(task_id);
CREATE INDEX IF NOT EXISTS idx_escrows_poster_wallet_id ON escrows(poster_wallet_id);
CREATE INDEX IF NOT EXISTS idx_escrows_executor_wallet_id ON escrows(executor_wallet_id);
CREATE INDEX IF NOT EXISTS idx_escrows_status ON escrows(status);
CREATE INDEX IF NOT EXISTS idx_escrows_locked_partial ON escrows(id) WHERE status = 'locked';
CREATE INDEX IF NOT EXISTS idx_escrows_status_task ON escrows(status, task_id);

CREATE INDEX IF NOT EXISTS idx_disputes_task_id ON disputes(task_id);
CREATE INDEX IF NOT EXISTS idx_disputes_escrow_id ON disputes(escrow_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status_created_at ON disputes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_assigned_admin_id ON disputes(assigned_admin_id);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_journal_id ON ledger_entries(journal_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_wallet_id_created_at ON ledger_entries(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_escrow_id_created_at ON ledger_entries(escrow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_idempotency_actor_endpoint_key ON idempotency_keys(actor_user_id, endpoint, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at ON idempotency_keys(expires_at);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_wallet_status ON withdrawal_requests(wallet_id, status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_status ON withdrawal_requests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status_received_at ON webhook_events(status, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_related_escrow ON webhook_events(related_escrow_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_related_withdrawal ON webhook_events(related_withdrawal_request_id);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_wallets_updated_at BEFORE UPDATE ON wallets
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_escrows_updated_at BEFORE UPDATE ON escrows
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_disputes_updated_at BEFORE UPDATE ON disputes
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_idempotency_updated_at BEFORE UPDATE ON idempotency_keys
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_withdrawal_requests_updated_at BEFORE UPDATE ON withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE FUNCTION fn_disputes_admin_role_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.assigned_admin_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = NEW.assigned_admin_id
        AND u.role = 'admin'
    ) THEN
      RAISE EXCEPTION 'assigned_admin_id must reference a user with role=admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_disputes_admin_role_guard
BEFORE INSERT OR UPDATE OF assigned_admin_id ON disputes
FOR EACH ROW EXECUTE FUNCTION fn_disputes_admin_role_guard();

CREATE OR REPLACE FUNCTION fn_escrow_monotonic_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'locked' AND NEW.locked_at IS NULL THEN
      NEW.locked_at = NOW();
    ELSIF NEW.status IN ('released', 'refunded') THEN
      RAISE EXCEPTION 'escrow cannot be inserted directly as terminal state';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'locked' THEN
    NEW.locked_at = COALESCE(NEW.locked_at, NOW());
    RETURN NEW;
  END IF;

  IF OLD.status = 'locked' AND NEW.status = 'released' THEN
    IF NEW.release_type NOT IN ('approval', 'auto_release', 'dispute_resolution') THEN
      RAISE EXCEPTION 'release_type invalid for released escrow';
    END IF;
    NEW.released_at = COALESCE(NEW.released_at, NOW());
    RETURN NEW;
  END IF;

  IF OLD.status = 'locked' AND NEW.status = 'refunded' THEN
    IF NEW.release_type NOT IN ('refund', 'dispute_resolution') THEN
      RAISE EXCEPTION 'release_type invalid for refunded escrow';
    END IF;
    NEW.refunded_at = COALESCE(NEW.refunded_at, NOW());
    RETURN NEW;
  END IF;

  IF OLD.status IN ('released', 'refunded') THEN
    RAISE EXCEPTION 'escrow status is terminal: %', OLD.status;
  END IF;

  RAISE EXCEPTION 'invalid escrow status transition: % -> %', OLD.status, NEW.status;
END;
$$;

CREATE TRIGGER trg_escrow_monotonic_guard
BEFORE INSERT OR UPDATE OF status, release_type, locked_at, released_at, refunded_at
ON escrows
FOR EACH ROW EXECUTE FUNCTION fn_escrow_monotonic_guard();

CREATE OR REPLACE FUNCTION fn_ledger_immutable_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'ledger_entries is immutable: DELETE forbidden';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'ledger_entries is immutable: UPDATE forbidden';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ledger_immutable_guard
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION fn_ledger_immutable_guard();

CREATE OR REPLACE FUNCTION fn_ledger_journal_balance_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_journal_id UUID;
  v_row_count BIGINT;
  v_net NUMERIC(20,4);
BEGIN
  v_journal_id := NEW.journal_id;

  SELECT
    COUNT(*),
    COALESCE(SUM(
      CASE
        WHEN direction = 'credit' THEN amount
        WHEN direction = 'debit'  THEN -amount
      END
    ), 0)
  INTO v_row_count, v_net
  FROM ledger_entries
  WHERE journal_id = v_journal_id;

  IF v_row_count < 2 THEN
    RAISE EXCEPTION 'journal % must contain at least 2 ledger rows', v_journal_id;
  END IF;

  IF v_net <> 0 THEN
    RAISE EXCEPTION 'journal % is unbalanced; net=%', v_journal_id, v_net;
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_ledger_journal_balance_guard
AFTER INSERT ON ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION fn_ledger_journal_balance_guard();

-- ============================================================================
-- RLS BASELINE (DENY CLIENT WRITES)
-- ============================================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users',
    'tasks',
    'wallets',
    'escrows',
    'disputes',
    'ledger_entries',
    'idempotency_keys',
    'withdrawal_requests',
    'webhook_events'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- Notes:
-- 1) Backend service role performs financial writes.
-- 2) Dedicated per-role SELECT policies can be added in /database/rls scripts.
-- 3) Recommended financial transaction lock order:
--      a) escrows (FOR UPDATE)
--      b) wallets (FOR UPDATE)
--      c) ledger_entries inserts
-- 4) Recommended isolation for money movement: SERIALIZABLE.

