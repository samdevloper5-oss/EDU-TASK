const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { loadWithMocks } = require("../helpers/load-with-mocks");

function loadService(task) {
  return loadWithMocks(path.resolve(__dirname, "../../src/services/dispute.service.js"), {
    [path.resolve(__dirname, "../../src/utils/transaction.js")]: {
      withSerializableTransaction: async (work) => work({
        async query(sql) {
          if (/task_assignments/.test(sql)) {
            return { rowCount: 0, rows: [] };
          }
          throw new Error(`Unexpected SQL: ${sql}`);
        },
      }),
    },
    [path.resolve(__dirname, "../../src/repositories/dispute.repo.js")]: {
      getDisputeByTaskId: async () => null,
      createDispute: async () => ({ id: "d1" }),
    },
    [path.resolve(__dirname, "../../src/repositories/task.repo.js")]: {
      getTaskById: async () => task,
      updateTaskStatus: async () => ({ id: task.id, status: "disputed" }),
    },
    [path.resolve(__dirname, "../../src/repositories/submission.repo.js")]: {},
    [path.resolve(__dirname, "../../src/repositories/chat.repo.js")]: {},
    [path.resolve(__dirname, "../../src/repositories/escrow.repo.js")]: {},
    [path.resolve(__dirname, "../../src/repositories/wallet.repo.js")]: {},
    [path.resolve(__dirname, "../../src/repositories/audit.repo.js")]: {},
    [path.resolve(__dirname, "../../src/services/audit.service.js")]: {
      logEvent: async () => {},
    },
    [path.resolve(__dirname, "../../src/config/db.js")]: { getClient: async () => ({ release() {} }) },
    [path.resolve(__dirname, "../../src/services/escrow.service.js")]: {},
  });
}

test("createDispute rejects invalid task state transition", async () => {
  const service = loadService({
    id: "t1",
    status: "application_open",
    task_type: "paid",
    poster_id: "poster-1",
    selected_executor_id: "exec-1",
  });

  await assert.rejects(
    service.createDispute(
      { id: "poster-1", role: "student" },
      {
        taskId: "t1",
        dispute_type: "scope_mismatch",
        description: "desc",
      }
    ),
    /Disputes can only be filed under_review or within 48 hours of completion/
  );
});
