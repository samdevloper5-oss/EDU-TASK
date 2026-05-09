#!/usr/bin/env node
/* Phase 11 collision harness (HTTP-level, test-only). */

const env = require("../src/config/env");

const baseUrl = process.env.LOAD_BASE_URL || `http://localhost:${env.app.port}`;
const disputeId = process.env.LOAD_DISPUTE_ID || "replace-dispute-id";
const executorId = process.env.LOAD_EXECUTOR_ID || "replace-executor-id";

async function resolveOnce(i) {
  const response = await fetch(`${baseUrl}/admin/disputes/${disputeId}/resolve`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": `phase11-resolve-${i}`,
      "x-request-id": `phase11-resolve-${i}`,
    },
    body: JSON.stringify({
      outcome: "release",
      admin_decision: `collision-${i}`,
      executorId,
    }),
  });
  return { index: i, status: response.status };
}

async function runAdminsResolveCollision(adminCount) {
  const jobs = [];
  for (let i = 0; i < adminCount; i += 1) {
    jobs.push(resolveOnce(i));
  }
  return Promise.allSettled(jobs);
}

async function main() {
  const count = Number(process.env.LOAD_COLLISION_ADMINS || 10);
  const result = await runAdminsResolveCollision(count);
  const summary = result.reduce(
    (acc, r) => {
      if (r.status === "fulfilled") {
        acc.fulfilled += 1;
        acc.statuses[r.value.status] = (acc.statuses[r.value.status] || 0) + 1;
      } else {
        acc.rejected += 1;
      }
      return acc;
    },
    { fulfilled: 0, rejected: 0, statuses: {} }
  );
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
