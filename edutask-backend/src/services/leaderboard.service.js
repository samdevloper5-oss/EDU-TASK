const { withSerializableTransaction } = require("../utils/transaction");
const leaderboardRepo = require("../repositories/leaderboard.repo");
const { getCache, setCache, deleteByPrefix } = require("../config/cache");
const { buildPagination } = require("../utils/pagination");

function getFromDate(filter) {
  const now = Date.now();
  if (filter === "weekly") {
    return new Date(now - 7 * 24 * 60 * 60 * 1000);
  }
  if (filter === "monthly") {
    return new Date(now - 30 * 24 * 60 * 60 * 1000);
  }
  return null;
}

function normalizeFilter(rawFilter) {
  const value = String(rawFilter || "all").toLowerCase();
  if (value === "weekly" || value === "monthly" || value === "all") {
    return value;
  }
  return "all";
}

function cacheKey(filter, page, limit) {
  return `leaderboard:${filter}:${page}:${limit}`;
}

async function getLeaderboard({ filter, page, limit }) {
  const normalizedFilter = normalizeFilter(filter);
  const key = cacheKey(normalizedFilter, page, limit);
  const cached = await getCache(key);
  if (cached) {
    return cached;
  }

  const offset = (page - 1) * limit;
  const fromDate = getFromDate(normalizedFilter);

  const result = await withSerializableTransaction(async (client) => {
    const rows = await leaderboardRepo.listTopEarners(client, {
      fromDate,
      limit,
      offset,
    });
    const total = rows.length > 0 ? Number(rows[0].total_count || 0) : 0;
    const items = rows.map((row, index) => ({
      rank: offset + index + 1,
      user_id: row.user_id,
      full_name: row.full_name,
      university_name: row.university_name,
      profile_picture_url: row.profile_picture_url,
      total_earnings: Number(row.total_earnings || 0),
      completed_tasks: Number(row.completed_tasks || 0),
      trust_score: Number(row.trust_score || 0),
    }));
    return {
      items,
      pagination: buildPagination(page, limit, total),
      filter: normalizedFilter,
    };
  }, { operation: "leaderboard_list" });

  await setCache(key, result, 60);
  return result;
}

async function invalidateLeaderboardCache() {
  await deleteByPrefix("leaderboard:");
}

module.exports = {
  getLeaderboard,
  invalidateLeaderboardCache,
};
