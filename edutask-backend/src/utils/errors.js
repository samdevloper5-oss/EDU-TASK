const { ApiError } = require("./http");

class ValidationError extends ApiError {
  constructor(message, details = {}) {
    super(400, "validation_error", message, details);
    this.name = "ValidationError";
  }
}

class AuthError extends ApiError {
  constructor(message = "Unauthorized", details = {}) {
    super(401, "unauthorized", message, details);
    this.name = "AuthError";
  }
}

class NotFoundError extends ApiError {
  constructor(message = "Resource not found", details = {}) {
    super(404, "not_found", message, details);
    this.name = "NotFoundError";
  }
}

class BusinessLogicError extends ApiError {
  constructor(message, details = {}, statusCode = 409) {
    super(statusCode, "business_logic_error", message, details);
    this.name = "BusinessLogicError";
  }
}

module.exports = {
  ValidationError,
  AuthError,
  NotFoundError,
  BusinessLogicError,
};
