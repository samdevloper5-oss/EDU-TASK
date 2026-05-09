const express = require("express");
const disputeController = require("../controllers/dispute.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { idempotencyMiddleware } = require("../middlewares/idempotency.middleware");
const { createRateLimiter, keyByIpAndUser } = require("../middlewares/rate_limit.middleware");
const { financialMutationRateLimit } = require("../middlewares/security.middleware");
const { validateDisputeCreate } = require("../middlewares/validate.middleware");

const router = express.Router();

// Phase 5.1: dispute creation only.
const disputeRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyFn: keyByIpAndUser,
  name: "dispute_create",
});

router.post(
  "/tasks/:taskId/disputes",
  requireAuth,
  disputeRateLimit,
  financialMutationRateLimit,
  validateDisputeCreate,
  idempotencyMiddleware(),
  disputeController.createDispute
);

module.exports = router;
