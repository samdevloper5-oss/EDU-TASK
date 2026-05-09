function setTestEnv() {
  process.env.NODE_ENV = "test";
  process.env.PORT = "3001";
  process.env.APP_VERSION = "test";
  process.env.LOG_LEVEL = "debug";
  process.env.CORS_ALLOWED_ORIGINS = "http://localhost:3001";
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_ISSUER = "test-issuer";
  process.env.JWT_AUDIENCE = "test-audience";
  process.env.PGHOST = "localhost";
  process.env.PGPORT = "5432";
  process.env.PGUSER = "test";
  process.env.PGPASSWORD = "test";
  process.env.PGDATABASE = "test";
  process.env.SUPABASE_DB_DIRECT_URL =
    "postgresql://postgres:test@db.test.supabase.co:5432/postgres";
  process.env.SUPABASE_DB_POOLER_URL =
    "postgresql://postgres.test:test@aws-1-ap-south-1.pooler.supabase.com:6543/postgres";
  process.env.DATABASE_URL = process.env.SUPABASE_DB_POOLER_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.DB_SSL = "false";
  process.env.ENABLE_AUTOMATION = "true";
  process.env.AUTOMATION_DRY_RUN = "false";
  process.env.ENABLE_RATE_LIMITS = "true";
  process.env.ENABLE_IDEMPOTENCY = "true";
  process.env.JSON_BODY_LIMIT = "100kb";
  process.env.URLENCODED_BODY_LIMIT = "100kb";
  process.env.SLOW_QUERY_LOG_MS = "250";
}

module.exports = {
  setTestEnv,
};
