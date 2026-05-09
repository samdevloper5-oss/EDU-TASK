const app = require("./app");
const http = require("http");
const env = require("./config/env");
const { pool } = require("./config/db");
const logger = require("./config/logger");
const { increment } = require("./middlewares/metrics.middleware");
const { initSocket } = require("./realtime/socket");
const { expireInProgressTasks } = require("./jobs/expire_tasks.job");

let cron = null;
try {
  cron = require("node-cron");
} catch (_) {
  cron = null;
}

const port = env.app.port;

const httpServer = http.createServer(app);
initSocket(httpServer);

const server = httpServer.listen(port, () => {
  if (env.nodeEnv !== "test") {
    logger.info("server_started", { port, env: env.nodeEnv, version: env.app.version });
  }
});

if (env.automation.enabled && cron && typeof cron.schedule === "function") {
  cron.schedule("*/5 * * * *", async () => {
    try {
      await expireInProgressTasks();

      const { autoProcessApprovedWithdrawals } = require("./jobs/process_withdrawals.job");
      await autoProcessApprovedWithdrawals();

      const { awardLeaderboardRewards } = require("./jobs/leaderboard_rewards.job");
      await awardLeaderboardRewards();
    } catch (error) {
      logger.error("job_execution_failed", { message: error.message });
    }
  });
} else if (env.automation.enabled && !cron) {
  logger.warn("node_cron_missing_automation_scheduler_disabled");
}

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  logger.warn("server_shutdown_start", { signal });

  server.close(async () => {
    try {
      await pool.end();
      logger.info("server_shutdown_complete", { signal });
      process.exit(0);
    } catch (error) {
      logger.error("server_shutdown_failed", { signal, message: error.message });
      process.exit(1);
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  increment("unhandled_promise_rejections_total");
  logger.error("unhandled_promise_rejection", {
    message: reason && reason.message ? reason.message : String(reason),
  });
});
