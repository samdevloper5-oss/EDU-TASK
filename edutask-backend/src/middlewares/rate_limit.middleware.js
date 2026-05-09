const env = require("../config/env");
const logger = require("../config/logger");
const { increment } = require("./metrics.middleware");
const { sendError } = require("../utils/http");

function createRateLimiter({ windowMs, max, keyFn, name }) {
  const hits = new Map();

  return function rateLimiter(req, res, next) {
    if (!env.rateLimit.enabled) {
      return next();
    }

    const now = Date.now();
    const key = keyFn(req);
    const entry = hits.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }

    entry.count += 1;
    hits.set(key, entry);

    if (entry.count > max) {
      increment("rate_limit_hits_total");
      logger.warn("rate_limit_hit", {
        limiter: name,
        key,
        request_id: req.requestId,
        path: req.originalUrl,
      });
      sendError(res, {
        statusCode: 429,
        code: "rate_limited",
        message: "Too many requests",
        details: {
          retry_after_ms: Math.max(entry.resetAt - now, 0),
          limiter: name,
        },
        requestId: req.requestId,
      });
      return;
    }

    next();
  };
}

function keyByIpAndUser(req) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const userId = req.user && req.user.id ? req.user.id : "anon";
  return `${ip}:${userId}`;
}

module.exports = {
  createRateLimiter,
  keyByIpAndUser,
};
