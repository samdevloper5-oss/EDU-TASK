const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { loadWithMocks } = require("../helpers/load-with-mocks");
const { runConcurrent } = require("../helpers/concurrency");

test("concurrent admin resolution allows only one winner", async () => {
  const state = {
    dispute: { id: "d1", task_id: "t1", status: "under_review" },
    task: { id: "t1", status: "disputed", task_type: "paid", poster_id: "poster-1" },
    escrow: { id: "e1", task_id: "t1", released_at: null },
  };
  const calls = [];

  let txChain = Promise.resolve();
  const withSerializableTransaction = (work) => {
    txChain = txChain.then(() =>
      work({
        async query(sql) {
          if (/FROM escrows WHERE task_id/.test(sql)) {
            return { rows: [state.escrow] };
          }
          throw new Error(`Unexpected SQL in test: ${sql}`);
        },
      })
    );
    return txChain;
  };

  const service = loadWithMocks(
    path.resolve(__dirname, "../../src/services/dispute.service.js"),
    {
      [path.resolve(__dirname, "../../src/utils/transaction.js")]: {
        withSerializableTransaction,
      },
      [path.resolve(__dirname, "../../src/repositories/dispute.repo.js")]: {
        getDisputeById: async () => state.dispute,
        resolveDispute: async () => {
          if (state.dispute.status !== "under_review") {
            throw new Error("already resolved");
          }
          state.dispute = { ...state.dispute, status: "resolved" };
          calls.push("resolveDispute");
          return state.dispute;
        },
      },
      [path.resolve(__dirname, "../../src/repositories/task.repo.js")]: {
        getTaskById: async () => state.task,
        getTaskByIdForUpdate: async () => state.task,
        updateTaskStatus: async (_c, _id, status) => {
          state.task = { ...state.task, status };
          calls.push("updateTaskStatus");
          return state.task;
        },
      },
      [path.resolve(__dirname, "../../src/repositories/submission.repo.js")]: {},
      [path.resolve(__dirname, "../../src/repositories/chat.repo.js")]: {},
      [path.resolve(__dirname, "../../src/repositories/escrow.repo.js")]: {
        getEscrowByTaskId: async () => state.escrow,
      },
      [path.resolve(__dirname, "../../src/repositories/wallet.repo.js")]: {},
      [path.resolve(__dirname, "../../src/repositories/audit.repo.js")]: {},
      [path.resolve(__dirname, "../../src/services/audit.service.js")]: {
        logEvent: async () => calls.push("audit"),
      },
      [path.resolve(__dirname, "../../src/config/db.js")]: { getClient: async () => ({ release() {} }) },
      [path.resolve(__dirname, "../../src/services/escrow.service.js")]: {
        releaseEscrow: async () => {
          if (state.escrow.released_at) {
            throw new Error("Escrow already released or refunded.");
          }
          state.escrow = {
            ...state.escrow,
            released_at: new Date().toISOString(),
            release_type: "dispute_resolution",
          };
          calls.push("releaseEscrow");
        },
      },
      [path.resolve(__dirname, "../../src/services/notification.service.js")]: {
        createNotificationInTransaction: async () => calls.push("notify"),
      },
      [path.resolve(__dirname, "../../src/services/leaderboard.service.js")]: {
        invalidateLeaderboardCache: async () => calls.push("leaderboardInvalidate"),
      },
    }
  );

  const admin = { id: "admin-1", role: "admin" };
  const payload = {
    outcome: "release",
    admin_decision: "decision",
    executorId: "exec-1",
  };

  const [a, b] = await runConcurrent(
    () => service.resolveDispute(admin, "d1", payload),
    2
  );

  const fulfilled = [a, b].filter((r) => r.status === "fulfilled").length;
  const rejected = [a, b].filter((r) => r.status === "rejected").length;

  assert.equal(fulfilled, 1);
  assert.equal(rejected, 1);
  assert.equal(state.dispute.status, "resolved");
  assert.equal(state.task.status, "completed");
  assert.equal(state.escrow.release_type, "dispute_resolution");
});
