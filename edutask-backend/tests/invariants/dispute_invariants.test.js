const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { loadWithMocks } = require("../helpers/load-with-mocks");

test("autoResolveDispute rejects non-pending disputes", async () => {
  const service = loadWithMocks(
    path.resolve(__dirname, "../../src/services/dispute.service.js"),
    {
      [path.resolve(__dirname, "../../src/utils/transaction.js")]: {
        withSerializableTransaction: async (work) => work({}),
      },
      [path.resolve(__dirname, "../../src/repositories/dispute.repo.js")]: {
        getDisputeById: async () => ({ id: "d1", task_id: "t1", status: "resolved" }),
      },
      [path.resolve(__dirname, "../../src/repositories/task.repo.js")]: {
        getTaskById: async () => ({ id: "t1", status: "disputed" }),
      },
      [path.resolve(__dirname, "../../src/repositories/submission.repo.js")]: {},
      [path.resolve(__dirname, "../../src/repositories/chat.repo.js")]: {},
      [path.resolve(__dirname, "../../src/repositories/escrow.repo.js")]: {},
      [path.resolve(__dirname, "../../src/repositories/wallet.repo.js")]: {},
      [path.resolve(__dirname, "../../src/repositories/audit.repo.js")]: {},
      [path.resolve(__dirname, "../../src/services/audit.service.js")]: { logEvent: async () => {} },
      [path.resolve(__dirname, "../../src/config/db.js")]: { getClient: async () => ({ release() {} }) },
      [path.resolve(__dirname, "../../src/services/escrow.service.js")]: {},
    }
  );

  await assert.rejects(
    service.autoResolveDispute(
      { id: "system-1", role: "admin" },
      { disputeId: "d1", auto_resolution_reason: "clear evidence" }
    ),
    /Only pending disputes can be auto-resolved/
  );
});
