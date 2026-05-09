// Serializable transaction helper.
// Guarantees:
// 1) All operations inside the callback run at SERIALIZABLE isolation.
// 2) Any error triggers an automatic rollback before the error is re-thrown.
// 3) The client is always released back to the pool.

const { getClient } = require("../config/db");
const env = require("../config/env");
const logger = require("../config/logger");
const { increment } = require("../middlewares/metrics.middleware");

const RETRYABLE_SQLSTATE = new Set(["40001", "40P01"]);
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 50;

async function begin(client) {
  await client.query("BEGIN");
  await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
}

async function commit(client) {
  await client.query("COMMIT");
}

async function rollback(client) {
  await client.query("ROLLBACK");
}

function isRetryableTransactionError(error) {
  return Boolean(error && RETRYABLE_SQLSTATE.has(error.code));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBackoffMs(attempt) {
  const base = BASE_BACKOFF_MS * Math.pow(2, Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * 25);
  return base + jitter;
}

async function withSerializableTransaction(work, options = {}) {
  const maxRetries = Number.isInteger(options.maxRetries)
    ? Math.max(0, options.maxRetries)
    : MAX_RETRIES;
  const operation = options.operation || "serializable_transaction";

  let attempt = 0;
  // Retrying a SERIALIZABLE transaction is safe because each failed attempt
  // is fully rolled back before the next attempt starts.
  while (attempt <= maxRetries) {
    const client = await getClient();
    const startedAt = Date.now();
    try {
      await begin(client);
      const result = await work(client);
      await commit(client);
      return result;
    } catch (error) {
      try {
        await rollback(client);
        increment("transaction_rollbacks_total");
      } catch (_) {
        // Preserve original error.
      }

      if (isRetryableTransactionError(error) && attempt < maxRetries) {
        const retryAttempt = attempt + 1;
        const backoffMs = computeBackoffMs(retryAttempt);
        increment("transaction_retries_total");
        if (error.code === "40P01") {
          increment("deadlock_total");
        }
        logger.warn("serializable_transaction_retry", {
          operation,
          attempt: retryAttempt,
          max_retries: maxRetries,
          sqlstate: error.code,
          backoff_ms: backoffMs,
        });
        await sleep(backoffMs);
        attempt += 1;
        continue;
      }

      throw error;
    } finally {
      const durationMs = Date.now() - startedAt;
      if (durationMs > env.performance.serializableTxnWarnMs) {
        logger.warn("serializable_transaction_slow", { duration_ms: durationMs });
      }
      client.release();
    }
  }

  throw new Error("Serializable transaction retry exhausted.");
}

module.exports = {
  begin,
  commit,
  rollback,
  withSerializableTransaction,
};
