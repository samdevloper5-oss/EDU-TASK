const applicationService = require("../services/application.service");
const { sendSuccess, sendPaginatedSuccess } = require("../utils/http");
const { parsePagination } = require("../utils/pagination");

async function applyToTask(req, res, next) {
  try {
    const created = await applicationService.applyToTask(
      req.user,
      req.params.taskId,
      req.body && req.body.cover_letter
    );
    sendSuccess(res, created, 201);
  } catch (error) {
    next(error);
  }
}

async function listTaskApplications(req, res, next) {
  try {
    const { page, limit } = parsePagination(req.query, { limit: 20, maxLimit: 100 });
    const result = await applicationService.listApplicationsForTask(
      req.user,
      req.params.taskId,
      { page, limit }
    );
    sendPaginatedSuccess(res, result.items, result.pagination);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  applyToTask,
  listTaskApplications,
};
