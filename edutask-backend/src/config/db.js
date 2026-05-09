// PostgreSQL pool configuration.
// Guarantee: all connections use validated environment configuration.

const { Pool } = require("pg");
const env = require("./env");
const logger = require("./logger");
const { observeHistogram } = require("../middlewares/metrics.middleware");

const pool = new Pool({
  connectionString: env.pg.connectionString,
  host: env.pg.connectionString ? undefined : env.pg.host,
  port: env.pg.connectionString ? undefined : env.pg.port,
  user: env.pg.connectionString ? undefined : env.pg.user,
  password: env.pg.connectionString ? undefined : env.pg.password,
  database: env.pg.connectionString ? undefined : env.pg.database,
  max: env.performance.pgPoolMax,
  ssl: env.pg.ssl ? { rejectUnauthorized: false } : undefined,
});

const originalQuery = pool.query.bind(pool);
pool.query = async (...args) => {
  const start = Date.now();
  try {
    const result = await originalQuery(...args);
    const duration = Date.now() - start;
    observeHistogram("db_query_duration_ms", duration);
    if (duration > env.slowQuery.thresholdMs) {
      logger.warn("slow_query_detected", { duration_ms: duration });
    }
    return result;
  } catch (error) {
    logger.error("db_query_failed", { message: error.message });
    throw error;
  }
};

async function getClient() {
  return pool.connect();
}

module.exports = {
  pool,
  getClient,
};
