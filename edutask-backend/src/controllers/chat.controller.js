const chatService = require("../services/chat.service");
const { parsePagination } = require("../utils/pagination");
const { sendPaginatedSuccess, sendSuccess } = require("../utils/http");

async function listConversations(req, res, next) {
  try {
    const { page, limit } = parsePagination(req.query, { limit: 20, maxLimit: 100 });
    const result = await chatService.listConversations(req.user, { page, limit });
    return sendPaginatedSuccess(res, result.items, result.pagination);
  } catch (error) {
    return next(error);
  }
}

async function listMessages(req, res, next) {
  try {
    const { page, limit } = parsePagination(req.query, { limit: 50, maxLimit: 200 });
    const result = await chatService.listMessages(req.user, req.params.conversationId, {
      page,
      limit,
    });
    return sendPaginatedSuccess(res, result.items, result.pagination);
  } catch (error) {
    return next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const message = await chatService.sendMessage(
      req.user,
      req.params.conversationId,
      req.body && req.body.content
    );
    return sendSuccess(res, message, 201);
  } catch (error) {
    return next(error);
  }
}

async function markRead(req, res, next) {
  try {
    const result = await chatService.markConversationRead(req.user, req.params.conversationId);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function unreadCount(req, res, next) {
  try {
    const result = await chatService.getUnreadCount(req.user);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listConversations,
  listMessages,
  sendMessage,
  markRead,
  unreadCount,
};
