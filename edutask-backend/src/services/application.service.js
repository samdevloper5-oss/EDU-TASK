// Application service (Phase 3 - money-neutral).
// Business rules and application state transitions are enforced here.

const { withSerializableTransaction } = require("../utils/transaction");
const applicationRepo = require("../repositories/application.repo");
const taskRepo = require("../repositories/task.repo");
const auditService = require("./audit.service");
const notificationService = require("./notification.service");
const { ApiError } = require("../utils/http");
const { buildPagination } = require("../utils/pagination");

async function applyToTask(applicant, taskId, coverLetter) {
  // Transaction boundary: application insert + audit log.
  return withSerializableTransaction(async (client) => {
    if (!applicant || !applicant.id) {
      throw new ApiError(401, "unauthorized", "Authenticated applicant is required.");
    }
    if (applicant.role !== "student") {
      throw new ApiError(403, "forbidden", "Only students may apply to tasks.");
    }
    if (applicant.is_active === false) {
      throw new ApiError(403, "user_inactive", "Inactive users cannot apply to tasks.");
    }
    if (applicant.is_suspended === true) {
      throw new ApiError(403, "user_suspended", "Suspended users cannot apply to tasks.");
    }

    const task = await taskRepo.getTaskById(client, taskId);
    if (!task) {
      throw new ApiError(404, "task_not_found", "Task not found.");
    }
    if (task.is_deleted === true) {
      throw new ApiError(410, "task_deleted", "Task is no longer available.");
    }

    if (task.poster_id === applicant.id) {
      throw new ApiError(400, "validation_error", "Task posters cannot apply to their own tasks.");
    }

    // State transition gate: applications only when task is application_open.
    if (task.status !== "application_open") {
      throw new ApiError(409, "invalid_task_state", "Task is not open for applications.");
    }

    if (task.application_deadline) {
      const now = new Date();
      if (now > new Date(task.application_deadline)) {
        throw new ApiError(409, "application_deadline_passed", "Application deadline has passed.");
      }
    }

    if (task.deadline && new Date(task.deadline).getTime() <= Date.now()) {
      throw new ApiError(409, "task_deadline_passed", "Cannot apply to an expired task.");
    }

    if (task.max_applicants != null) {
      const totalApplications = await applicationRepo.countApplicationsByTask(client, taskId);
      if (Number(totalApplications) >= Number(task.max_applicants)) {
        throw new ApiError(
          409,
          "max_applicants_reached",
          "Maximum number of applicants has been reached for this task."
        );
      }
    }

    // Enforce unique application (DB constraint will also protect).
    const existing = await applicationRepo.getApplicationByTaskAndApplicant(
      client,
      taskId,
      applicant.id
    );
    if (existing) {
      throw new ApiError(409, "duplicate_application", "Application already exists for this task.");
    }

    const application = await applicationRepo.createApplication(client, {
      task_id: taskId,
      applicant_id: applicant.id,
      cover_letter: coverLetter,
    });

    await auditService.logEvent(client, {
      user_id: applicant.id,
      action: "task_applied",
      entity_type: "task_application",
      entity_id: application.id,
    });

    await notificationService.createNotificationInTransaction(client, {
      user_id: task.poster_id,
      type: "APPLICATION",
      title: "New task application",
      message: "A student applied to your task.",
      reference_id: task.id,
      metadata: {
        task_id: task.id,
        application_id: application.id,
        applicant_id: applicant.id,
      },
    });

    return application;
  });
}

async function listApplicationsForTask(requester, taskId, { page = 1, limit = 20 } = {}) {
  if (!requester || !requester.id) {
    throw new ApiError(401, "unauthorized", "Authenticated requester is required.");
  }

  return withSerializableTransaction(async (client) => {
    const task = await taskRepo.getTaskById(client, taskId);
    if (!task) {
      throw new ApiError(404, "task_not_found", "Task not found.");
    }

    if (requester.role !== "admin" && task.poster_id !== requester.id) {
      throw new ApiError(403, "forbidden", "Only the task poster or admin may view applications.");
    }

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const offset = (safePage - 1) * safeLimit;
    const rows = await applicationRepo.listApplicationsByTask(client, taskId, {
      limit: safeLimit,
      offset,
    });
    const total = rows.length > 0 ? Number(rows[0].total_count || 0) : 0;
    return {
      items: rows.map((row) => {
        const { total_count, ...rest } = row;
        return rest;
      }),
      pagination: buildPagination(safePage, safeLimit, total),
    };
  });
}

module.exports = {
  applyToTask,
  listApplicationsForTask,
};
