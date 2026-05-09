const env = require("../config/env");
const logger = require("../config/logger");
const { increment } = require("./metrics.middleware");
const { ApiError, sendError } = require("../utils/http");
const {
  ValidationError,
  AuthError,
  NotFoundError,
  BusinessLogicError,
} = require("../utils/errors");

function classifyAndCount(message) {
  if (
    message.includes("Insufficient wallet balance") ||
    message.includes("Escrow balance is insufficient") ||
    message.includes("exceeds available balance")
  ) {
    increment("negative_balance_attempt_total");
  }
  if (
    message.includes("Only ") ||
    message.includes("must be") ||
    message.includes("can only") ||
    message.includes("valid state")
  ) {
    increment("invalid_state_transition_attempt_total");
  }
}

function errorMiddleware(err, req, res, next) {
  if (err && err.code === "LIMIT_FILE_SIZE") {
    sendError(res, {
      statusCode: 400,
      code: "file_too_large",
      message: "Uploaded file exceeds maximum size (3MB).",
      requestId: req.requestId,
    });
    return;
  }

  if (
    err instanceof ValidationError ||
    err instanceof AuthError ||
    err instanceof NotFoundError ||
    err instanceof BusinessLogicError
  ) {
    return sendError(res, {
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      details: err.details || {},
      requestId: req.requestId,
    });
  }

  const status = err && err.statusCode ? err.statusCode : 500;
  const code =
    err && err.code
      ? err.code
      : status >= 500
        ? "internal_error"
        : "request_error";
  const message =
    status >= 500 ? "Internal server error" : err.message || "Request failed";
  const details =
    env.nodeEnv === "production"
      ? err.details || {}
      : {
          ...(err.details || {}),
          stack: err.stack,
        };

  classifyAndCount(String(err && err.message ? err.message : ""));

  logger.error("request_failed", {
    request_id: req.requestId,
    status,
    error_code: code,
    message: err && err.message ? err.message : "unknown_error",
    path: req.originalUrl,
    method: req.method,
  });

  sendError(res, {
    statusCode: status,
    code,
    message,
    details,
    requestId: req.requestId,
  });
}

module.exports = {
  errorMiddleware,
  ApiError,
};
