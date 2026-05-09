const express = require("express");
const { requireAuth } = require("../middlewares/auth.middleware");
const referralController = require("../controllers/referral.controller");
const {
  createRateLimiter,
  keyByIpAndUser,
} = require("../middlewares/rate_limit.middleware");

const router = express.Router();

const referralRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyFn: keyByIpAndUser,
  name: "referral",
});

router.get(
  "/referrals/me",
  requireAuth,
  referralRateLimit,
  referralController.getMyReferrals
);

router.get(
  "/referrals/stats",
  requireAuth,
  referralRateLimit,
  referralController.getMyReferralStats
);

module.exports = router;
