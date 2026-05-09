-- All queries in this file must return zero rows on a healthy system.

-- 1) Journal imbalance detection: debit and credit sums must match per journal_id.
SELECT
  journal_id,
  SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END) AS credits,
  SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END) AS debits
FROM ledger_entries
GROUP BY journal_id
HAVING SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END)
    <> SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END);

-- 2) Wallet snapshot vs ledger-derived balances.
SELECT *
FROM v_financial_reconciliation
WHERE balance_delta <> 0
   OR escrow_balance_delta <> 0;

-- 3) Escrow locked total vs wallets.escrow_balance.
WITH locked_by_wallet AS (
  SELECT
    poster_wallet_id AS wallet_id,
    COALESCE(SUM(amount), 0) AS locked_sum
  FROM escrows
  WHERE status = 'locked'
  GROUP BY poster_wallet_id
)
SELECT
  w.id AS wallet_id,
  w.escrow_balance,
  COALESCE(l.locked_sum, 0) AS locked_sum
FROM wallets w
LEFT JOIN locked_by_wallet l ON l.wallet_id = w.id
WHERE w.escrow_balance <> COALESCE(l.locked_sum, 0);

-- 4) Orphan ledger entries: references must resolve when present.
SELECT
  le.id AS ledger_entry_id,
  le.wallet_id,
  le.escrow_id
FROM ledger_entries le
LEFT JOIN wallets w ON w.id = le.wallet_id
LEFT JOIN escrows e ON e.id = le.escrow_id
WHERE (le.wallet_id IS NOT NULL AND w.id IS NULL)
   OR (le.escrow_id IS NOT NULL AND e.id IS NULL);

