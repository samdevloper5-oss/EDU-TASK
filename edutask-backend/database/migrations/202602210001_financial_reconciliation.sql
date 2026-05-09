-- 202602210001_financial_reconciliation.sql
-- Purpose:
--   One-time deterministic reconciliation to align wallet snapshots with
--   authoritative ledger history.
-- Invariants:
--   - Inserts only balanced double-entry journals.
--   - Does not mutate wallet rows.
--   - Idempotent: re-running becomes a no-op once deltas are zero.

BEGIN;

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
),
deltas AS (
  SELECT
    w.id AS wallet_id,
    (w.balance - COALESCE(l.ledger_balance, 0))::numeric(20,4) AS available_delta,
    (w.escrow_balance - COALESCE(l.ledger_escrow_balance, 0))::numeric(20,4) AS escrow_delta
  FROM wallets w
  LEFT JOIN ledger_rollup l ON l.wallet_id = w.id
),
wallets_to_fix AS (
  SELECT
    wallet_id,
    available_delta,
    escrow_delta,
    gen_random_uuid() AS journal_id
  FROM deltas
  WHERE available_delta <> 0
     OR escrow_delta <> 0
),
entries AS (
  SELECT
    w.journal_id,
    e.entry_seq,
    w.wallet_id,
    e.account_code,
    e.direction,
    e.amount
  FROM wallets_to_fix w
  CROSS JOIN LATERAL (
    SELECT *
    FROM (
      VALUES
        (CASE WHEN w.available_delta <> 0 THEN 1 ELSE NULL END,
         'wallet_available'::text,
         CASE WHEN w.available_delta > 0 THEN 'credit'::ledger_direction ELSE 'debit'::ledger_direction END,
         abs(w.available_delta)),
        (CASE WHEN w.available_delta <> 0 THEN 2 ELSE NULL END,
         'opening_equity'::text,
         CASE WHEN w.available_delta > 0 THEN 'debit'::ledger_direction ELSE 'credit'::ledger_direction END,
         abs(w.available_delta)),
        (CASE WHEN w.escrow_delta <> 0 AND w.available_delta <> 0 THEN 3 WHEN w.escrow_delta <> 0 THEN 1 ELSE NULL END,
         'wallet_escrow'::text,
         CASE WHEN w.escrow_delta > 0 THEN 'credit'::ledger_direction ELSE 'debit'::ledger_direction END,
         abs(w.escrow_delta)),
        (CASE WHEN w.escrow_delta <> 0 AND w.available_delta <> 0 THEN 4 WHEN w.escrow_delta <> 0 THEN 2 ELSE NULL END,
         'opening_equity'::text,
         CASE WHEN w.escrow_delta > 0 THEN 'debit'::ledger_direction ELSE 'credit'::ledger_direction END,
         abs(w.escrow_delta))
    ) AS v(entry_seq, account_code, direction, amount)
    WHERE entry_seq IS NOT NULL
      AND amount > 0
  ) e
)
INSERT INTO ledger_entries (
  journal_id,
  entry_seq,
  wallet_id,
  escrow_id,
  user_id,
  account_code,
  direction,
  amount,
  currency,
  external_reference,
  description,
  metadata,
  created_by
)
SELECT
  journal_id,
  entry_seq,
  wallet_id,
  NULL,
  NULL,
  account_code,
  direction,
  amount,
  'BDT',
  NULL,
  'wallet ledger reconciliation backfill',
  jsonb_build_object('source', '202602210001_financial_reconciliation', 'at', NOW()),
  NULL
FROM entries
ORDER BY journal_id, entry_seq;

COMMIT;
