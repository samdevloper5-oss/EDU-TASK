function sanitizeString(value) {
  return String(value)
    .replace(/<\s*\/?\s*script\b[^>]*>/gi, "")
    .replace(/\u0000/g, "")
    .trim();
}

function sanitizeObject(value) {
  if (value == null) {
    return value;
  }
  if (typeof value === "string") {
    return sanitizeString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObject(item));
  }
  if (typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = sanitizeObject(item);
    }
    return out;
  }
  return value;
}

function sanitizeMiddleware() {
  return function sanitize(req, _res, next) {
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === "object") {
      req.query = sanitizeObject(req.query);
    }
    if (req.params && typeof req.params === "object") {
      req.params = sanitizeObject(req.params);
    }
    next();
  };
}

module.exports = {
  sanitizeMiddleware,
};
