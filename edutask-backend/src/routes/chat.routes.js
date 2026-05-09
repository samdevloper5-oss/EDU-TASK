const express = require("express");
const chatController = require("../controllers/chat.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const {
  createRateLimiter,
  keyByIpAndUser,
} = require("../middlewares/rate_limit.middleware");
const { idempotencyMiddleware } = require("../middlewares/idempotency.middleware");

const router = express.Router();

const chatRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyFn: keyByIpAndUser,
  name: "chat",
});

router.get("/chat/conversations", requireAuth, chatRateLimit, chatController.listConversations);
router.get(
  "/chat/conversations/:conversationId/messages",
  requireAuth,
  chatRateLimit,
  chatController.listMessages
);
router.post(
  "/chat/conversations/:conversationId/messages",
  requireAuth,
  chatRateLimit,
  idempotencyMiddleware(),
  chatController.sendMessage
);
router.patch(
  "/chat/conversations/:conversationId/read",
  requireAuth,
  chatRateLimit,
  chatController.markRead
);
router.get("/chat/unread-count", requireAuth, chatRateLimit, chatController.unreadCount);

module.exports = router;
