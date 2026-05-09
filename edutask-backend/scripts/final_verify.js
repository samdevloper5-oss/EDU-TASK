#!/usr/bin/env node

/**
 * Final financial integrity verifier.
 * Exit code 0 => SAFE
 * Exit code 1 => FAILED
 */

const { pool } = require("../src/config/db");

const checks = [
  {
    name: "orphan_ledger_entries",
    sql: `
      SELECT 1
      FROM ledger_entries le
      LEFT JOIN wallets w ON w.id = le.wallet_id
      LEFT JOIN escrows e ON e.id = le.escrow_id
      WHERE (le.wallet_id IS NOT NULL AND w.id IS NULL)
         OR (le.escrow_id IS NOT NULL AND e.id IS NULL)
      LIMIT 1
    `,
  },
  {
    name: "journal_imbalance",
    sql: `
      SELECT 1
      FROM ledger_entries
      GROUP BY journal_id
      HAVING SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END)
          <> SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END)
      LIMIT 1
    `,
  },
  {
    name: "wallet_vs_ledger_delta",
    sql: `
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
      SELECT 1
      FROM wallets w
      LEFT JOIN ledger_rollup l ON l.wallet_id = w.id
      WHERE w.balance <> COALESCE(l.ledger_balance, 0)
         OR w.escrow_balance <> COALESCE(l.ledger_escrow_balance, 0)
      LIMIT 1
    `,
  },
  {
    name: "negative_wallet_balance",
    sql: `
      SELECT 1
      FROM wallets
      WHERE balance < 0 OR escrow_balance < 0
      LIMIT 1
    `,
  },
  {
    name: "escrow_locked_sum_vs_wallet_escrow_balance",
    sql: `
      WITH locked_by_wallet AS (
        SELECT
          poster_wallet_id AS wallet_id,
          COALESCE(SUM(amount), 0) AS locked_sum
        FROM escrows
        WHERE status = 'locked'
        GROUP BY poster_wallet_id
      )
      SELECT 1
      FROM wallets w
      LEFT JOIN locked_by_wallet l ON l.wallet_id = w.id
      WHERE w.escrow_balance <> COALESCE(l.locked_sum, 0)
      LIMIT 1
    `,
  },
];

async function main() {
  const results = [];

  for (const check of checks) {
    const result = await pool.query(check.sql);
    results.push({
      check: check.name,
      pass: result.rowCount === 0,
      rowCount: result.rowCount,
    });
  }

  const failed = results.filter((x) => !x.pass);
  if (failed.length === 0) {
    console.log("FINANCIAL STATUS: SAFE");
    process.exitCode = 0;
    return;
  }

  console.error("FINANCIAL STATUS: FAILED");
  console.error(JSON.stringify(results, null, 2));
  process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("FINANCIAL STATUS: FAILED");
    console.error(error.message || String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
