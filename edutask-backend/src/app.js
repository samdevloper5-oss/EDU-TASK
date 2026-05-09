const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const env = require("./config/env");
const { pool } = require("./config/db");
const { requestIdMiddleware } = require("./middlewares/request_id.middleware");
const { requestLoggerMiddleware } = require("./middlewares/request_logger.middleware");
const { sanitizeMiddleware } = require("./middlewares/sanitize.middleware");
const { errorMiddleware } = require("./middlewares/error.middleware");
const {
  metricsMiddleware,
  metricsHandler,
} = require("./middlewares/metrics.middleware");

const disputeRoutes = require("./routes/dispute.routes");
const adminDisputeRoutes = require("./routes/admin.disputes.routes");
const walletRoutes = require("./routes/wallet.routes");
const authRoutes = require("./routes/auth.routes");
const taskRoutes = require("./routes/task.routes");
const applicationRoutes = require("./routes/application.routes");
const chatRoutes = require("./routes/chat.routes");
const profileRoutes = require("./routes/profile.routes");
const adminRoutes = require("./routes/admin.routes");
const leaderboardRoutes = require("./routes/leaderboard.routes");
const notificationRoutes = require("./routes/notification.routes");
const referralRoutes = require("./routes/referral.routes");

const app = express();

app.use(requestIdMiddleware());
app.use(requestLoggerMiddleware());
app.use(metricsMiddleware());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    frameguard: { action: "deny" },
    noSniff: true,
    referrerPolicy: { policy: "no-referrer" },
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.nodeEnv === "development") {
        callback(null, true);
        return;
      }
      if (env.security.corsAllowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use(express.json({ limit: env.bodyLimit.json }));
app.use(express.urlencoded({ extended: false, limit: env.bodyLimit.urlencoded }));
app.use(sanitizeMiddleware());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", async (req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({
      status: "ok",
      env: env.nodeEnv,
      uptime_seconds: Math.floor(process.uptime()),
      version: env.app.version,
      request_id: req.requestId,
      db: "up",
    });
  } catch (error) {
    next(error);
  }
});
app.get("/metrics", metricsHandler());

// Routes (limited to implemented endpoints).
app.use(authRoutes);
app.use(disputeRoutes);
app.use(adminDisputeRoutes);
app.use(walletRoutes);
app.use(taskRoutes);
app.use(applicationRoutes);
app.use(chatRoutes);
app.use(profileRoutes);
app.use(adminRoutes);
app.use(leaderboardRoutes);
app.use(notificationRoutes);
app.use(referralRoutes);

app.use(errorMiddleware);

module.exports = app;
