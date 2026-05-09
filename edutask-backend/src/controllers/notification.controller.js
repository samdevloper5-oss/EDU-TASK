const notificationService = require("../services/notification.service");
const { sendPaginatedSuccess, sendSuccess } = require("../utils/http");
const { parsePagination } = require("../utils/pagination");

async function listNotifications(req, res, next) {
  try {
    const { page, limit } = parsePagination(req.query, { limit: 20, maxLimit: 100 });
    const result = await notificationService.listNotifications(req.user.id, {
      page,
      limit,
    });
    return sendPaginatedSuccess(res, result.items, result.pagination);
  } catch (error) {
    return next(error);
  }
}

async function markRead(req, res, next) {
  try {
    const result = await notificationService.markNotificationsRead(req.user.id);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listNotifications,
  markRead,
};
