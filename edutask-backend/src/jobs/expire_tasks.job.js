// Phase 7A: Task expiration & auto-refund (paid tasks only).
// This job intentionally skips under_review to avoid contradicting BUSINESS_RULES.

const { pool } = require("../config/db");
const env = require("../config/env");
const taskService = require("../services/task.service");

async function expireInProgressTasks() {
  if (!env.automation.enabled) {
    return { skipped: true, reason: "automation_disabled" };
  }

  // Find candidate tasks (paid, in_progress, deadline passed, no submission).
  const expireResults = await pool.query(
    `
      SELECT t.id
      FROM tasks t
      LEFT JOIN submissions s ON s.task_id = t.id
      WHERE t.task_type = 'paid'
        AND t.status = 'in_progress'
        AND t.deadline <= NOW()
        AND s.id IS NULL
    `
  );

  // Find under-review tasks for > 12h inactivity
  const autoReleaseCandidates = await pool.query(
    `
      SELECT t.id
      FROM tasks t
      JOIN submissions s ON s.task_id = t.id
      WHERE t.status = 'under_review'
        AND s.created_at <= NOW() - INTERVAL '12 hours'
        AND t.task_type = 'paid'
    `
  );

  if (env.automation.dryRun) {
    for (const row of expireResults.rows) {
      console.log("[DRY_RUN] expire_in_progress_task", row.id);
    }
    for (const row of autoReleaseCandidates.rows) {
      console.log("[DRY_RUN] auto_release_task", row.id);
    }
    return { dryRun: true, candidates: expireResults.rows.length + autoReleaseCandidates.rows.length };
  }

  // Process expirations
  for (const row of expireResults.rows) {
    try {
      await taskService.autoExpireInProgressTask(row.id);
    } catch (err) {
      console.error("[expire_in_progress_task] failed", row.id, err.message);
    }
  }

  // Process auto-releases (poster inactivity)
  const submissionService = require("../services/submission.service");
  for (const row of autoReleaseCandidates.rows) {
    try {
      await submissionService.approveSubmission(row.id, null, "Auto-released due to poster inactivity (12 hours)");
    } catch (err) {
      console.error("[auto_release_task] failed", row.id, err.message);
    }
  }
}

module.exports = {
  expireInProgressTasks,
};
