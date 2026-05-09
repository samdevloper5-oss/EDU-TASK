const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const env = require("../config/env");
const { sendError } = require("../utils/http");
const { pool } = require("../config/db");
const authTokenRepo = require("../repositories/auth_token.repo");

const AUTH_COOKIE = "edutask_session";

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(String(rawToken)).digest("hex");
}

function requireAuth(req, res, next) {
  if (req.user && req.user.id) {
    next();
    return;
  }

  const authHeader = req.headers.authorization || "";
  const [scheme, bearerToken] = authHeader.split(" ");
  const cookies = parseCookies(req.headers.cookie || "");
  const token =
    scheme === "Bearer" && bearerToken ? bearerToken : cookies[AUTH_COOKIE];

  if (!token) {
    sendError(res, {
      statusCode: 401,
      code: "unauthorized",
      message: "Authentication required.",
    });
    return;
  }

  (async () => {
    const payload = jwt.verify(token, env.security.jwt.secret, {
      algorithms: ["HS256"],
      issuer: env.security.jwt.issuer,
      audience: env.security.jwt.audience,
    });
    if (payload.token_type && payload.token_type !== "access") {
      throw new Error("invalid_token_type");
    }
    if (!payload || (!payload.sub && !payload.id)) {
      throw new Error("invalid_payload");
    }

    const tokenHash = hashToken(token);
    const blacklisted = await authTokenRepo.isTokenBlacklisted(
      { query: (...args) => pool.query(...args) },
      tokenHash
    );
    if (blacklisted) {
      throw new Error("token_blacklisted");
    }

    const userResult = await pool.query(
      `
        SELECT id, role, email, email_verified, phone_verified, is_active, is_suspended
        FROM users
        WHERE id = $1
          AND COALESCE(is_deleted, FALSE) = FALSE
        LIMIT 1
      `,
      [payload.sub || payload.id]
    );
    if (userResult.rowCount === 0) {
      throw new Error("user_not_found");
    }
    const userRow = userResult.rows[0];
    if (userRow.is_active === false || userRow.is_suspended === true) {
      throw new Error("user_blocked");
    }

    req.user = {
      id: userRow.id,
      role: userRow.role,
      email: userRow.email,
      email_verified: userRow.email_verified,
      phone_verified: userRow.phone_verified,
      is_active: userRow.is_active,
      is_suspended: userRow.is_suspended,
    };
    next();
  })().catch(() => {
    sendError(res, {
      statusCode: 401,
      code: "unauthorized",
      message: "Invalid or expired token.",
    });
  });
}

module.exports = {
  requireAuth,
};
