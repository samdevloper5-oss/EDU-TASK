const { sendError } = require("../utils/http");

function requireRole(role) {
  return function roleMiddleware(req, res, next) {
    if (!req.user || !req.user.role) {
      sendError(res, {
        statusCode: 401,
        code: "unauthorized",
        message: "Authentication required.",
      });
      return;
    }
    if (req.user.role !== role) {
      sendError(res, {
        statusCode: 403,
        code: "forbidden",
        message: "Insufficient role.",
      });
      return;
    }
    next();
  };
}

module.exports = {
  requireRole,
};
