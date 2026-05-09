-- ============================================================================
-- EDUTASK Schema v4 Full Bootstrap (authoritative from-scratch setup)
-- PostgreSQL 17 / Supabase
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

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_type') THEN
    CREATE TYPE task_type AS ENUM ('paid', 'volunteer');
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
    CREATE TYPE escrow_release_type AS ENUM (
      'approval',
      'auto_release',
      'refund',
      'dispute_resolution'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispute_status') THEN
    CREATE TYPE dispute_status AS ENUM (
      'pending',
      'under_review',
      'auto_resolved',
      'resolved',
      'escalated'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_direction') THEN
    CREATE TYPE ledger_direction AS ENUM ('debit', 'credit');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status') THEN
    CREATE TYPE withdrawal_status AS ENUM (
      'pending',
      'approved',
      'processing',
      'paid',
      'failed',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_verification_status') THEN
    CREATE TYPE profile_verification_status AS ENUM (
      'unverified',
      'pending',
      'verified',
      'rejected'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'webhook_event_status') THEN
    CREATE TYPE webhook_event_status AS ENUM ('received', 'processed', 'failed', 'ignored');
  END IF;
END$$;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  student_id TEXT NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'student',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  institution TEXT,
  department TEXT,
  bio TEXT,
  profile_image_url TEXT,
  verification_document_url TEXT,
  verification_status profile_verification_status NOT NULL DEFAULT 'unverified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  task_type task_type NOT NULL,
  status task_status NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  scope TEXT NOT NULL,
  deliverables TEXT NOT NULL,
  acceptance_criteria TEXT NOT NULL,
  required_members INTEGER,
  budget NUMERIC(20,4),
  selected_executor_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  deadline TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  review_window_hours INTEGER,
  max_revisions INTEGER,
  application_deadline TIMESTAMPTZ,
  version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tasks_budget_rule_chk CHECK (
    (task_type = 'paid' AND budget IS NOT NULL AND budget > 0 AND required_members IS NULL)
    OR
    (task_type = 'volunteer' AND required_members IS NOT NULL AND required_members > 0 AND budget IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  balance NUMERIC(20,4) NOT NULL DEFAULT 0,
  escrow_balance NUMERIC(20,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wallets_balance_non_negative_chk CHECK (balance >= 0),
  CONSTRAINT wallets_escrow_balance_non_negative_chk CHECK (escrow_balance >= 0)
);

CREATE TABLE IF NOT EXISTS escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE RESTRICT,
  poster_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  executor_wallet_id UUID REFERENCES wallets(id) ON DELETE RESTRICT,
  amount NUMERIC(20,4) NOT NULL CHECK (amount > 0),
  status escrow_status NOT NULL DEFAULT 'locked',
  release_type escrow_release_type,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT escrows_state_consistency_chk CHECK (
    (status = 'locked' AND released_at IS NULL AND release_type IS NULL)
    OR
    (status = 'released' AND released_at IS NOT NULL AND release_type IN ('approval','auto_release','dispute_resolution') AND executor_wallet_id IS NOT NULL)
    OR
    (status = 'refunded' AND released_at IS NOT NULL AND release_type IN ('refund','dispute_resolution'))
  )
);

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE RESTRICT,
  escrow_id UUID REFERENCES escrows(id) ON DELETE RESTRICT,
  filed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_admin_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  dispute_type TEXT NOT NULL,
  status dispute_status NOT NULL DEFAULT 'pending',
  description TEXT NOT NULL,
  evidence JSONB,
  auto_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  auto_resolution_reason TEXT,
  admin_decision TEXT,
  admin_decision_fund_allocation JSONB,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  endpoint TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_hash TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  CONSTRAINT idempotency_user_endpoint_key_uniq UNIQUE (user_id, endpoint, idempotency_key)
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  amount NUMERIC(20,4) NOT NULL CHECK (amount > 0),
  status withdrawal_status NOT NULL DEFAULT 'pending',
  idempotency_key TEXT,
  approved_by_admin_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  external_reference TEXT,
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- Supporting tables used by existing backend read/write paths.
CREATE TABLE IF NOT EXISTS task_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  cover_letter TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, applicant_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE RESTRICT,
  submitted_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  submission_content TEXT NOT NULL CHECK (btrim(submission_content) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  message_text TEXT NOT NULL DEFAULT '',
  attachment_url TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tasks_poster_id ON tasks(poster_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);

CREATE INDEX IF NOT EXISTS idx_escrows_task_id ON escrows(task_id);
CREATE INDEX IF NOT EXISTS idx_escrows_poster_wallet_id ON escrows(poster_wallet_id);
CREATE INDEX IF NOT EXISTS idx_escrows_executor_wallet_id ON escrows(executor_wallet_id);
CREATE INDEX IF NOT EXISTS idx_escrows_status_created_hot
  ON escrows(status, created_at DESC)
  WHERE status IN ('pending', 'locked');

CREATE INDEX IF NOT EXISTS idx_disputes_task_id ON disputes(task_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status_created_hot
  ON disputes(status, created_at DESC)
  WHERE status IN ('pending', 'under_review', 'escalated');

CREATE INDEX IF NOT EXISTS idx_ledger_entries_journal_id ON ledger_entries(journal_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_wallet_created_hot
  ON ledger_entries(wallet_id, created_at DESC)
  WHERE wallet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_entries_escrow_created ON ledger_entries(escrow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_idempotency_user_endpoint_key
  ON idempotency_keys(user_id, endpoint, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires_at
  ON idempotency_keys(expires_at);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_wallet_status
  ON withdrawal_requests(wallet_id, status);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status_received_at
  ON webhook_events(status, received_at DESC);

-- ============================================================================
-- UPDATED_AT TRIGGER
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

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_wallets_updated_at ON wallets;
CREATE TRIGGER trg_wallets_updated_at BEFORE UPDATE ON wallets
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_escrows_updated_at ON escrows;
CREATE TRIGGER trg_escrows_updated_at BEFORE UPDATE ON escrows
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_disputes_updated_at ON disputes;
CREATE TRIGGER trg_disputes_updated_at BEFORE UPDATE ON disputes
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_idempotency_updated_at ON idempotency_keys;
CREATE TRIGGER trg_idempotency_updated_at BEFORE UPDATE ON idempotency_keys
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_withdrawal_requests_updated_at ON withdrawal_requests;
CREATE TRIGGER trg_withdrawal_requests_updated_at BEFORE UPDATE ON withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================================
-- HARDENING RULES
-- ============================================================================

-- Prevent negative wallets early.
CREATE OR REPLACE FUNCTION prevent_negative_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.balance < 0 OR NEW.escrow_balance < 0 THEN
    RAISE EXCEPTION 'negative wallet balances are not allowed'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_negative_wallet ON wallets;
CREATE TRIGGER trg_prevent_negative_wallet
BEFORE INSERT OR UPDATE ON wallets
FOR EACH ROW EXECUTE FUNCTION prevent_negative_wallet();

-- No delete on financial tables.
CREATE OR REPLACE FUNCTION fn_block_financial_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'delete forbidden on financial table %', TG_TABLE_NAME
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_block_wallet_delete ON wallets;
CREATE TRIGGER trg_block_wallet_delete
BEFORE DELETE ON wallets
FOR EACH ROW EXECUTE FUNCTION fn_block_financial_delete();

DROP TRIGGER IF EXISTS trg_block_ledger_delete ON ledger_entries;
CREATE TRIGGER trg_block_ledger_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION fn_block_financial_delete();

DROP TRIGGER IF EXISTS trg_block_escrow_delete ON escrows;
CREATE TRIGGER trg_block_escrow_delete
BEFORE DELETE ON escrows
FOR EACH ROW EXECUTE FUNCTION fn_block_financial_delete();

-- Ledger immutable (no update, no delete).
CREATE OR REPLACE FUNCTION fn_ledger_immutable_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries is immutable'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_immutable_guard ON ledger_entries;
CREATE TRIGGER trg_ledger_immutable_guard
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION fn_ledger_immutable_guard();

-- Escrow terminal immutability + monotonic transition.
CREATE OR REPLACE FUNCTION fn_escrow_terminal_immutability_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IN ('released', 'refunded') THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.poster_wallet_id IS DISTINCT FROM OLD.poster_wallet_id
       OR NEW.executor_wallet_id IS DISTINCT FROM OLD.executor_wallet_id
       OR NEW.release_type IS DISTINCT FROM OLD.release_type
       OR NEW.task_id IS DISTINCT FROM OLD.task_id
       OR NEW.released_at IS DISTINCT FROM OLD.released_at THEN
      RAISE EXCEPTION 'terminal escrow rows are immutable'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending' AND NEW.status NOT IN ('pending', 'locked') THEN
    RAISE EXCEPTION 'invalid escrow transition: % -> %', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;
  IF OLD.status = 'locked' AND NEW.status NOT IN ('locked', 'released', 'refunded') THEN
    RAISE EXCEPTION 'invalid escrow transition: % -> %', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;
  IF OLD.status = 'released' AND NEW.status <> 'released' THEN
    RAISE EXCEPTION 'invalid escrow transition: released -> %', NEW.status
      USING ERRCODE = '23514';
  END IF;
  IF OLD.status = 'refunded' AND NEW.status <> 'refunded' THEN
    RAISE EXCEPTION 'invalid escrow transition: refunded -> %', NEW.status
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_escrow_terminal_immutability_guard ON escrows;
CREATE TRIGGER trg_escrow_terminal_immutability_guard
BEFORE UPDATE ON escrows
FOR EACH ROW EXECUTE FUNCTION fn_escrow_terminal_immutability_guard();

-- Journal balance guard (must net to zero per journal_id).
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
        WHEN direction = 'debit' THEN -amount
      END
    ), 0)
  INTO v_row_count, v_net
  FROM ledger_entries
  WHERE journal_id = v_journal_id;

  IF v_row_count < 2 THEN
    RAISE EXCEPTION 'journal % must contain at least two rows', v_journal_id;
  END IF;

  IF v_net <> 0 THEN
    RAISE EXCEPTION 'journal % is unbalanced (net=%)', v_journal_id, v_net;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_journal_balance_guard ON ledger_entries;
CREATE CONSTRAINT TRIGGER trg_ledger_journal_balance_guard
AFTER INSERT ON ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION fn_ledger_journal_balance_guard();

-- Reconciliation view.
CREATE OR REPLACE VIEW v_financial_reconciliation AS
WITH ledger_rollup AS (
  SELECT
    wallet_id,
    COALESCE(
      SUM(CASE
        WHEN account_code = 'wallet_available' AND direction = 'credit' THEN amount
        WHEN account_code = 'wallet_available' AND direction = 'debit' THEN -amount
        ELSE 0
      END), 0
    ) AS ledger_balance,
    COALESCE(
      SUM(CASE
        WHEN account_code = 'wallet_escrow' AND direction = 'credit' THEN amount
        WHEN account_code = 'wallet_escrow' AND direction = 'debit' THEN -amount
        ELSE 0
      END), 0
    ) AS ledger_escrow_balance
  FROM ledger_entries
  WHERE wallet_id IS NOT NULL
  GROUP BY wallet_id
)
SELECT
  w.id AS wallet_id,
  w.user_id,
  w.balance AS wallet_balance,
  w.escrow_balance AS wallet_escrow_balance,
  COALESCE(l.ledger_balance, 0) AS ledger_balance,
  COALESCE(l.ledger_escrow_balance, 0) AS ledger_escrow_balance,
  w.balance - COALESCE(l.ledger_balance, 0) AS balance_delta,
  w.escrow_balance - COALESCE(l.ledger_escrow_balance, 0) AS escrow_balance_delta
FROM wallets w
LEFT JOIN ledger_rollup l ON l.wallet_id = w.id;

-- RLS baseline (force deny-by-default for client roles).
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users',
    'profiles',
    'tasks',
    'wallets',
    'escrows',
    'disputes',
    'ledger_entries',
    'idempotency_keys',
    'withdrawal_requests',
    'webhook_events',
    'task_applications',
    'submissions',
    'chat_messages',
    'audit_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM anon, authenticated', t);
  END LOOP;
END$$;

-- Lock order contract for financial service code:
-- escrows -> tasks -> wallets -> ledger_entries

