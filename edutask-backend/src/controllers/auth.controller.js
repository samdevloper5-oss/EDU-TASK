const authService = require("../services/auth.service");
const { sendSuccess } = require("../utils/http");
const env = require("../config/env");

const AUTH_COOKIE = "edutask_session";
const REFRESH_COOKIE = "edutask_refresh";
const ROLE_COOKIE = "edutask_role";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const FIFTEEN_MIN_MS = 15 * 60 * 1000;

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function setAuthCookies(res, { accessToken, refreshToken, role }) {
  const secure = env.nodeEnv === "production";
  res.cookie(AUTH_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: FIFTEEN_MIN_MS,
  });

  if (refreshToken) {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "strict",
      path: "/",
      maxAge: ONE_WEEK_MS,
    });
  }

  res.cookie(ROLE_COOKIE, role || "student", {
    httpOnly: false,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: ONE_WEEK_MS,
  });
}

function clearAuthCookies(res) {
  const secure = env.nodeEnv === "production";
  const options = {
    secure,
    sameSite: "strict",
    path: "/",
  };
  res.clearCookie(AUTH_COOKIE, { ...options, httpOnly: true });
  res.clearCookie(REFRESH_COOKIE, { ...options, httpOnly: true });
  res.clearCookie(ROLE_COOKIE, { ...options, httpOnly: false });
}

async function signup(req, res, next) {
  try {
    const rawBody = req.body || {};
    let skills = rawBody.skills;
    if (typeof skills === "string") {
      try {
        skills = JSON.parse(skills);
      } catch (_) {
        skills = skills
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
      }
    }

    const payload = {
      ...rawBody,
      skills: Array.isArray(skills) ? skills : [],
      profile_picture_url: req.file
        ? `/api/backend/uploads/profile_pictures/${req.file.filename}`
        : rawBody.profile_picture_url || null,
    };

    const result = await authService.signup(payload);
    setAuthCookies(res, {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      role: result.user.role,
    });
    return res.status(201).json({
      success: true,
      user: result.user,
      token: result.access_token,
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body || {});
    setAuthCookies(res, {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      role: result.user.role,
    });
    return res.status(200).json({
      success: true,
      user: result.user,
      token: result.access_token,
    });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, bearerToken] = authHeader.split(" ");
    const accessToken =
      scheme === "Bearer" && bearerToken ? bearerToken : null;
    const cookies = parseCookies(req.headers.cookie || "");
    const refreshToken = cookies[REFRESH_COOKIE] || null;
    await authService.logout({
      accessToken,
      refreshToken,
      userId: req.user && req.user.id ? req.user.id : null,
    });
    clearAuthCookies(res);
    return sendSuccess(res, { logged_out: true });
  } catch (error) {
    return next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken =
      parseCookies(req.headers.cookie || "")[REFRESH_COOKIE] ||
      (req.body && req.body.refresh_token);
    const result = await authService.refreshTokens(refreshToken);
    setAuthCookies(res, {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      role: result.user.role,
    });
    return sendSuccess(res, {
      user: result.user,
      token: result.access_token,
    });
  } catch (error) {
    return next(error);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    const result = await authService.verifyEmail(token);
    return res.status(200).json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    return next(error);
  }
}

async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    await authService.resendVerificationEmail(email);
    return res.status(200).json({
      success: true,
      message: "Verification email sent if account exists and not already verified.",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  signup,
  login,
  me,
  logout,
  refresh,
  verifyEmail,
  resendVerification,
};
