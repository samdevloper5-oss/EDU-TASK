const express = require("express");
const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const {
  createRateLimiter,
  keyByIpAndUser,
} = require("../middlewares/rate_limit.middleware");
const { uploadProfilePicture } = require("../middlewares/upload.middleware");

const router = express.Router();

const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 12,
  keyFn: keyByIpAndUser,
  name: "auth_mutation",
});

router.post(
  "/api/auth/signup",
  authLimiter,
  uploadProfilePicture.single("profile_picture"),
  authController.signup
);
router.post("/api/auth/login", authLimiter, authController.login);
router.post("/api/auth/refresh", authLimiter, authController.refresh);
router.get("/api/auth/me", requireAuth, authController.me);
router.post("/api/auth/logout", authController.logout);
router.get("/api/auth/verify-email", authController.verifyEmail);
router.post("/api/auth/resend-verification", authController.resendVerification);

module.exports = router;
