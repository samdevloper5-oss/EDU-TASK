const referralService = require("../services/referral.service");
const { sendPaginatedSuccess, sendSuccess } = require("../utils/http");
const { parsePagination } = require("../utils/pagination");

async function getMyReferrals(req, res, next) {
  try {
    const { page, limit } = parsePagination(req.query, { limit: 20, maxLimit: 100 });
    const result = await referralService.getMyReferrals(req.user, { page, limit });
    return sendPaginatedSuccess(res, result.rows, result.pagination, 200, {
      stats: result.stats,
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyReferralStats(req, res, next) {
  try {
    const stats = await referralService.getMyReferralStats(req.user);
    return sendSuccess(res, stats);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMyReferrals,
  getMyReferralStats,
};
