#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function requireEnv(name) {
  const value = process.env[name];
  if (!value || String(value).trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseBoolEnv(name, fallback = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === "") {
    return fallback;
  }
  if (raw !== "true" && raw !== "false") {
    throw new Error(`${name} must be 'true' or 'false' when provided.`);
  }
  return raw === "true";
}

function resolveSqlPath(relativePath) {
  const resolved = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`SQL file not found: ${resolved}`);
  }
  return resolved;
}

function maskConnString(connectionString) {
  return connectionString.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
}

async function run() {
  const relativePath = process.argv[2];
  if (!relativePath) {
    throw new Error("Usage: node scripts/run-sql-file.js <sql-file-path>");
  }

  const nodeEnv = process.env.NODE_ENV || "development";
  const directUrl = requireEnv("SUPABASE_DB_DIRECT_URL");
  const dbSsl = parseBoolEnv("DB_SSL", nodeEnv !== "test");
  const pgSslModeRequire = process.env.PGSSLMODE === "require";
  const sslEnabled = dbSsl || pgSslModeRequire;

  if (nodeEnv === "production" && !sslEnabled) {
    throw new Error("SSL is mandatory in production migrations. Set DB_SSL=true.");
  }

  const sqlPath = resolveSqlPath(relativePath);
  const sql = fs.readFileSync(sqlPath, "utf8");
  if (!sql || sql.trim().length === 0) {
    throw new Error(`SQL file is empty: ${sqlPath}`);
  }

  const client = new Client({
    connectionString: directUrl,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  });

  const startedAt = Date.now();
  // eslint-disable-next-line no-console
  console.log(
    `[migration] starting file=${relativePath} env=${nodeEnv} direct_url=${maskConnString(directUrl)} ssl=${sslEnabled}`
  );

  try {
    await client.connect();
    await client.query({ text: sql, simple: true });
    const durationMs = Date.now() - startedAt;
    // eslint-disable-next-line no-console
    console.log(
      `[migration] success file=${relativePath} duration_ms=${durationMs}`
    );
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    // eslint-disable-next-line no-console
    console.error(
      `[migration] failed file=${relativePath} duration_ms=${durationMs} code=${error.code || "unknown"} message=${error.message}`
    );
    throw error;
  } finally {
    await client.end();
  }
}

run().catch(() => {
  process.exit(1);
});
