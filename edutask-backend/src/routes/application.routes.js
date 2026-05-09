const express = require("express");
const applicationController = require("../controllers/application.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const {
  createRateLimiter,
  keyByIpAndUser,
} = require("../middlewares/rate_limit.middleware");
const { idempotencyMiddleware } = require("../middlewares/idempotency.middleware");

const router = express.Router();

const applicationRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyFn: keyByIpAndUser,
  name: "task_application",
});

router.post(
  "/tasks/:taskId/applications",
  requireAuth,
  applicationRateLimit,
  idempotencyMiddleware(),
  applicationController.applyToTask
);

router.get(
  "/tasks/:taskId/applications",
  requireAuth,
  applicationRateLimit,
  applicationController.listTaskApplications
);

module.exports = router;
