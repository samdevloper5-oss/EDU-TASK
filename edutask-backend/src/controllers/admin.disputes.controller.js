const disputeService = require("../services/dispute.service");
const { ApiError, sendSuccess } = require("../utils/http");

async function getDisputeContext(req, res, next) {
  try {
    const adminUser = req.user;
    const { disputeId } = req.params;

    const context = await disputeService.getDisputeContextForAdmin(
      adminUser,
      disputeId
    );

    return sendSuccess(res, context);
  } catch (err) {
    return next(err);
  }
}

async function resolveDispute(req, res, next) {
  try {
    const adminUser = req.user;
    const { disputeId } = req.params;
    const { outcome, admin_decision, admin_decision_fund_allocation, executorId } =
      req.body || {};

    if (admin_decision && String(admin_decision).length > 2000) {
      return next(
        new ApiError(400, "validation_error", "admin_decision exceeds max length.")
      );
    }

    const dispute = await disputeService.resolveDispute(adminUser, disputeId, {
      outcome,
      admin_decision,
      admin_decision_fund_allocation,
      executorId,
    });

    return sendSuccess(res, dispute);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getDisputeContext,
  resolveDispute,
};
