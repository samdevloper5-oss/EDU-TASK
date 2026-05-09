-- Phase 3 hardening for production finance safety.
-- Run with SUPABASE_DB_DIRECT_URL. CREATE INDEX CONCURRENTLY statements
-- must execute outside an explicit transaction block.

SET search_path = public;

-- 1) Financial foreign keys must be RESTRICT on delete.
ALTER TABLE IF EXISTS escrows DROP CONSTRAINT IF EXISTS escrows_task_id_fkey;
ALTER TABLE IF EXISTS escrows
  ADD CONSTRAINT escrows_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE IF EXISTS escrows VALIDATE CONSTRAINT escrows_task_id_fkey;

ALTER TABLE IF EXISTS escrows DROP CONSTRAINT IF EXISTS escrows_poster_wallet_id_fkey;
ALTER TABLE IF EXISTS escrows
  ADD CONSTRAINT escrows_poster_wallet_id_fkey
  FOREIGN KEY (poster_wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE IF EXISTS escrows VALIDATE CONSTRAINT escrows_poster_wallet_id_fkey;

ALTER TABLE IF EXISTS escrows DROP CONSTRAINT IF EXISTS escrows_executor_wallet_id_fkey;
ALTER TABLE IF EXISTS escrows
  ADD CONSTRAINT escrows_executor_wallet_id_fkey
  FOREIGN KEY (executor_wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE IF EXISTS escrows VALIDATE CONSTRAINT escrows_executor_wallet_id_fkey;

ALTER TABLE IF EXISTS disputes DROP CONSTRAINT IF EXISTS disputes_task_id_fkey;
ALTER TABLE IF EXISTS disputes
  ADD CONSTRAINT disputes_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE IF EXISTS disputes VALIDATE CONSTRAINT disputes_task_id_fkey;

ALTER TABLE IF EXISTS disputes DROP CONSTRAINT IF EXISTS disputes_escrow_id_fkey;
ALTER TABLE IF EXISTS disputes
  ADD CONSTRAINT disputes_escrow_id_fkey
  FOREIGN KEY (escrow_id) REFERENCES escrows(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE IF EXISTS disputes VALIDATE CONSTRAINT disputes_escrow_id_fkey;

ALTER TABLE IF EXISTS ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_wallet_id_fkey;
ALTER TABLE IF EXISTS ledger_entries
  ADD CONSTRAINT ledger_entries_wallet_id_fkey
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE IF EXISTS ledger_entries VALIDATE CONSTRAINT ledger_entries_wallet_id_fkey;

ALTER TABLE IF EXISTS ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_escrow_id_fkey;
ALTER TABLE IF EXISTS ledger_entries
  ADD CONSTRAINT ledger_entries_escrow_id_fkey
  FOREIGN KEY (escrow_id) REFERENCES escrows(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE IF EXISTS ledger_entries VALIDATE CONSTRAINT ledger_entries_escrow_id_fkey;

-- 2) Guard trigger to stop negative balances before hitting CHECK constraints.
CREATE OR REPLACE FUNCTION fn_wallet_non_negative_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.balance < 0 THEN
    RAISE EXCEPTION 'wallet balance cannot be negative'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.escrow_balance < 0 THEN
    RAISE EXCEPTION 'wallet escrow_balance cannot be negative'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallet_non_negative_guard ON wallets;
CREATE TRIGGER trg_wallet_non_negative_guard
BEFORE INSERT OR UPDATE ON wallets
FOR EACH ROW
EXECUTE FUNCTION fn_wallet_non_negative_guard();

-- 3) Disallow DELETE on financial core tables.
CREATE OR REPLACE FUNCTION fn_financial_delete_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% rows are immutable and cannot be deleted', TG_TABLE_NAME
    USING ERRCODE = '23503';
END;
$$;

DROP TRIGGER IF EXISTS trg_wallets_delete_guard ON wallets;
CREATE TRIGGER trg_wallets_delete_guard
BEFORE DELETE ON wallets
FOR EACH ROW
EXECUTE FUNCTION fn_financial_delete_guard();

DROP TRIGGER IF EXISTS trg_ledger_entries_delete_guard ON ledger_entries;
CREATE TRIGGER trg_ledger_entries_delete_guard
BEFORE DELETE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION fn_financial_delete_guard();

DROP TRIGGER IF EXISTS trg_escrows_delete_guard ON escrows;
CREATE TRIGGER trg_escrows_delete_guard
BEFORE DELETE ON escrows
FOR EACH ROW
EXECUTE FUNCTION fn_financial_delete_guard();

-- 4) Escrow monotonic transition + terminal immutability enforcement.
CREATE OR REPLACE FUNCTION fn_escrow_state_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Terminal rows are immutable for financial fields.
  IF OLD.status IN ('released', 'refunded') THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.poster_wallet_id IS DISTINCT FROM OLD.poster_wallet_id
       OR NEW.executor_wallet_id IS DISTINCT FROM OLD.executor_wallet_id
       OR NEW.release_type IS DISTINCT FROM OLD.release_type
       OR NEW.task_id IS DISTINCT FROM OLD.task_id
       OR NEW.released_at IS DISTINCT FROM OLD.released_at
       OR NEW.refunded_at IS DISTINCT FROM OLD.refunded_at
       OR NEW.locked_at IS DISTINCT FROM OLD.locked_at THEN
      RAISE EXCEPTION 'terminal escrow rows are immutable'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  -- Monotonic transition rules.
  IF OLD.status = 'pending' AND NEW.status NOT IN ('pending', 'locked') THEN
    RAISE EXCEPTION 'invalid escrow transition pending -> %', NEW.status
      USING ERRCODE = '23514';
  END IF;
  IF OLD.status = 'locked' AND NEW.status NOT IN ('locked', 'released', 'refunded') THEN
    RAISE EXCEPTION 'invalid escrow transition locked -> %', NEW.status
      USING ERRCODE = '23514';
  END IF;
  IF OLD.status = 'released' AND NEW.status <> 'released' THEN
    RAISE EXCEPTION 'invalid escrow transition released -> %', NEW.status
      USING ERRCODE = '23514';
  END IF;
  IF OLD.status = 'refunded' AND NEW.status <> 'refunded' THEN
    RAISE EXCEPTION 'invalid escrow transition refunded -> %', NEW.status
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_escrow_state_guard ON escrows;
CREATE TRIGGER trg_escrow_state_guard
BEFORE UPDATE ON escrows
FOR EACH ROW
EXECUTE FUNCTION fn_escrow_state_guard();

-- 5) Reconciliation view (wallet snapshot vs ledger-derived balances).
CREATE OR REPLACE VIEW v_financial_reconciliation AS
WITH ledger_rollup AS (
  SELECT
    wallet_id,
    COALESCE(
      SUM(
        CASE
          WHEN account_code = 'wallet_available' AND direction = 'credit' THEN amount
          WHEN account_code = 'wallet_available' AND direction = 'debit' THEN -amount
          ELSE 0
        END
      ),
      0
    ) AS ledger_balance,
    COALESCE(
      SUM(
        CASE
          WHEN account_code = 'wallet_escrow' AND direction = 'credit' THEN amount
          WHEN account_code = 'wallet_escrow' AND direction = 'debit' THEN -amount
          ELSE 0
        END
      ),
      0
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

-- 6) Hot-path partial indexes.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_escrows_status_created_hot
  ON escrows(status, created_at DESC)
  WHERE status IN ('pending', 'locked');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_disputes_status_created_hot
  ON disputes(status, created_at DESC)
  WHERE status IN ('pending', 'under_review', 'escalated');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ledger_entries_wallet_created_hot
  ON ledger_entries(wallet_id, created_at DESC)
  WHERE wallet_id IS NOT NULL;

