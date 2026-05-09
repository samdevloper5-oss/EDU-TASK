#!/usr/bin/env node
/**
 * Financial concurrency validation runner.
 *
 * Simulates:
 * - 100 concurrent escrow releases
 * - 100 concurrent escrow refunds
 * - 100 concurrent dispute creations
 *
 * Requirements:
 * - Provide case payloads via env JSON:
 *   LOAD_RELEASE_CASES_JSON
 *   LOAD_REFUND_CASES_JSON
 *   LOAD_DISPUTE_CASES_JSON
 */

const TARGET_CONCURRENCY = 100;

function parseJsonEnv(name) {
  const raw = process.env[name];
  if (!raw) {
    throw new Error(`${name} is required.`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${name} must be valid JSON.`);
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`${name} must be a non-empty JSON array.`);
  }
  return parsed;
}

function expandToTarget(cases) {
  const expanded = [];
  for (let i = 0; i < TARGET_CONCURRENCY; i += 1) {
    expanded.push(cases[i % cases.length]);
  }
  return expanded;
}

async function runBatch(name, payloads, handler) {
  const startedAt = Date.now();
  const settled = await Promise.allSettled(payloads.map((p) => handler(p)));
  const success = settled.filter((x) => x.status === "fulfilled").length;
  const failed = settled.length - success;
  const failures = settled
    .filter((x) => x.status === "rejected")
    .slice(0, 10)
    .map((x) => x.reason && x.reason.message ? x.reason.message : String(x.reason));

  return {
    name,
    total: settled.length,
    success,
    failed,
    duration_ms: Date.now() - startedAt,
    sample_failures: failures,
  };
}

async function runInvariantChecks(pool) {
  const checks = [
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
        SELECT 1
        FROM v_financial_reconciliation
        WHERE balance_delta <> 0
           OR escrow_balance_delta <> 0
        LIMIT 1
      `,
    },
    {
      name: "locked_escrow_vs_wallet_escrow_balance",
      sql: `
        WITH locked_by_wallet AS (
          SELECT poster_wallet_id AS wallet_id, COALESCE(SUM(amount), 0) AS locked_sum
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
    {
      name: "orphan_ledger_entry",
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
  ];

  const results = [];
  for (const check of checks) {
    const result = await pool.query(check.sql);
    results.push({
      check: check.name,
      pass: result.rowCount === 0,
      row_count: result.rowCount,
    });
  }
  return results;
}

async function main() {
  const { pool } = require("../src/config/db");
  const { withSerializableTransaction } = require("../src/utils/transaction");
  const escrowService = require("../src/services/escrow.service");
  const disputeService = require("../src/services/dispute.service");

  const releaseCases = expandToTarget(parseJsonEnv("LOAD_RELEASE_CASES_JSON"));
  const refundCases = expandToTarget(parseJsonEnv("LOAD_REFUND_CASES_JSON"));
  const disputeCases = expandToTarget(parseJsonEnv("LOAD_DISPUTE_CASES_JSON"));

  const releaseSummary = await runBatch(
    "escrow_release_100",
    releaseCases,
    (payload) =>
      withSerializableTransaction((client) =>
        escrowService.releaseEscrow(client, {
          escrowId: payload.escrowId,
          executorId: payload.executorId,
          releaseType: payload.releaseType,
        })
      )
  );

  const refundSummary = await runBatch(
    "escrow_refund_100",
    refundCases,
    (payload) =>
      withSerializableTransaction((client) =>
        escrowService.refundEscrow(client, {
          escrowId: payload.escrowId,
          releaseType: payload.releaseType,
        })
      )
  );

  const disputeSummary = await runBatch(
    "dispute_create_100",
    disputeCases,
    (payload) =>
      disputeService.createDispute(
        { id: payload.filerId, role: "student" },
        {
          taskId: payload.taskId,
          dispute_type: payload.disputeType || "scope_mismatch",
          description: payload.description || "load test dispute",
          evidence: payload.evidence || { source: "load_test" },
        }
      )
  );

  const invariantChecks = await runInvariantChecks(pool);

  const operationPass =
    releaseSummary.failed === 0 &&
    refundSummary.failed === 0 &&
    disputeSummary.failed === 0;
  const invariantsPass = invariantChecks.every((x) => x.pass);
  const overallPass = operationPass && invariantsPass;

  const summary = {
    operations: [releaseSummary, refundSummary, disputeSummary],
    invariants: invariantChecks,
    overall: overallPass ? "PASS" : "FAIL",
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!overallPass) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  // Node's test runner can execute this file directly if filename matches
  // test discovery patterns. Skip execution when runtime env is absent.
  if (!process.env.NODE_ENV) {
    process.exit(0);
  }

  const { pool } = require("../src/config/db");
  main()
    .catch((error) => {
      console.error(
        JSON.stringify(
          { overall: "FAIL", error: error.message || String(error) },
          null,
          2
        )
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}

module.exports = {
  runBatch,
  runInvariantChecks,
};
