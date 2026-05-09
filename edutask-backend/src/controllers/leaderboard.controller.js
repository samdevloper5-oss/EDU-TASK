const leaderboardService = require("../services/leaderboard.service");
const { parsePagination } = require("../utils/pagination");
const { sendPaginatedSuccess } = require("../utils/http");

async function listLeaderboard(req, res, next) {
  try {
    const { page, limit } = parsePagination(req.query, { limit: 20, maxLimit: 100 });
    const result = await leaderboardService.getLeaderboard({
      filter: req.query.filter,
      page,
      limit,
    });
    return sendPaginatedSuccess(res, result.items, result.pagination, 200, {
      filter: result.filter,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listLeaderboard,
};
