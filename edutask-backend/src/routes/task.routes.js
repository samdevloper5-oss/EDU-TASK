const express = require("express");
const taskController = require("../controllers/task.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");
const {
  createRateLimiter,
  keyByIpAndUser,
} = require("../middlewares/rate_limit.middleware");
const { idempotencyMiddleware } = require("../middlewares/idempotency.middleware");

const router = express.Router();

const taskReadRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 90,
  keyFn: keyByIpAndUser,
  name: "task_read",
});

const taskMutationRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  keyFn: keyByIpAndUser,
  name: "task_mutation",
});

router.get("/tasks", requireAuth, taskReadRateLimit, taskController.listTasks);
router.get(
  "/tasks/recommended",
  requireAuth,
  taskReadRateLimit,
  taskController.listRecommendedTasks
);

router.post(
  "/tasks",
  requireAuth,
  requireRole("student"),
  taskMutationRateLimit,
  idempotencyMiddleware(),
  taskController.createTask
);

router.post(
  "/tasks/:taskId/publish",
  requireAuth,
  requireRole("student"),
  taskMutationRateLimit,
  idempotencyMiddleware(),
  taskController.publishTask
);

router.post(
  "/tasks/:taskId/open-applications",
  requireAuth,
  requireRole("student"),
  taskMutationRateLimit,
  idempotencyMiddleware(),
  taskController.openApplications
);

router.post(
  "/tasks/:taskId/in-progress",
  requireAuth,
  requireRole("student"),
  taskMutationRateLimit,
  idempotencyMiddleware(),
  taskController.moveToInProgress
);

router.post(
  "/tasks/:taskId/under-review",
  requireAuth,
  requireRole("student"),
  taskMutationRateLimit,
  idempotencyMiddleware(),
  taskController.moveToUnderReview
);

router.post(
  "/tasks/:taskId/complete",
  requireAuth,
  requireRole("student"),
  taskMutationRateLimit,
  idempotencyMiddleware(),
  taskController.completeTask
);

router.post(
  "/tasks/:taskId/cancel",
  requireAuth,
  requireRole("student"),
  taskMutationRateLimit,
  idempotencyMiddleware(),
  taskController.cancelTask
);

router.post(
  "/tasks/:taskId/review",
  requireAuth,
  taskMutationRateLimit,
  idempotencyMiddleware(),
  taskController.submitReview
);

module.exports = router;
