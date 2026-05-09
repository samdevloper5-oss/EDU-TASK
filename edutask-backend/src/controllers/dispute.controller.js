const disputeService = require("../services/dispute.service");
const { ApiError, sendSuccess } = require("../utils/http");

async function createDispute(req, res, next) {
  try {
    const filer = req.user;
    const { taskId } = req.params;
    const { dispute_type, description, evidence } = req.body || {};

    if (description && String(description).length > 2000) {
      return next(
        new ApiError(400, "validation_error", "description exceeds max length.")
      );
    }

    const dispute = await disputeService.createDispute(filer, {
      taskId,
      dispute_type,
      description,
      evidence,
    });

    return sendSuccess(res, dispute, 201);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createDispute,
};
