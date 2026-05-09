const express = require("express");
const { requireAuth } = require("../middlewares/auth.middleware");
const notificationController = require("../controllers/notification.controller");
const {
  createRateLimiter,
  keyByIpAndUser,
} = require("../middlewares/rate_limit.middleware");

const router = express.Router();

const notificationRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyFn: keyByIpAndUser,
  name: "notification",
});

router.get(
  "/notifications",
  requireAuth,
  notificationRateLimit,
  notificationController.listNotifications
);
router.patch(
  "/notifications/read",
  requireAuth,
  notificationRateLimit,
  notificationController.markRead
);

module.exports = router;
