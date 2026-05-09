-- 202602210002_financial_drift_hardening.sql
-- Purpose:
--   Prevent wallet balance drift and harden invariants without changing business semantics.
-- Notes:
--   - Wallet balance columns cannot be changed unless service code sets
--     transaction-local guard flag: app.allow_wallet_balance_update='on'.
--   - Ledger journal balance guard is (re)installed as DEFERRABLE INITIALLY DEFERRED.

SET search_path = public;

-- 1) Enforce essential column-level invariants.
ALTER TABLE wallets
  ALTER COLUMN balance SET NOT NULL,
  ALTER COLUMN escrow_balance SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'wallets_balance_non_negative_chk'
      AND conrelid = 'wallets'::regclass
  ) THEN
    ALTER TABLE wallets
      ADD CONSTRAINT wallets_balance_non_negative_chk CHECK (balance >= 0) NOT VALID;
    ALTER TABLE wallets VALIDATE CONSTRAINT wallets_balance_non_negative_chk;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'wallets_escrow_balance_non_negative_chk'
      AND conrelid = 'wallets'::regclass
  ) THEN
    ALTER TABLE wallets
      ADD CONSTRAINT wallets_escrow_balance_non_negative_chk CHECK (escrow_balance >= 0) NOT VALID;
    ALTER TABLE wallets VALIDATE CONSTRAINT wallets_escrow_balance_non_negative_chk;
  END IF;
END $$;

-- 2) Reject direct/manual wallet balance mutations.
-- Service code must set: SELECT set_config('app.allow_wallet_balance_update', 'on', true);
CREATE OR REPLACE FUNCTION fn_wallet_balance_mutation_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_allow TEXT;
BEGIN
  IF NEW.balance IS DISTINCT FROM OLD.balance
     OR NEW.escrow_balance IS DISTINCT FROM OLD.escrow_balance THEN
    v_allow := current_setting('app.allow_wallet_balance_update', true);
    IF COALESCE(v_allow, 'off') <> 'on' THEN
      RAISE EXCEPTION
        'direct wallet balance mutation blocked; ledger-authoritative path required'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallet_balance_mutation_guard ON wallets;
CREATE TRIGGER trg_wallet_balance_mutation_guard
BEFORE UPDATE OF balance, escrow_balance ON wallets
FOR EACH ROW
EXECUTE FUNCTION fn_wallet_balance_mutation_guard();

-- 3) Ensure journal-level double-entry invariant guard exists.
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
    RAISE EXCEPTION 'journal % must contain at least two rows', v_journal_id
      USING ERRCODE = '23514';
  END IF;

  IF v_net <> 0 THEN
    RAISE EXCEPTION 'journal % is unbalanced (net=%)', v_journal_id, v_net
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_journal_balance_guard ON ledger_entries;
CREATE CONSTRAINT TRIGGER trg_ledger_journal_balance_guard
AFTER INSERT ON ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION fn_ledger_journal_balance_guard();

-- 4) Reconciliation view used by operational checks.
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

-- 5) Ensure hot-path indexes for FK and ledger lookups.
CREATE INDEX IF NOT EXISTS idx_ledger_entries_wallet_id
  ON ledger_entries(wallet_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_escrow_id
  ON ledger_entries(escrow_id);
CREATE INDEX IF NOT EXISTS idx_escrows_task_id
  ON escrows(task_id);
CREATE INDEX IF NOT EXISTS idx_disputes_task_id
  ON disputes(task_id);
