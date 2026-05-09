const crypto = require("crypto");

function requestIdMiddleware(headerName = "x-request-id") {
  return function requestId(req, res, next) {
    const existing = req.headers[headerName];
    const id = existing && String(existing).trim()
      ? String(existing)
      : crypto.randomUUID();

    req.requestId = id;
    res.setHeader(headerName, id);
    next();
  };
}

module.exports = {
  requestIdMiddleware,
};
