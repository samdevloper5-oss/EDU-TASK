const express = require("express");
const profileController = require("../controllers/profile.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { uploadProfilePicture } = require("../middlewares/upload.middleware");

const router = express.Router();

router.get("/profile/me", requireAuth, profileController.me);
router.post(
  "/profile/upload-avatar",
  requireAuth,
  uploadProfilePicture.single("avatar"),
  profileController.uploadAvatar
);

router.get("/users/:id/reviews", requireAuth, profileController.getUserReviews);

module.exports = router;
