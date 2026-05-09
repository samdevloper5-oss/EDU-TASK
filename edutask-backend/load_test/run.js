#!/usr/bin/env node
/* Phase 11 load runner (test-only, no business logic changes). */

const env = require("../src/config/env");
const logger = require("../src/config/logger");
const {
  defaultHeaders,
  makeDisputeBody,
  makeResolveBody,
} = require("./scenarios");

let autocannon;
try {
  autocannon = require("autocannon");
} catch (_) {
  console.error("autocannon is required. Run: npm install");
  process.exit(1);
}

const baseUrl = process.env.LOAD_BASE_URL || `http://localhost:${env.app.port}`;
const targetTaskId = process.env.LOAD_TASK_ID || "replace-task-id";
const targetDisputeId = process.env.LOAD_DISPUTE_ID || "replace-dispute-id";
const targetExecutorId = process.env.LOAD_EXECUTOR_ID || "replace-executor-id";
const durationSec = Number(process.env.LOAD_DURATION_SEC || 30);

function memorySnapshot(label) {
  const usage = process.memoryUsage();
  logger.info("load_memory_snapshot", {
    label,
    rss_mb: Math.round(usage.rss / 1024 / 1024),
    heap_used_mb: Math.round(usage.heapUsed / 1024 / 1024),
    heap_total_mb: Math.round(usage.heapTotal / 1024 / 1024),
  });
}

async function runScenario(name, options) {
  return new Promise((resolve, reject) => {
    logger.info("load_scenario_started", { name, options });
    const instance = autocannon(options, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
    autocannon.track(instance, { renderProgressBar: true });
  });
}

function summarize(name, result) {
  return {
    scenario: name,
    requests: result.requests.average,
    latency_p50_ms: result.latency.p50,
    latency_p95_ms: result.latency.p95,
    latency_p99_ms: result.latency.p99,
    errors: result.errors,
    timeouts: result.timeouts,
    non2xx: result.non2xx,
  };
}

async function main() {
  memorySnapshot("before");
  const interval = setInterval(
    () => memorySnapshot("during"),
    env.performance.loadMemoryLogIntervalMs
  );

  const summaries = [];
  try {
    summaries.push(
      summarize(
        "task_reads_100rps",
        await runScenario("task_reads_100rps", {
          url: `${baseUrl}/health`,
          method: "GET",
          duration: durationSec,
          connections: 20,
          pipelining: 5,
          amount: 100 * durationSec,
          headers: defaultHeaders(),
        })
      )
    );

    summaries.push(
      summarize(
        "dispute_create_50_concurrent",
        await runScenario("dispute_create_50_concurrent", {
          url: `${baseUrl}/tasks/${targetTaskId}/disputes`,
          method: "POST",
          duration: durationSec,
          connections: 50,
          headers: defaultHeaders(),
          body: makeDisputeBody(targetTaskId, 1),
        })
      )
    );

    summaries.push(
      summarize(
        "admin_resolve_20_concurrent",
        await runScenario("admin_resolve_20_concurrent", {
          url: `${baseUrl}/admin/disputes/${targetDisputeId}/resolve`,
          method: "POST",
          duration: durationSec,
          connections: 20,
          headers: defaultHeaders(),
          body: makeResolveBody("release", targetExecutorId),
        })
      )
    );
  } finally {
    clearInterval(interval);
    memorySnapshot("after");
  }

  logger.info("load_run_summary", { base_url: baseUrl, summaries });
  console.log(JSON.stringify({ base_url: baseUrl, summaries }, null, 2));
}

main().catch((error) => {
  logger.error("load_run_failed", { message: error.message });
  process.exit(1);
});
