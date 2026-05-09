const { createRateLimiter, keyByIpAndUser } = require("./rate_limit.middleware");

// Shared limiter for high-risk money/state mutation routes.
const financialMutationRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 12,
  keyFn: keyByIpAndUser,
  name: "financial_mutation",
});

module.exports = {
  financialMutationRateLimit,
};

