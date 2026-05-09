const express = require("express");
const adminController = require("../controllers/admin.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");
const { financialMutationRateLimit } = require("../middlewares/security.middleware");
const { idempotencyMiddleware } = require("../middlewares/idempotency.middleware");

const router = express.Router();

router.get(
  "/admin/dashboard-stats",
  requireAuth,
  requireRole("admin"),
  adminController.dashboardStats
);

router.patch(
  "/admin/withdrawals/:id",
  requireAuth,
  requireRole("admin"),
  financialMutationRateLimit,
  idempotencyMiddleware(),
  adminController.approveWithdrawal
);

module.exports = router;
