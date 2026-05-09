const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { loadWithMocks } = require("../helpers/load-with-mocks");

function makeDisputeService(overrides = {}) {
  const calls = [];
  const state = {
    dispute: { id: "d1", task_id: "t1", status: "under_review" },
    task: {
      id: "t1",
      status: "disputed",
      task_type: "paid",
      poster_id: "poster-1",
      selected_executor_id: "exec-1",
    },
    escrow: { id: "e1", task_id: "t1", released_at: null },
  };

  const client = {
    async query(sql) {
      if (/FROM escrows WHERE task_id/.test(sql)) {
        return { rows: [state.escrow] };
      }
      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };

  const disputeRepo = {
    getDisputeById: async () => state.dispute,
    resolveDispute: async (_c, id, adminId, decision) => {
      calls.push({ fn: "resolveDispute", id, adminId, decision });
      state.dispute = { ...state.dispute, status: "resolved" };
      return state.dispute;
    },
    ...overrides.disputeRepo,
  };

  const taskRepo = {
    getTaskById: async () => state.task,
    getTaskByIdForUpdate: async () => state.task,
    updateTaskStatus: async (_c, id, status) => {
      calls.push({ fn: "updateTaskStatus", id, status });
      state.task = { ...state.task, status };
      return state.task;
    },
    ...overrides.taskRepo,
  };

  const escrowService = {
    releaseEscrow: async (_c, payload) => {
      calls.push({ fn: "releaseEscrow", payload });
      state.escrow = {
        ...state.escrow,
        released_at: new Date().toISOString(),
        release_type: payload.releaseType,
      };
      return state.escrow;
    },
    refundEscrow: async (_c, payload) => {
      calls.push({ fn: "refundEscrow", payload });
      state.escrow = {
        ...state.escrow,
        released_at: new Date().toISOString(),
        release_type: payload.releaseType,
      };
      return state.escrow;
    },
    ...overrides.escrowService,
  };

  const auditService = {
    logEvent: async (_c, payload) => {
      calls.push({ fn: "audit", action: payload.action });
    },
    ...overrides.auditService,
  };

  const service = loadWithMocks(
    path.resolve(__dirname, "../../src/services/dispute.service.js"),
    {
      [path.resolve(__dirname, "../../src/utils/transaction.js")]: {
        withSerializableTransaction: async (work) => work(client),
      },
      [path.resolve(__dirname, "../../src/repositories/dispute.repo.js")]: disputeRepo,
      [path.resolve(__dirname, "../../src/repositories/task.repo.js")]: taskRepo,
      [path.resolve(__dirname, "../../src/repositories/submission.repo.js")]: {},
      [path.resolve(__dirname, "../../src/repositories/chat.repo.js")]: {},
      [path.resolve(__dirname, "../../src/repositories/escrow.repo.js")]: {
        getEscrowByTaskId: async () => state.escrow,
      },
      [path.resolve(__dirname, "../../src/repositories/wallet.repo.js")]: {},
      [path.resolve(__dirname, "../../src/repositories/audit.repo.js")]: {},
      [path.resolve(__dirname, "../../src/services/audit.service.js")]: auditService,
      [path.resolve(__dirname, "../../src/config/db.js")]: { getClient: async () => ({ release() {} }) },
      [path.resolve(__dirname, "../../src/services/escrow.service.js")]: escrowService,
      [path.resolve(__dirname, "../../src/services/notification.service.js")]: {
        createNotificationInTransaction: async (_client, payload) => {
          calls.push({ fn: "notify", type: payload.type });
        },
      },
      [path.resolve(__dirname, "../../src/services/leaderboard.service.js")]: {
        invalidateLeaderboardCache: async () => {
          calls.push({ fn: "leaderboardInvalidate" });
        },
      },
    }
  );

  return { service, calls, state };
}

test("admin resolution release path is atomic and uses dispute_resolution release type", async () => {
  const { service, calls, state } = makeDisputeService();

  const admin = { id: "admin-1", role: "admin" };
  const resolved = await service.resolveDispute(admin, "d1", {
    outcome: "release",
    admin_decision: "Executor fulfilled requirements",
    executorId: "exec-1",
  });

  assert.equal(resolved.status, "resolved");
  assert.equal(state.task.status, "completed");
  assert.equal(state.escrow.release_type, "dispute_resolution");
  assert.deepEqual(calls.map((c) => c.fn), [
    "releaseEscrow",
    "resolveDispute",
    "updateTaskStatus",
    "audit",
    "notify",
    "leaderboardInvalidate",
  ]);
});

test("admin resolution refund path sets task cancelled", async () => {
  const { service, state } = makeDisputeService();

  const admin = { id: "admin-1", role: "admin" };
  await service.resolveDispute(admin, "d1", {
    outcome: "refund",
    admin_decision: "Poster receives refund",
  });

  assert.equal(state.task.status, "cancelled");
  assert.equal(state.escrow.release_type, "dispute_resolution");
});

test("resolution failure before dispute update leaves dispute unresolved", async () => {
  const { service, calls, state } = makeDisputeService({
    escrowService: {
      releaseEscrow: async () => {
        throw new Error("escrow failure");
      },
    },
  });

  const admin = { id: "admin-1", role: "admin" };
  await assert.rejects(
    service.resolveDispute(admin, "d1", {
      outcome: "release",
      admin_decision: "Attempted release",
      executorId: "exec-1",
    }),
    /escrow failure/
  );

  assert.equal(state.dispute.status, "under_review");
  assert.equal(state.task.status, "disputed");
  assert.deepEqual(calls.map((c) => c.fn), []);
});
