const express = require("express");
const adminDisputesController = require("../controllers/admin.disputes.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");
const { idempotencyMiddleware } = require("../middlewares/idempotency.middleware");
const { createRateLimiter, keyByIpAndUser } = require("../middlewares/rate_limit.middleware");
const { financialMutationRateLimit } = require("../middlewares/security.middleware");
const { validateDisputeResolution } = require("../middlewares/validate.middleware");

const router = express.Router();

// Phase 5.3: Admin read-only dispute context.
const adminRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyFn: keyByIpAndUser,
  name: "admin_dispute_read",
});

const adminMutateRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyFn: keyByIpAndUser,
  name: "admin_dispute_resolve",
});

router.get(
  "/admin/disputes/:disputeId",
  requireAuth,
  requireRole("admin"),
  adminRateLimit,
  adminDisputesController.getDisputeContext
);

// Phase 5.4: Admin dispute resolution (escrow-affecting).
router.post(
  "/admin/disputes/:disputeId/resolve",
  requireAuth,
  requireRole("admin"),
  adminMutateRateLimit,
  financialMutationRateLimit,
  validateDisputeResolution,
  idempotencyMiddleware(),
  adminDisputesController.resolveDispute
);

module.exports = router;
