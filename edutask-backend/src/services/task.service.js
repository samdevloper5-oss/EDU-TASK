// Task service (Phase 3 - money-neutral).
// Business rules and state transitions are enforced here.

const { withSerializableTransaction } = require("../utils/transaction");
const taskRepo = require("../repositories/task.repo");
const submissionRepo = require("../repositories/submission.repo");
const escrowRepo = require("../repositories/escrow.repo");
const userRepo = require("../repositories/user.repo");
const escrowService = require("./escrow.service");
const auditService = require("./audit.service");
const chatService = require("./chat.service");
const notificationService = require("./notification.service");
const leaderboardService = require("./leaderboard.service");
const { getCache, setCache } = require("../config/cache");
const { ApiError } = require("../utils/http");
const { buildPagination } = require("../utils/pagination");
const { isEscrowLocked } = require("../constants/escrow.constants");
const { normalizeSkillList, extractSkillKeywords } = require("../utils/skills");

function requireNonEmpty(value, fieldName) {
  if (!value || String(value).trim().length === 0) {
    throw new ApiError(400, "validation_error", `${fieldName} is required.`);
  }
}

function parseUrgency(deadline) {
  if (!deadline) {
    return { remainingTimeSeconds: null, urgencyLevel: "LOW" };
  }
  const remainingTimeSeconds = Math.max(
    0,
    Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)
  );
  let urgencyLevel = "LOW";
  if (remainingTimeSeconds <= 12 * 60 * 60) {
    urgencyLevel = "HIGH";
  } else if (remainingTimeSeconds <= 48 * 60 * 60) {
    urgencyLevel = "MEDIUM";
  }
  return { remainingTimeSeconds, urgencyLevel };
}

function calculateSkillMatch(userSkills, taskSkills) {
  if (taskSkills.length === 0) {
    return 0;
  }
  const userSet = new Set(userSkills);
  let overlap = 0;
  for (const skill of taskSkills) {
    if (userSet.has(skill)) {
      overlap += 1;
    }
  }
  return overlap / taskSkills.length;
}

// TODO(Phase 4): After executor selection, transition tasks to 'in_progress'.
// TODO(Phase 4): After submission, transition tasks to 'under_review'.
// TODO(Phase 5): Hook dispute creation to move tasks into 'disputed'.
// TODO(Phase 5): Hook dispute resolution to move tasks out of 'disputed'.
// TODO(Phase 5): Task expiration handling will be implemented by a scheduled job.

async function createTask(payload) {
  // Transaction boundary: task creation + audit log must be atomic.
  return withSerializableTransaction(async (client) => {
    const {
      poster_id,
      task_type,
      title,
      description,
      scope,
      deliverables,
      acceptance_criteria,
      required_members,
      budget,
      deadline,
      review_window_hours,
      max_revisions,
      application_deadline,
      max_applicants,
      attachments,
      required_skills,
    } = payload;

    requireNonEmpty(poster_id, "poster_id");
    requireNonEmpty(task_type, "task_type");
    requireNonEmpty(title, "title");
    requireNonEmpty(description, "description");
    requireNonEmpty(scope, "scope");
    requireNonEmpty(deliverables, "deliverables");
    requireNonEmpty(acceptance_criteria, "acceptance_criteria");
    requireNonEmpty(deadline, "deadline");

    if (task_type !== "paid" && task_type !== "volunteer") {
      throw new ApiError(400, "validation_error", "task_type must be 'paid' or 'volunteer'.");
    }

    if (new Date(deadline).getTime() <= Date.now()) {
      throw new ApiError(400, "validation_error", "deadline must be in the future.");
    }

    // Enforce schema-aligned constraints before insert.
    if (task_type === "paid") {
      if (budget == null || Number(budget) <= 0) {
        throw new Error("budget is required for paid tasks.");
      }
      if (required_members != null) {
        throw new Error("required_members must be null for paid tasks.");
      }
    }

    if (task_type === "volunteer") {
      if (required_members == null || Number(required_members) <= 0) {
        throw new Error("required_members is required for volunteer tasks.");
      }
      if (budget != null) {
        throw new Error("budget must be null for volunteer tasks.");
      }
    }

    if (max_applicants != null && Number(max_applicants) <= 0) {
      throw new ApiError(400, "validation_error", "max_applicants must be positive.");
    }
    if (attachments != null && !Array.isArray(attachments)) {
      throw new ApiError(400, "validation_error", "attachments must be an array.");
    }

    const task = await taskRepo.createTask(client, {
      poster_id,
      task_type,
      title,
      description,
      scope,
      deliverables,
      acceptance_criteria,
      required_members,
      budget,
      deadline,
      review_window_hours,
      max_revisions,
      application_deadline,
      max_applicants,
      attachments,
      required_skills: normalizeSkillList(required_skills || []),
    });

    await auditService.logEvent(client, {
      user_id: poster_id,
      action: "task_created",
      entity_type: "task",
      entity_id: task.id,
    });

    return task;
  });
}

async function publishTask(posterId, taskId) {
  // Transaction boundary: status transition + audit log.
  return withSerializableTransaction(async (client) => {
    const task = await taskRepo.getTaskById(client, taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    // State transition: draft -> published
    if (task.status !== "draft") {
      throw new Error("Only draft tasks can be published.");
    }

    if (task.poster_id !== posterId) {
      throw new Error("Only the task poster can publish.");
    }

    // Required fields must be present before publish.
    requireNonEmpty(task.scope, "scope");
    requireNonEmpty(task.deliverables, "deliverables");
    requireNonEmpty(task.acceptance_criteria, "acceptance_criteria");
    requireNonEmpty(task.deadline, "deadline");

    const updated = await taskRepo.updateTaskStatus(
      client,
      taskId,
      "published"
    );

    await auditService.logEvent(client, {
      user_id: posterId,
      action: "task_published",
      entity_type: "task",
      entity_id: taskId,
    });

    return updated;
  });
}

async function openApplications(posterId, taskId) {
  // Transaction boundary: status transition + audit log.
  return withSerializableTransaction(async (client) => {
    const task = await taskRepo.getTaskById(client, taskId);
    if (!task) {
      throw new Error("Task not found.");
    }

    if (task.poster_id !== posterId) {
      throw new Error("Only the task poster can open applications.");
    }

    // State transition: published -> application_open
    if (task.status !== "published") {
      throw new Error("Only published tasks can open applications.");
    }

    if (task.task_type === "paid") {
      const escrow = await escrowRepo.getEscrowByTaskId(client, taskId);
      if (!escrow || !isEscrowLocked(escrow)) {
        throw new Error("Escrow must be locked before opening applications.");
      }
    }

    const updated = await taskRepo.updateTaskStatus(
      client,
      taskId,
      "application_open"
    );

    await auditService.logEvent(client, {
      user_id: posterId,
      action: "task_application_opened",
      entity_type: "task",
      entity_id: taskId,
    });

    return updated;
  });
}

async function listTasks(filters) {
  return withSerializableTransaction(async (client) => {
    const safeLimit = Math.min(Math.max(Number(filters && filters.limit) || 20, 1), 100);
    const safePage = Math.max(Number(filters && filters.page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;
    const rows = await taskRepo.listTasks(client, {
      ...filters,
      limit: safeLimit,
      offset,
    });

    const total = rows.length > 0 ? Number(rows[0].total_count || 0) : 0;
    return {
      items: rows.map((row) => {
        const { total_count, ...rest } = row;
        const urgency = parseUrgency(rest.deadline);
        return {
          ...rest,
          applicantCount: Number(rest.applicant_count || 0),
          isAppliedByCurrentUser: Boolean(rest.is_applied_by_current_user),
          remainingTimeSeconds: urgency.remainingTimeSeconds,
          urgencyLevel: urgency.urgencyLevel,
        };
      }),
      pagination: buildPagination(safePage, safeLimit, total),
    };
  });
}

async function listRecommendedTasks(userId, { limit = 20 } = {}) {
  const cacheKey = `task_recommendations:${userId}:${limit}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await withSerializableTransaction(async (client) => {
    const user = await userRepo.getUserById(client, userId);
    if (!user) {
      throw new ApiError(404, "user_not_found", "User not found.");
    }

    const userSkills = normalizeSkillList(user.skills || []);
    const rows = await taskRepo.listRecommendedCandidateTasks(client, userId, {
      limit: Math.max(Number(limit) || 20, 1) * 3,
    });
    const maxBudget = rows.reduce(
      (max, row) => Math.max(max, Number(row.budget || 0)),
      0
    );

    const engagementRaw = await client.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count,
          COUNT(*)::int AS total_count
        FROM task_applications
        WHERE applicant_id = $1
      `,
      [userId]
    );
    const completedCount = Number(
      engagementRaw.rows[0] ? engagementRaw.rows[0].completed_count : 0
    );
    const totalApplied = Number(
      engagementRaw.rows[0] ? engagementRaw.rows[0].total_count : 0
    );
    const engagementFactor = totalApplied === 0 ? 0 : completedCount / totalApplied;

    const items = rows.map((row) => {
      const explicitSkills = normalizeSkillList(
        Array.isArray(row.required_skills) ? row.required_skills : []
      );
      const parsedSkills = extractSkillKeywords(
        `${row.title || ""},${row.description || ""},${row.scope || ""},${row.deliverables || ""}`
      );
      const taskSkills = explicitSkills.length > 0 ? explicitSkills : parsedSkills;

      const skillMatch = calculateSkillMatch(userSkills, taskSkills);
      const urgency = parseUrgency(row.deadline);
      const urgencyWeight =
        urgency.urgencyLevel === "HIGH"
          ? 1
          : urgency.urgencyLevel === "MEDIUM"
            ? 0.6
            : 0.25;
      const budgetWeight =
        maxBudget <= 0 ? 0 : Number(Number(row.budget || 0) / maxBudget);
      const score =
        0.5 * skillMatch +
        0.2 * urgencyWeight +
        0.2 * budgetWeight +
        0.1 * engagementFactor;

      return {
        ...row,
        applicantCount: Number(row.applicant_count || 0),
        isAppliedByCurrentUser: Boolean(row.is_applied_by_current_user),
        remainingTimeSeconds: urgency.remainingTimeSeconds,
        urgencyLevel: urgency.urgencyLevel,
        match_score: Number(score.toFixed(4)),
        match_percentage: Math.round(skillMatch * 100),
        recommendation_score: Number((score * 100).toFixed(2)),
      };
    });

    items.sort((a, b) => b.recommendation_score - a.recommendation_score);
    return {
      items: items.slice(0, Math.max(Number(limit) || 20, 1)),
      meta: {
        algorithm: {
          skill_match_weight: 0.5,
          urgency_weight: 0.2,
          budget_weight: 0.2,
          engagement_weight: 0.1,
        },
      },
    };
  });

  await setCache(cacheKey, result, 60);
  return result;
}

async function moveToInProgress(posterId, taskId) {
  return withSerializableTransaction(async (client) => {
    const task = await taskRepo.getTaskById(client, taskId);
    if (!task) {
      throw new ApiError(404, "task_not_found", "Task not found.");
    }
    if (task.poster_id !== posterId) {
      throw new ApiError(403, "forbidden", "Only the task poster can start work.");
    }
    if (!["executor_selected", "application_open", "published"].includes(task.status)) {
      throw new ApiError(409, "invalid_task_state", "Task is not in a valid state to start.");
    }

    if (task.task_type === "paid") {
      const escrow = await escrowRepo.getEscrowByTaskId(client, taskId);
      if (!escrow || !isEscrowLocked(escrow)) {
        throw new ApiError(409, "escrow_required", "Escrow must be locked before moving to in_progress.");
      }
    }

    const updated = await taskRepo.updateTaskStatus(client, taskId, "in_progress");

    await auditService.logEvent(client, {
      user_id: posterId,
      action: "task_in_progress",
      entity_type: "task",
      entity_id: taskId,
    });

    if (task.selected_executor_id) {
      await notificationService.createNotificationInTransaction(client, {
        user_id: task.selected_executor_id,
        type: "ACCEPTED",
        title: "Application accepted",
        message: "You were selected for a task.",
        reference_id: task.id,
        metadata: { task_id: task.id },
      });
      await chatService.ensureConversationForTaskInTransaction(client, task.id);
    }

    return updated;
  });
}

async function moveToUnderReview(posterId, taskId) {
  return withSerializableTransaction(async (client) => {
    const task = await taskRepo.getTaskById(client, taskId);
    if (!task) {
      throw new Error("Task not found.");
    }
    if (task.poster_id !== posterId) {
      throw new Error("Only the task poster can move to review.");
    }
    if (task.status !== "in_progress") {
      throw new Error("Task must be in_progress to move to under_review.");
    }

    if (task.task_type === "paid") {
      const escrow = await escrowRepo.getEscrowByTaskId(client, taskId);
      if (!escrow || !isEscrowLocked(escrow)) {
        throw new Error("Escrow must be locked during under_review.");
      }
    }

    const updated = await taskRepo.updateTaskStatus(client, taskId, "under_review");

    await auditService.logEvent(client, {
      user_id: posterId,
      action: "task_under_review",
      entity_type: "task",
      entity_id: taskId,
    });

    return updated;
  });
}

async function completeTask(posterId, taskId, executorId) {
  const updatedTask = await withSerializableTransaction(async (client) => {
    const snapshot = await taskRepo.getTaskById(client, taskId);
    if (!snapshot) {
      throw new Error("Task not found.");
    }
    if (posterId !== null && snapshot.poster_id !== posterId) {
      throw new Error("Only the task poster can complete a task.");
    }

    let escrow = null;
    let task = null;

    // Financial lock order: escrows -> tasks -> wallets (inside escrow.service) -> ledger_entries.
    if (snapshot.task_type === "paid") {
      escrow = await escrowRepo.getEscrowByTaskId(client, taskId, true);
      if (!escrow || !isEscrowLocked(escrow)) {
        throw new Error("Escrow must be locked to complete a paid task.");
      }
      task = await taskRepo.getTaskByIdForUpdate(client, taskId);
      if (!task) {
        throw new Error("Task not found.");
      }
      if (task.poster_id !== posterId) {
        throw new Error("Only the task poster can complete a task.");
      }
      if (!["under_review", "in_progress"].includes(task.status)) {
        throw new Error("Task is not in a valid state to complete.");
      }
      if (!executorId) {
        throw new Error("executorId is required to release escrow.");
      }
      await escrowService.releaseEscrow(client, {
        escrowId: escrow.id,
        executorId,
      });
    } else {
      task = await taskRepo.getTaskByIdForUpdate(client, taskId);
      if (!task) {
        throw new Error("Task not found.");
      }
      if (task.poster_id !== posterId) {
        throw new Error("Only the task poster can complete a task.");
      }
      if (!["under_review", "in_progress"].includes(task.status)) {
        throw new Error("Task is not in a valid state to complete.");
      }
    }

    const updated = await taskRepo.updateTaskStatus(client, taskId, "completed");

    await auditService.logEvent(client, {
      user_id: posterId,
      action: "task_completed",
      entity_type: "task",
      entity_id: taskId,
    });

    if (task.selected_executor_id) {
      // Update Trust Score (Rule 24 & 27)
      // Completing a task successfully = +10 TS for worker
      // Participation = +5 TS for poster
      // Each 100 BDT spent/earned = +1 TS
      const budgetAmount = Number(task.budget || 0);
      const bdtPoints = Math.floor(budgetAmount / 100);

      const workerTS = 10 + bdtPoints;
      const posterTS = 5 + bdtPoints;

      await client.query(
        `UPDATE users SET trust_score = trust_score + $1 WHERE id = $2`,
        [workerTS, task.selected_executor_id]
      );
      await client.query(
        `UPDATE users SET trust_score = trust_score + $1 WHERE id = $2`,
        [posterTS, task.poster_id]
      );

      await notificationService.createNotificationInTransaction(client, {
        user_id: task.selected_executor_id,
        type: "COMPLETED",
        title: "Task completed",
        message: "A task assigned to you has been marked completed.",
        reference_id: task.id,
        metadata: { task_id: task.id },
      });

      const workerRecord = await userRepo.getUserById(client, task.selected_executor_id, true);
      if (workerRecord && workerRecord.referred_by) {
        const referralService = require("./referral.service");
        await referralService.creditReferralRewardInTransaction(client, {
          referrerUserId: workerRecord.referred_by,
          referredUserId: task.selected_executor_id,
          milestone: "first_task_completed",
          actorUserId: posterId || task.poster_id,
        });
      }
    }

    return updated;
  });
  await leaderboardService.invalidateLeaderboardCache();
  return updatedTask;
}

async function cancelTask(posterId, taskId) {
  return withSerializableTransaction(async (client) => {
    const snapshot = await taskRepo.getTaskById(client, taskId);
    if (!snapshot) {
      throw new Error("Task not found.");
    }
    if (snapshot.poster_id !== posterId) {
      throw new Error("Only the task poster can cancel a task.");
    }

    let escrow = null;
    let task = null;

    // Financial lock order: escrows -> tasks -> wallets (inside escrow.service) -> ledger_entries.
    if (snapshot.task_type === "paid") {
      escrow = await escrowRepo.getEscrowByTaskId(client, taskId, true);
      task = await taskRepo.getTaskByIdForUpdate(client, taskId);
      if (!task) {
        throw new Error("Task not found.");
      }
      if (task.poster_id !== posterId) {
        throw new Error("Only the task poster can cancel a task.");
      }
      if (["completed", "cancelled", "disputed"].includes(task.status)) {
        throw new Error("Task cannot be cancelled in its current state.");
      }
      if (escrow && isEscrowLocked(escrow)) {
        await escrowService.refundEscrow(client, { escrowId: escrow.id });
      }
    } else {
      task = await taskRepo.getTaskByIdForUpdate(client, taskId);
      if (!task) {
        throw new Error("Task not found.");
      }
      if (task.poster_id !== posterId) {
        throw new Error("Only the task poster can cancel a task.");
      }
      if (["completed", "cancelled", "disputed"].includes(task.status)) {
        throw new Error("Task cannot be cancelled in its current state.");
      }
    }

    const updated = await taskRepo.updateTaskStatus(client, taskId, "cancelled");

    await auditService.logEvent(client, {
      user_id: posterId,
      action: "task_cancelled",
      entity_type: "task",
      entity_id: taskId,
    });

    return updated;
  });
}

async function autoExpireInProgressTask(taskId) {
  // Phase 7A: Auto-cancel paid tasks with no submission after deadline.
  // Intentionally does NOT handle under_review to avoid contradicting BUSINESS_RULES.
  return withSerializableTransaction(async (client) => {
    const logChecked = async () =>
      auditService.logEvent(client, {
        user_id: null,
        action: "automation_task_checked",
        entity_type: "task",
        entity_id: taskId,
      });

    const logNoop = async (reason) =>
      auditService.logEvent(client, {
        user_id: null,
        action: "automation_noop_reason",
        entity_type: "task",
        entity_id: taskId,
        new_values: { reason },
      });

    await logChecked();

    // Financial lock order for auto-refund path:
    // escrows -> tasks -> wallets (inside escrow.service) -> ledger_entries.
    const escrow = await escrowRepo.getEscrowByTaskId(client, taskId, true);
    const task = await taskRepo.getTaskByIdForUpdate(client, taskId);
    if (!task) {
      await logNoop("task_not_found");
      return { status: "noop", reason: "task_not_found" };
    }

    if (task.task_type !== "paid") {
      await logNoop("not_paid_task");
      return { status: "noop", reason: "not_paid_task" };
    }
    if (task.status !== "in_progress") {
      await logNoop("not_in_progress");
      return { status: "noop", reason: "not_in_progress" };
    }
    if (!task.deadline || new Date(task.deadline) > new Date()) {
      await logNoop("deadline_not_reached");
      return { status: "noop", reason: "deadline_not_reached" };
    }

    const submission = await submissionRepo.getSubmissionByTaskId(
      client,
      task.id
    );
    if (submission) {
      await logNoop("submission_exists");
      return { status: "noop", reason: "submission_exists" };
    }

    if (!escrow || !isEscrowLocked(escrow)) {
      await logNoop("escrow_unavailable");
      return { status: "noop", reason: "escrow_unavailable" };
    }

    await escrowService.refundEscrow(client, { escrowId: escrow.id });

    const updated = await taskRepo.updateTaskStatus(client, task.id, "cancelled");

    await auditService.logEvent(client, {
      user_id: task.poster_id,
      action: "task_expired_auto_refund",
      entity_type: "task",
      entity_id: task.id,
    });

    await auditService.logEvent(client, {
      user_id: null,
      action: "automation_task_expired",
      entity_type: "task",
      entity_id: task.id,
    });

    return { status: "expired", task: updated };
  });
}

module.exports = {
  createTask,
  publishTask,
  openApplications,
  listTasks,
  moveToInProgress,
  moveToUnderReview,
  completeTask,
  cancelTask,
  autoExpireInProgressTask,
  listRecommendedTasks,
};

async function submitReview(payload) {
  return withSerializableTransaction(async (client) => {
    const { task_id, reviewer_id, reviewee_id, rating, comment } = payload;

    if (!task_id || !reviewer_id || !reviewee_id || !rating) {
      throw new ApiError(400, "validation_error", "Missing required fields for review.");
    }
    if (rating < 1 || rating > 5) {
      throw new ApiError(400, "validation_error", "Rating must be between 1 and 5.");
    }

    const task = await taskRepo.getTaskById(client, task_id);
    if (!task) {
      throw new ApiError(404, "task_not_found", "Task not found.");
    }

    // Validate task completed
    if (task.status !== "completed") {
      throw new ApiError(400, "invalid_task_state", "Task must be completed to submit a review.");
    }

    // Only poster can rate worker
    if (task.poster_id !== reviewer_id) {
      throw new ApiError(403, "forbidden", "Only the task poster can submit a review.");
    }

    // Insert review (unique constraint prevents duplicate reviews)
    let review;
    try {
      const reviewResult = await client.query(
        `INSERT INTO task_reviews (task_id, reviewer_id, reviewee_id, rating, comment)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [task_id, reviewer_id, reviewee_id, rating, comment]
      );
      review = reviewResult.rows[0];
    } catch (error) {
      if (error.code === '23505') { // unique_violation
        throw new ApiError(409, "duplicate_review", "Review already submitted for this task and user.");
      }
      throw error;
    }

    // Update Trust Score (Rule 24 & 27)
    const tsMap = { 5: 10, 4: 8, 3: 5, 2: 2, 1: 0 };
    const scoreToAdd = tsMap[rating] || 0;

    await client.query(
      `UPDATE users SET trust_score = trust_score + $1 WHERE id = $2`,
      [scoreToAdd, reviewee_id]
    );

    // Audit Log
    await auditService.logEvent(client, {
      user_id: reviewer_id,
      action: "task_review_submitted",
      entity_type: "task",
      entity_id: task_id,
      new_values: { rating, reviewee_id, scoreToAdd },
    });

    return review;
  });
}

module.exports.submitReview = submitReview;
