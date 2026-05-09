const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { loadWithMocks } = require("../helpers/load-with-mocks");

function makeService({ task, submission = null, escrow, refundError = null }) {
  const calls = [];
  const client = {
    async query(sql) {
      if (/FROM escrows/.test(sql)) {
        return { rows: escrow ? [escrow] : [] };
      }
      throw new Error(`Unexpected SQL ${sql}`);
    },
  };

  const service = loadWithMocks(
    path.resolve(__dirname, "../../src/services/task.service.js"),
    {
      [path.resolve(__dirname, "../../src/utils/transaction.js")]: {
        withSerializableTransaction: async (work) => work(client),
      },
      [path.resolve(__dirname, "../../src/repositories/task.repo.js")]: {
        getTaskByIdForUpdate: async () => task,
        updateTaskStatus: async (_c, id, status) => ({ id, status }),
      },
      [path.resolve(__dirname, "../../src/repositories/submission.repo.js")]: {
        getSubmissionByTaskId: async () => submission,
      },
      [path.resolve(__dirname, "../../src/services/escrow.service.js")]: {
        refundEscrow: async (_c, payload) => {
          if (refundError) {
            throw refundError;
          }
          calls.push({ fn: "refundEscrow", payload });
        },
      },
      [path.resolve(__dirname, "../../src/services/audit.service.js")]: {
        logEvent: async (_c, payload) => calls.push({ fn: "audit", action: payload.action }),
      },
    }
  );
  return { service, calls };
}

test("autoExpireInProgressTask no-ops for volunteer tasks", async () => {
  const { service } = makeService({
    task: { id: "t1", task_type: "volunteer", status: "in_progress", deadline: new Date(Date.now() - 60_000) },
  });

  const result = await service.autoExpireInProgressTask("t1");
  assert.equal(result.status, "noop");
  assert.equal(result.reason, "not_paid_task");
});

test("autoExpireInProgressTask refunds escrow then cancels task", async () => {
  const { service, calls } = makeService({
    task: { id: "t1", poster_id: "p1", task_type: "paid", status: "in_progress", deadline: new Date(Date.now() - 60_000) },
    escrow: { id: "e1", released_at: null },
  });

  const result = await service.autoExpireInProgressTask("t1");
  assert.equal(result.status, "expired");
  assert.deepEqual(calls.map((c) => c.fn === "audit" ? c.action : c.fn), [
    "automation_task_checked",
    "refundEscrow",
    "task_expired_auto_refund",
    "automation_task_expired",
  ]);
});
