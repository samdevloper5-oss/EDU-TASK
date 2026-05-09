// Environment configuration with strict validation.
// Single source of configuration: process.env.

const NODE_ENVS = new Set(["development", "test", "staging", "production"]);

function requireVar(name) {
  const value = process.env[name];
  if (value == null || String(value).trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

function optionalVar(name) {
  const value = process.env[name];
  if (value == null || String(value).trim() === "") {
    return null;
  }
  return String(value).trim();
}

function parseNumber(name) {
  const value = Number(requireVar(name));
  if (Number.isNaN(value)) {
    throw new Error(`${name} must be a valid number.`);
  }
  return value;
}

function parseBool(name, fallback = null) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === "") {
    if (fallback == null) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return fallback;
  }
  if (raw !== "true" && raw !== "false") {
    throw new Error(`${name} must be 'true' or 'false'.`);
  }
  return raw === "true";
}

const nodeEnv = requireVar("NODE_ENV");
if (!NODE_ENVS.has(nodeEnv)) {
  throw new Error("NODE_ENV must be one of: development, test, staging, production.");
}

const databaseUrl = requireVar("DATABASE_URL");
const supabasePoolerUrl = requireVar("SUPABASE_DB_POOLER_URL");
const supabaseDirectUrl = requireVar("SUPABASE_DB_DIRECT_URL");
const dbSsl = parseBool("DB_SSL", nodeEnv !== "test")
  || process.env.PGSSLMODE === "require";

if (nodeEnv === "production" && databaseUrl !== supabasePoolerUrl) {
  throw new Error(
    "In production, DATABASE_URL must exactly match SUPABASE_DB_POOLER_URL."
  );
}
if (nodeEnv === "production" && !dbSsl) {
  throw new Error("DB_SSL must be enabled in production.");
}

const env = {
  nodeEnv,
  app: {
    port: parseNumber("PORT"),
    version: requireVar("APP_VERSION"),
    logLevel: requireVar("LOG_LEVEL"),
  },
  security: {
    corsAllowedOrigins: requireVar("CORS_ALLOWED_ORIGINS")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
    jwt: {
      secret: requireVar("JWT_SECRET"),
      refreshSecret: optionalVar("JWT_REFRESH_SECRET") || requireVar("JWT_SECRET"),
      issuer: requireVar("JWT_ISSUER"),
      audience: requireVar("JWT_AUDIENCE"),
      accessTtl: optionalVar("JWT_ACCESS_TTL") || "15m",
      refreshTtl: optionalVar("JWT_REFRESH_TTL") || "7d",
    },
  },
  supabase: {
    directUrl: supabaseDirectUrl,
    poolerUrl: supabasePoolerUrl,
    serviceRoleKey: optionalVar("SUPABASE_SERVICE_ROLE_KEY"),
    anonKey: optionalVar("SUPABASE_ANON_KEY"),
  },
  pg: {
    connectionString: databaseUrl,
    host: optionalVar("PGHOST"),
    port: process.env.PGPORT ? Number(process.env.PGPORT) : null,
    user: optionalVar("PGUSER"),
    password: optionalVar("PGPASSWORD"),
    database: optionalVar("PGDATABASE"),
    ssl: dbSsl,
  },
  automation: {
    enabled: parseBool("ENABLE_AUTOMATION"),
    dryRun: parseBool("AUTOMATION_DRY_RUN"),
  },
  rateLimit: {
    enabled: parseBool("ENABLE_RATE_LIMITS"),
  },
  idempotency: {
    enabled: parseBool("ENABLE_IDEMPOTENCY"),
  },
  bodyLimit: {
    json: requireVar("JSON_BODY_LIMIT"),
    urlencoded: requireVar("URLENCODED_BODY_LIMIT"),
  },
  slowQuery: {
    thresholdMs: parseNumber("SLOW_QUERY_LOG_MS"),
  },
  performance: {
    pgPoolMax: Number(process.env.PGPOOL_MAX || 20),
    serializableTxnWarnMs: Number(process.env.SERIALIZABLE_TXN_WARN_MS || 1500),
    loadMemoryLogIntervalMs: Number(process.env.LOAD_MEMORY_LOG_INTERVAL_MS || 5000),
  },
  finance: {
    platformFeePercentage: Number(process.env.PLATFORM_FEE_PERCENTAGE || 10),
    referralRewardAmount: Number(process.env.REFERRAL_REWARD_AMOUNT || 5),
  },
  redis: {
    url: optionalVar("REDIS_URL"),
  },
};

if (env.security.corsAllowedOrigins.length === 0) {
  throw new Error("CORS_ALLOWED_ORIGINS must contain at least one origin.");
}
if (
  env.nodeEnv === "production" &&
  env.security.corsAllowedOrigins.includes("*")
) {
  throw new Error("Wildcard CORS origin is not allowed in production.");
}
if (env.pg.port != null && Number.isNaN(env.pg.port)) {
  throw new Error("PGPORT must be numeric when provided.");
}
if (
  Number.isNaN(env.performance.pgPoolMax) ||
  env.performance.pgPoolMax <= 0
) {
  throw new Error("PGPOOL_MAX must be a positive number when provided.");
}
if (
  Number.isNaN(env.performance.serializableTxnWarnMs) ||
  env.performance.serializableTxnWarnMs <= 0
) {
  throw new Error("SERIALIZABLE_TXN_WARN_MS must be a positive number when provided.");
}
if (
  Number.isNaN(env.performance.loadMemoryLogIntervalMs) ||
  env.performance.loadMemoryLogIntervalMs <= 0
) {
  throw new Error("LOAD_MEMORY_LOG_INTERVAL_MS must be a positive number when provided.");
}
if (
  Number.isNaN(env.finance.platformFeePercentage) ||
  env.finance.platformFeePercentage < 0 ||
  env.finance.platformFeePercentage > 100
) {
  throw new Error("PLATFORM_FEE_PERCENTAGE must be between 0 and 100.");
}
if (
  Number.isNaN(env.finance.referralRewardAmount) ||
  env.finance.referralRewardAmount < 0
) {
  throw new Error("REFERRAL_REWARD_AMOUNT must be a non-negative number.");
}

module.exports = env;
