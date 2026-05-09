const profileService = require("../services/profile.service");
const { ApiError, sendSuccess } = require("../utils/http");

async function me(req, res, next) {
  try {
    const profile = await profileService.getMyProfile(req.user);
    return sendSuccess(res, profile);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  me,
  async uploadAvatar(req, res, next) {
    try {
      if (!req.file) {
        return next(
          new ApiError(400, "validation_error", "Avatar image file is required.")
        );
      }

      const url = `/api/backend/uploads/profile_pictures/${req.file.filename}`;
      const profile = await profileService.updateProfilePicture(req.user, url);

      return sendSuccess(res, profile, 200);
    } catch (error) {
      return next(error);
    }
  },
  async getUserReviews(req, res, next) {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const offset = (page - 1) * limit;

      const reviews = await profileService.getUserReviews(req.params.id, limit, offset);
      return sendSuccess(res, reviews);
    } catch (error) {
      return next(error);
    }
  },
};
