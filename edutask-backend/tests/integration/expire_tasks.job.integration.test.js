const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { loadWithMocks } = require("../helpers/load-with-mocks");

test("expire job returns skipped when automation disabled", async () => {
  const job = loadWithMocks(
    path.resolve(__dirname, "../../src/jobs/expire_tasks.job.js"),
    {
      [path.resolve(__dirname, "../../src/config/db.js")]: {
        pool: { query: async () => ({ rows: [] }) },
      },
      [path.resolve(__dirname, "../../src/config/env.js")]: {
        automation: { enabled: false, dryRun: false },
      },
      [path.resolve(__dirname, "../../src/services/task.service.js")]: {
        autoExpireInProgressTask: async () => {},
      },
    }
  );

  const result = await job.expireInProgressTasks();
  assert.equal(result.skipped, true);
  assert.equal(result.reason, "automation_disabled");
});

test("expire job dry-run logs candidates and does not mutate tasks", async () => {
  const processed = [];
  const job = loadWithMocks(
    path.resolve(__dirname, "../../src/jobs/expire_tasks.job.js"),
    {
      [path.resolve(__dirname, "../../src/config/db.js")]: {
        pool: { query: async () => ({ rows: [{ id: "t1" }, { id: "t2" }] }) },
      },
      [path.resolve(__dirname, "../../src/config/env.js")]: {
        automation: { enabled: true, dryRun: true },
      },
      [path.resolve(__dirname, "../../src/services/task.service.js")]: {
        autoExpireInProgressTask: async (taskId) => processed.push(taskId),
      },
    }
  );

  const result = await job.expireInProgressTasks();
  assert.equal(result.dryRun, true);
  assert.equal(result.candidates, 2);
  assert.deepEqual(processed, []);
});

test("expire job continues processing when one task fails", async () => {
  const processed = [];
  const job = loadWithMocks(
    path.resolve(__dirname, "../../src/jobs/expire_tasks.job.js"),
    {
      [path.resolve(__dirname, "../../src/config/db.js")]: {
        pool: { query: async () => ({ rows: [{ id: "t1" }, { id: "t2" }] }) },
      },
      [path.resolve(__dirname, "../../src/config/env.js")]: {
        automation: { enabled: true, dryRun: false },
      },
      [path.resolve(__dirname, "../../src/services/task.service.js")]: {
        autoExpireInProgressTask: async (taskId) => {
          processed.push(taskId);
          if (taskId === "t1") {
            throw new Error("boom");
          }
        },
      },
    }
  );

  await job.expireInProgressTasks();
  assert.deepEqual(processed, ["t1", "t2"]);
});
