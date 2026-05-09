const express = require("express");
const leaderboardController = require("../controllers/leaderboard.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const {
  createRateLimiter,
  keyByIpAndUser,
} = require("../middlewares/rate_limit.middleware");

const router = express.Router();

const leaderboardRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyFn: keyByIpAndUser,
  name: "leaderboard",
});

router.get(
  "/leaderboard",
  requireAuth,
  leaderboardRateLimit,
  leaderboardController.listLeaderboard
);

module.exports = router;
