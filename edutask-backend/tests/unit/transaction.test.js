const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { loadWithMocks } = require("../helpers/load-with-mocks");

test("withSerializableTransaction commits on success", async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      return { rows: [] };
    },
    release() {
      calls.push("RELEASE");
    },
  };

  const transaction = loadWithMocks(
    path.resolve(__dirname, "../../src/utils/transaction.js"),
    {
      [path.resolve(__dirname, "../../src/config/db.js")]: {
        getClient: async () => client,
      },
      [path.resolve(__dirname, "../../src/config/env.js")]: {
        performance: { serializableTxnWarnMs: 1500 },
      },
      [path.resolve(__dirname, "../../src/config/logger.js")]: {
        warn: () => {},
      },
      [path.resolve(__dirname, "../../src/middlewares/metrics.middleware.js")]: {
        increment: () => {},
      },
    }
  );

  const result = await transaction.withSerializableTransaction(async () => "ok");
  assert.equal(result, "ok");
  assert.deepEqual(calls, [
    "BEGIN",
    "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE",
    "COMMIT",
    "RELEASE",
  ]);
});

test("withSerializableTransaction rolls back and rethrows on failure", async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      return { rows: [] };
    },
    release() {
      calls.push("RELEASE");
    },
  };

  const transaction = loadWithMocks(
    path.resolve(__dirname, "../../src/utils/transaction.js"),
    {
      [path.resolve(__dirname, "../../src/config/db.js")]: {
        getClient: async () => client,
      },
      [path.resolve(__dirname, "../../src/config/env.js")]: {
        performance: { serializableTxnWarnMs: 1500 },
      },
      [path.resolve(__dirname, "../../src/config/logger.js")]: {
        warn: () => {},
      },
      [path.resolve(__dirname, "../../src/middlewares/metrics.middleware.js")]: {
        increment: () => {},
      },
    }
  );

  await assert.rejects(
    transaction.withSerializableTransaction(async () => {
      throw new Error("boom");
    }),
    /boom/
  );

  assert.deepEqual(calls, [
    "BEGIN",
    "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE",
    "ROLLBACK",
    "RELEASE",
  ]);
});
