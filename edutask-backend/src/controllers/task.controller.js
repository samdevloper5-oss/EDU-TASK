const taskService = require("../services/task.service");
const { sendSuccess, sendPaginatedSuccess } = require("../utils/http");
const { parsePagination } = require("../utils/pagination");

async function listTasks(req, res, next) {
  try {
    const { status, task_type, min_budget, max_budget, skill } = req.query || {};
    const parsedMinBudget = Number(min_budget);
    const parsedMaxBudget = Number(max_budget);
    const { page, limit } = parsePagination(req.query, { limit: 20, maxLimit: 100 });
    const result = await taskService.listTasks({
      status: status || undefined,
      task_type: task_type || undefined,
      min_budget:
        min_budget != null && Number.isFinite(parsedMinBudget)
          ? parsedMinBudget
          : undefined,
      max_budget:
        max_budget != null && Number.isFinite(parsedMaxBudget)
          ? parsedMaxBudget
          : undefined,
      skill: skill || undefined,
      page,
      limit,
      current_user_id: req.user && req.user.id ? req.user.id : null,
    });
    sendPaginatedSuccess(res, result.items, result.pagination);
  } catch (error) {
    next(error);
  }
}

async function listRecommendedTasks(req, res, next) {
  try {
    const limit = req.query && req.query.limit ? Number(req.query.limit) : 20;
    const result = await taskService.listRecommendedTasks(req.user.id, { limit });
    sendSuccess(res, result.items, 200, { recommendation: result.meta });
  } catch (error) {
    next(error);
  }
}

async function createTask(req, res, next) {
  try {
    const created = await taskService.createTask({
      ...req.body,
      poster_id: req.user.id,
    });
    sendSuccess(res, created, 201);
  } catch (error) {
    next(error);
  }
}

async function publishTask(req, res, next) {
  try {
    const updated = await taskService.publishTask(req.user.id, req.params.taskId);
    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
}

async function openApplications(req, res, next) {
  try {
    const updated = await taskService.openApplications(req.user.id, req.params.taskId);
    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
}

async function moveToInProgress(req, res, next) {
  try {
    const updated = await taskService.moveToInProgress(req.user.id, req.params.taskId);
    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
}

async function moveToUnderReview(req, res, next) {
  try {
    const updated = await taskService.moveToUnderReview(req.user.id, req.params.taskId);
    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
}

async function completeTask(req, res, next) {
  try {
    const updated = await taskService.completeTask(
      req.user.id,
      req.params.taskId,
      req.body && req.body.executor_id
    );
    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
}

async function cancelTask(req, res, next) {
  try {
    const updated = await taskService.cancelTask(req.user.id, req.params.taskId);
    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
}

async function submitReview(req, res, next) {
  try {
    const { rating, comment, reviewee_id } = req.body || {};
    const review = await taskService.submitReview({
      task_id: req.params.taskId,
      reviewer_id: req.user.id,
      reviewee_id: reviewee_id,
      rating: Number(rating),
      comment: comment || null
    });
    sendSuccess(res, review, 201);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listTasks,
  listRecommendedTasks,
  createTask,
  publishTask,
  openApplications,
  moveToInProgress,
  moveToUnderReview,
  completeTask,
  cancelTask,
  submitReview,
};
