function parsePagination(query = {}, defaults = {}) {
  const defaultPage = defaults.page || 1;
  const defaultLimit = defaults.limit || 20;
  const maxLimit = defaults.maxLimit || 100;

  const pageRaw = Number(query.page ?? defaultPage);
  const limitRaw = Number(query.limit ?? defaultLimit);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : defaultPage;
  const limitPre = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : defaultLimit;
  const limit = Math.min(limitPre, maxLimit);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function buildPagination(page, limit, total) {
  const normalizedTotal = Number(total) || 0;
  return {
    page,
    limit,
    total: normalizedTotal,
    totalPages: normalizedTotal === 0 ? 0 : Math.ceil(normalizedTotal / limit),
  };
}

module.exports = {
  parsePagination,
  buildPagination,
};
