-- Reconciliation and integrity checks
-- Run in staging/prod as read-only validation.

-- 1) Wallet non-negative invariant
SELECT COUNT(*) AS negative_wallet_rows
FROM wallets
WHERE balance < 0 OR escrow_balance < 0;

-- 2) Escrow lock consistency:
-- wallets.escrow_balance must equal sum(locked escrows) per poster wallet.
SELECT
  x.wallet_id,
  x.escrow_balance,
  x.locked_sum
FROM (
  SELECT
    w.id AS wallet_id,
    w.escrow_balance,
    COALESCE(SUM(e.amount) FILTER (WHERE e.status = 'locked'), 0) AS locked_sum
  FROM wallets w
  LEFT JOIN escrows e ON e.poster_wallet_id = w.id
  GROUP BY w.id, w.escrow_balance
) x
WHERE x.escrow_balance <> x.locked_sum
ORDER BY x.wallet_id;

-- 3) Orphan escrow references from wallet transactions (v2 model)
SELECT COUNT(*) AS orphan_wallet_tx_escrow_refs
FROM wallet_transactions wt
LEFT JOIN escrows e ON e.id = wt.related_escrow_id
WHERE wt.related_escrow_id IS NOT NULL
  AND e.id IS NULL;

-- 4) Wallet latest-state vs last wallet transaction state
WITH last_tx AS (
  SELECT DISTINCT ON (wallet_id)
    wallet_id,
    balance_after,
    escrow_balance_after
  FROM wallet_transactions
  ORDER BY wallet_id, created_at DESC, id DESC
)
SELECT
  w.id AS wallet_id,
  w.balance,
  w.escrow_balance,
  lt.balance_after,
  lt.escrow_balance_after
FROM wallets w
JOIN last_tx lt ON lt.wallet_id = w.id
WHERE w.balance <> lt.balance_after
   OR w.escrow_balance <> lt.escrow_balance_after
ORDER BY w.id;

-- 5) Journal balance checks (if ledger_entries is in use)
SELECT
  j.journal_id,
  j.row_count,
  j.net_amount
FROM (
  SELECT
    journal_id,
    COUNT(*) AS row_count,
    SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END) AS net_amount
  FROM ledger_entries
  GROUP BY journal_id
) j
WHERE j.row_count < 2
   OR j.net_amount <> 0
ORDER BY j.journal_id;

-- 6) Deadlock and rollback counters from pg_stat_database
SELECT
  datname,
  deadlocks,
  xact_commit,
  xact_rollback
FROM pg_stat_database
WHERE datname = current_database();

