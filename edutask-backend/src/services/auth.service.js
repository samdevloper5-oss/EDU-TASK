const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { withSerializableTransaction } = require("../utils/transaction");
const userRepo = require("../repositories/user.repo");
const authTokenRepo = require("../repositories/auth_token.repo");
const userService = require("./user.service");
const referralService = require("./referral.service");
const auditService = require("./audit.service");
const emailService = require("./email.service");
const { ApiError } = require("../utils/http");
const env = require("../config/env");
const { normalizeSkillList } = require("../utils/skills");

const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function assertEmail(email) {
  const normalized = normalizeEmail(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    throw new ApiError(400, "invalid_email", "A valid email is required.");
  }
  return normalized;
}

function assertPassword(password) {
  if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(
      400,
      "password_too_short",
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      { min_length: MIN_PASSWORD_LENGTH }
    );
  }
}

function assertRequiredSignupFields(payload) {
  const required = [
    "full_name",
    "university_name",
    "department",
    "student_id",
    "location",
    "phone",
    "email",
    "password",
  ];

  for (const key of required) {
    if (payload[key] == null || String(payload[key]).trim() === "") {
      throw new ApiError(400, "validation_error", `${key} is required.`);
    }
  }

  if (!Array.isArray(payload.skills) || payload.skills.length === 0) {
    throw new ApiError(
      400,
      "validation_error",
      "skills must contain at least one entry."
    );
  }
}

function normalizePhoneInput(rawPhone) {
  const banglaDigitMap = {
    "\u09E6": "0",
    "\u09E7": "1",
    "\u09E8": "2",
    "\u09E9": "3",
    "\u09EA": "4",
    "\u09EB": "5",
    "\u09EC": "6",
    "\u09ED": "7",
    "\u09EE": "8",
    "\u09EF": "9",
  };

  const normalizedDigits = String(rawPhone || "")
    .trim()
    .replace(/[\u09E6-\u09EF]/g, (digit) => banglaDigitMap[digit] || digit);

  let compact = normalizedDigits.replace(/[()\s-]/g, "");
  if (compact.startsWith("+")) {
    compact = `+${compact.slice(1).replace(/\+/g, "")}`;
  } else {
    compact = compact.replace(/\+/g, "");
  }
  return compact;
}

function assertAndNormalizePhone(rawPhone) {
  const phone = normalizePhoneInput(rawPhone);
  if (!/^\+?[0-9]{8,15}$/.test(phone)) {
    throw new ApiError(
      400,
      "invalid_phone",
      "Phone must be numeric (8-15 digits, optional leading +)."
    );
  }
  return phone;
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    university_name: user.university_name,
    department: user.department,
    student_id: user.student_id,
    location: user.location,
    phone: user.phone,
    skills: user.skills || [],
    profile_picture_url: user.profile_picture_url,
    role: user.role,
    is_verified: user.is_verified,
    email_verified: user.email_verified,
    phone_verified: user.phone_verified,
    referral_code: user.referral_code || null,
    referred_by: user.referred_by || null,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(String(rawToken)).digest("hex");
}

function decodeExpiry(token) {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== "object" || !decoded.exp) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  return new Date(Number(decoded.exp) * 1000);
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      token_type: "access",
      email: user.email,
      role: user.role,
      email_verified: user.email_verified,
      phone_verified: user.phone_verified,
      is_active: user.is_active,
      is_suspended: user.is_suspended,
    },
    env.security.jwt.secret,
    {
      subject: user.id,
      issuer: env.security.jwt.issuer,
      audience: env.security.jwt.audience,
      expiresIn: env.security.jwt.accessTtl,
    }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      token_type: "refresh",
      email: user.email,
      role: user.role,
    },
    env.security.jwt.refreshSecret,
    {
      subject: user.id,
      issuer: env.security.jwt.issuer,
      audience: env.security.jwt.audience,
      expiresIn: env.security.jwt.refreshTtl,
    }
  );
}

async function signup(payload) {
  assertRequiredSignupFields(payload);
  const email = assertEmail(payload.email);
  const phone = assertAndNormalizePhone(payload.phone);
  assertPassword(payload.password);

  return withSerializableTransaction(async (client) => {
    const existingEmail = await userRepo.getUserByEmail(client, email, true);
    if (existingEmail) {
      throw new ApiError(409, "email_exists", "Email is already registered.");
    }

    const existingPhone = await userRepo.getUserByPhone(client, phone, true);
    if (existingPhone) {
      throw new ApiError(409, "phone_exists", "Phone is already registered.");
    }

    const existingStudentId = await userRepo.getUserByStudentId(
      client,
      payload.student_id,
      true
    );
    if (existingStudentId) {
      throw new ApiError(
        409,
        "student_id_exists",
        "Student ID is already registered."
      );
    }

    const password_hash = await bcrypt.hash(payload.password, 12);

    let user;
    try {
      const created = await userService.createUserWithProfileAndWallet(client, {
        email,
        phone,
        student_id: payload.student_id,
        password_hash,
        full_name: payload.full_name,
        university_name: payload.university_name,
        department: payload.department,
        location: payload.location,
        skills: normalizeSkillList(payload.skills),
        profile_image_url: payload.profile_picture_url || null,
        role: "student",
      });
      user = created.user;
      await referralService.ensureUserReferralCode(client, user);
      if (payload.referral_code) {
        await referralService.attachReferralToNewUser(client, {
          userId: user.id,
          referralCode: payload.referral_code,
        });
      }
      user = await userRepo.getUserById(client, user.id, true);
    } catch (error) {
      if (error && error.code === "23505") {
        if (String(error.constraint || "").includes("email")) {
          throw new ApiError(409, "email_exists", "Email is already registered.");
        }
        if (String(error.constraint || "").includes("phone")) {
          throw new ApiError(409, "phone_exists", "Phone is already registered.");
        }
        if (String(error.constraint || "").includes("student_id")) {
          throw new ApiError(
            409,
            "student_id_exists",
            "Student ID is already registered."
          );
        }
      }
      if (error && error.code === "42703") {
        throw new ApiError(
          500,
          "auth_schema_not_ready",
          "Auth schema is not ready. Run `npm run migrate:auth` and restart backend."
        );
      }
      throw error;
    }

    await auditService.logEvent(client, {
      user_id: user.id,
      action: "user_registered",
      entity_type: "user",
      entity_id: user.id,
    });

    const access_token = generateAccessToken(user);
    const refresh_token = generateRefreshToken(user);
    await authTokenRepo.insertRefreshToken(client, {
      user_id: user.id,
      token_hash: hashToken(refresh_token),
      expires_at: decodeExpiry(refresh_token),
    });

    // Email verification
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await userRepo.updateEmailVerificationInfo(client, user.id, {
      token: verificationToken,
      expiresAt,
    });
    // In production, failure to send email shouldn't rollback signup, 
    // but here we fire and forget (or handle errors as warnings)
    try {
      await emailService.sendVerificationEmail(email, verificationToken);
    } catch (e) {
      console.error("Failed to send verification email:", e);
    }

    return { user: toPublicUser(user), access_token, refresh_token };
  }, { operation: "auth_signup" });
}

async function login({ email, password }) {
  const normalizedEmail = assertEmail(email);
  assertPassword(password);

  return withSerializableTransaction(async (client) => {
    let user;
    try {
      user = await userRepo.getUserByEmail(client, normalizedEmail, true);
    } catch (error) {
      if (error && error.code === "42703") {
        throw new ApiError(
          500,
          "auth_schema_not_ready",
          "Auth schema is not ready. Run `npm run migrate:auth` and restart backend."
        );
      }
      throw error;
    }
    if (!user) {
      throw new ApiError(401, "invalid_credentials", "Invalid email or password.");
    }

    const validPassword = await bcrypt.compare(password, user.password_hash || "");
    if (!validPassword) {
      throw new ApiError(401, "invalid_credentials", "Invalid email or password.");
    }

    if (user.is_active === false || user.is_suspended === true) {
      throw new ApiError(403, "account_blocked", "Account is not allowed to login.");
    }

    await userRepo.touchLastLogin(client, user.id);
    const access_token = generateAccessToken(user);
    const refresh_token = generateRefreshToken(user);
    await authTokenRepo.insertRefreshToken(client, {
      user_id: user.id,
      token_hash: hashToken(refresh_token),
      expires_at: decodeExpiry(refresh_token),
    });
    return { user: toPublicUser(user), access_token, refresh_token };
  }, { operation: "auth_login" });
}

async function getCurrentUser(userId) {
  return withSerializableTransaction(async (client) => {
    const user = await userRepo.getUserById(client, userId);
    if (!user) {
      throw new ApiError(404, "user_not_found", "User not found.");
    }
    return toPublicUser(user);
  }, { operation: "auth_me" });
}

async function refreshTokens(refreshToken) {
  if (!refreshToken) {
    throw new ApiError(401, "refresh_token_missing", "Refresh token is required.");
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, env.security.jwt.refreshSecret, {
      algorithms: ["HS256"],
      issuer: env.security.jwt.issuer,
      audience: env.security.jwt.audience,
    });
  } catch (_) {
    throw new ApiError(401, "invalid_refresh_token", "Invalid or expired refresh token.");
  }

  if (payload.token_type !== "refresh") {
    throw new ApiError(401, "invalid_refresh_token", "Invalid refresh token type.");
  }

  return withSerializableTransaction(async (client) => {
    const tokenHash = hashToken(refreshToken);
    const record = await authTokenRepo.getRefreshTokenByHash(client, tokenHash, true);
    if (!record || record.revoked_at || new Date(record.expires_at).getTime() <= Date.now()) {
      throw new ApiError(401, "invalid_refresh_token", "Refresh token expired or revoked.");
    }

    await authTokenRepo.revokeRefreshToken(client, record.id);
    await authTokenRepo.blacklistToken(client, {
      token_hash: tokenHash,
      token_type: "refresh",
      user_id: record.user_id,
      expires_at: record.expires_at,
    });

    const user = await userRepo.getUserById(client, payload.sub);
    if (!user) {
      throw new ApiError(404, "user_not_found", "User not found.");
    }

    const access_token = generateAccessToken(user);
    const nextRefreshToken = generateRefreshToken(user);
    await authTokenRepo.insertRefreshToken(client, {
      user_id: user.id,
      token_hash: hashToken(nextRefreshToken),
      expires_at: decodeExpiry(nextRefreshToken),
    });

    return {
      access_token,
      refresh_token: nextRefreshToken,
      user: toPublicUser(user),
    };
  }, { operation: "auth_refresh" });
}

async function logout({ accessToken, refreshToken, userId }) {
  // same as before...
  return withSerializableTransaction(async (client) => {
    if (refreshToken) {
      const refreshHash = hashToken(refreshToken);
      const refreshRow = await authTokenRepo.getRefreshTokenByHash(
        client,
        refreshHash,
        true
      );
      if (refreshRow) {
        await authTokenRepo.revokeRefreshToken(client, refreshRow.id);
        await authTokenRepo.blacklistToken(client, {
          token_hash: refreshHash,
          token_type: "refresh",
          user_id: refreshRow.user_id,
          expires_at: refreshRow.expires_at,
        });
      }
    }

    if (accessToken) {
      const accessHash = hashToken(accessToken);
      let expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      try {
        expiresAt = decodeExpiry(accessToken);
      } catch (_) {
        // fallback ttl is enough for blacklist expiry.
      }
      await authTokenRepo.blacklistToken(client, {
        token_hash: accessHash,
        token_type: "access",
        user_id: userId || null,
        expires_at: expiresAt,
      });
    }

    return { logged_out: true };
  }, { operation: "auth_logout" });
}

async function verifyEmail(token) {
  if (!token) {
    throw new ApiError(400, "token_required", "Verification token is required.");
  }

  return withSerializableTransaction(async (client) => {
    const user = await userRepo.getUserByVerificationToken(client, token, true);
    if (!user) {
      throw new ApiError(404, "invalid_token", "Invalid or expired verification token.");
    }

    if (new Date(user.email_verification_expires_at).getTime() < Date.now()) {
      throw new ApiError(400, "token_expired", "Verification token has expired.");
    }

    await userRepo.markEmailVerified(client, user.id);
    await auditService.logEvent(client, {
      user_id: user.id,
      action: "email_verified",
      entity_type: "user",
      entity_id: user.id,
    });

    return { verified: true };
  }, { operation: "auth_verify_email" });
}

async function resendVerificationEmail(email) {
  const normalizedEmail = assertEmail(email);

  return withSerializableTransaction(async (client) => {
    const user = await userRepo.getUserByEmail(client, normalizedEmail, true);
    if (!user) {
      // For security, don't reveal if email exists.
      return { success: true };
    }

    if (user.email_verified) {
      return { success: true, already_verified: true };
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await userRepo.updateEmailVerificationInfo(client, user.id, {
      token: verificationToken,
      expiresAt,
    });

    await emailService.sendVerificationEmail(user.email, verificationToken);
    return { success: true };
  }, { operation: "auth_resend_verification" });
}

module.exports = {
  signup,
  login,
  getCurrentUser,
  refreshTokens,
  logout,
  verifyEmail,
  resendVerificationEmail,
  hashToken,
};
