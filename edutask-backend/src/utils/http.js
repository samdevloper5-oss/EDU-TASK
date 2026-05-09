class ApiError extends Error {
  constructor(statusCode, code, message, details = {}) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function sendSuccess(res, data, statusCode = 200, meta = undefined) {
  const payload = {
    success: true,
    data,
  };
  if (meta) {
    if (meta.pagination) {
      payload.pagination = meta.pagination;
      if (meta.meta) {
        payload.meta = meta.meta;
      }
    } else {
      payload.meta = meta;
    }
  }
  res.status(statusCode).json(payload);
}

function sendPaginatedSuccess(res, items, pagination, statusCode = 200, meta = undefined) {
  const payload = {
    success: true,
    data: items,
    pagination,
  };
  if (meta) {
    payload.meta = meta;
  }
  res.status(statusCode).json(payload);
}

function sendError(
  res,
  {
    statusCode = 500,
    code = "internal_error",
    message = "Internal server error",
    details = {},
    requestId = null,
  } = {}
) {
  const payload = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
  if (requestId) {
    payload.request_id = requestId;
  }
  res.status(statusCode).json(payload);
}

module.exports = {
  ApiError,
  sendSuccess,
  sendPaginatedSuccess,
  sendError,
};
