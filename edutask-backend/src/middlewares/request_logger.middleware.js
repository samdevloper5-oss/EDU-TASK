const logger = require("../config/logger");

function requestLoggerMiddleware() {
  return function requestLogger(req, res, next) {
    const start = Date.now();
    res.on("finish", () => {
      logger.info("http_request", {
        request_id: req.requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration_ms: Date.now() - start,
        ip: req.ip,
      });
    });
    next();
  };
}

module.exports = {
  requestLoggerMiddleware,
};
