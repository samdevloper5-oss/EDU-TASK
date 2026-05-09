const express = require("express");
const walletController = require("../controllers/wallet.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const {
  validateWalletDeposit,
  validateWalletWithdrawal,
} = require("../middlewares/validate.middleware");
const {
  createRateLimiter,
  keyByIpAndUser,
} = require("../middlewares/rate_limit.middleware");
const { idempotencyMiddleware } = require("../middlewares/idempotency.middleware");
const { financialMutationRateLimit } = require("../middlewares/security.middleware");

const router = express.Router();

const walletReadRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyFn: keyByIpAndUser,
  name: "wallet_read",
});

const walletMutationRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 12,
  keyFn: keyByIpAndUser,
  name: "wallet_mutation",
});

router.get("/wallet", requireAuth, walletReadRateLimit, walletController.getWallet);
router.get(
  "/wallet/transactions",
  requireAuth,
  walletReadRateLimit,
  walletController.listTransactions
);
router.get(
  "/wallet/withdrawals",
  requireAuth,
  walletReadRateLimit,
  walletController.listWithdrawals
);

router.post(
  "/wallet/deposit",
  requireAuth,
  walletMutationRateLimit,
  financialMutationRateLimit,
  validateWalletDeposit,
  idempotencyMiddleware(),
  walletController.createDeposit
);

router.post(
  "/wallet/withdraw",
  requireAuth,
  walletMutationRateLimit,
  financialMutationRateLimit,
  validateWalletWithdrawal,
  idempotencyMiddleware(),
  walletController.createWithdrawal
);

module.exports = router;
