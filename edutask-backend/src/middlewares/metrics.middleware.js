const metrics = {
  counters: {
    http_requests_total: 0,
    http_4xx_total: 0,
    http_5xx_total: 0,
    escrow_release_total: 0,
    escrow_refund_total: 0,
    dispute_created_total: 0,
    dispute_resolved_total: 0,
    rate_limit_hits_total: 0,
    idempotency_replay_total: 0,
    automation_expire_total: 0,
    unhandled_promise_rejections_total: 0,
    transaction_rollbacks_total: 0,
    transaction_retries_total: 0,
    deadlock_total: 0,
    escrow_double_release_attempt_total: 0,
    negative_balance_attempt_total: 0,
    invalid_state_transition_attempt_total: 0,
  },
  histograms: {
    http_request_duration_ms: [50, 100, 250, 500, 1000, 2000, 5000],
    db_query_duration_ms: [5, 10, 25, 50, 100, 250, 500, 1000, 2000],
  },
  histogramCounts: {
    http_request_duration_ms: {},
    db_query_duration_ms: {},
  },
};

function observeHistogram(name, value) {
  const buckets = metrics.histograms[name];
  const store = metrics.histogramCounts[name];
  for (const bucket of buckets) {
    const key = `le_${bucket}`;
    if (!store[key]) {
      store[key] = 0;
    }
    if (value <= bucket) {
      store[key] += 1;
    }
  }
  if (!store.le_inf) {
    store.le_inf = 0;
  }
  store.le_inf += 1;
}

function increment(name, value = 1) {
  if (!Object.prototype.hasOwnProperty.call(metrics.counters, name)) {
    return;
  }
  metrics.counters[name] += value;
}

function metricsMiddleware() {
  return function trackMetrics(req, res, next) {
    const startedAt = Date.now();
    metrics.counters.http_requests_total += 1;
    res.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      observeHistogram("http_request_duration_ms", durationMs);
      if (res.statusCode >= 400 && res.statusCode < 500) {
        metrics.counters.http_4xx_total += 1;
      } else if (res.statusCode >= 500) {
        metrics.counters.http_5xx_total += 1;
      }
    });
    next();
  };
}

function formatCounter(name, value) {
  return `${name} ${value}`;
}

function formatHistogram(name) {
  const buckets = metrics.histograms[name];
  const store = metrics.histogramCounts[name];
  const lines = [];
  for (const bucket of buckets) {
    lines.push(`${name}_bucket{le="${bucket}"} ${store[`le_${bucket}`] || 0}`);
  }
  lines.push(`${name}_bucket{le="+Inf"} ${store.le_inf || 0}`);
  lines.push(`${name}_count ${store.le_inf || 0}`);
  return lines;
}

function metricsHandler() {
  return async function getMetrics(_req, res, next) {
    try {
      let poolStats = {
        active: 0,
        total: 0,
        idle: 0,
        waiting: 0,
      };
      try {
        const { pool } = require("../config/db");
        poolStats = {
          active: pool.totalCount - pool.idleCount,
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
        };
      } catch (_) {
        // Metrics endpoint stays available even if DB module is not loadable.
      }

      const lines = [];
      for (const [name, value] of Object.entries(metrics.counters)) {
        lines.push(formatCounter(name, value));
      }
      for (const name of Object.keys(metrics.histograms)) {
        lines.push(...formatHistogram(name));
      }

      lines.push(`active_db_connections ${poolStats.active}`);
      lines.push(`db_pool_total_connections ${poolStats.total}`);
      lines.push(`db_pool_idle_connections ${poolStats.idle}`);
      lines.push(`db_pool_waiting_clients ${poolStats.waiting}`);

      res.setHeader("content-type", "text/plain; version=0.0.4; charset=utf-8");
      res.status(200).send(`${lines.join("\n")}\n`);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  metricsMiddleware,
  metricsHandler,
  increment,
  observeHistogram,
};
