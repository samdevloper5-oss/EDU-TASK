const jwt = require("jsonwebtoken");
const env = require("../config/env");
const chatService = require("../services/chat.service");
const notificationService = require("../services/notification.service");
const logger = require("../config/logger");

const AUTH_COOKIE = "edutask_session";

let io = null;
let Server = null;
try {
  ({ Server } = require("socket.io"));
} catch (_) {
  Server = null;
}

function parseUserFromToken(token) {
  const payload = jwt.verify(token, env.security.jwt.secret, {
    algorithms: ["HS256"],
    issuer: env.security.jwt.issuer,
    audience: env.security.jwt.audience,
  });
  return {
    id: payload.sub || payload.id,
    role: payload.role,
    email: payload.email,
    email_verified: payload.email_verified,
    phone_verified: payload.phone_verified,
    is_active: payload.is_active,
    is_suspended: payload.is_suspended,
  };
}

function parseCookieValue(cookieHeader, key) {
  if (!cookieHeader) return null;
  const matched = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${key}=`));
  if (!matched) return null;
  return decodeURIComponent(matched.slice(key.length + 1));
}

function emitToUser(userId, eventName, payload) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(eventName, payload);
}

function initSocket(httpServer) {
  if (!Server) {
    logger.warn("socketio_module_missing_realtime_disabled");
    return null;
  }
  io = new Server(httpServer, {
    cors: {
      origin: env.security.corsAllowedOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const authToken =
        socket.handshake.auth && socket.handshake.auth.token
          ? socket.handshake.auth.token
          : null;
      const cookieToken = parseCookieValue(
        socket.handshake.headers && socket.handshake.headers.cookie
          ? socket.handshake.headers.cookie
          : "",
        AUTH_COOKIE
      );
      const token = authToken || cookieToken;
      if (!token) {
        next(new Error("unauthorized"));
        return;
      }
      socket.user = parseUserFromToken(token);
      next();
    } catch (_) {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;
    socket.join(`user:${user.id}`);

    socket.on("conversation:join", async (payload = {}, callback = () => {}) => {
      try {
        const conversationId = payload.conversationId;
        await chatService.listMessages(user, conversationId, { page: 1, limit: 1 });
        socket.join(`conversation:${conversationId}`);
        callback({ ok: true });
      } catch (error) {
        callback({ ok: false, error: error.message });
      }
    });

    socket.on("message:send", async (payload = {}, callback = () => {}) => {
      try {
        const message = await chatService.sendMessage(
          user,
          payload.conversationId,
          payload.content
        );
        io.to(`conversation:${payload.conversationId}`).emit("message:new", message);
        callback({ ok: true, data: message });
      } catch (error) {
        callback({ ok: false, error: error.message });
      }
    });

    socket.on("message:read", async (payload = {}, callback = () => {}) => {
      try {
        const result = await chatService.markConversationRead(user, payload.conversationId);
        io.to(`conversation:${payload.conversationId}`).emit("message:read", {
          conversationId: payload.conversationId,
          readerId: user.id,
        });
        callback({ ok: true, data: result });
      } catch (error) {
        callback({ ok: false, error: error.message });
      }
    });
  });

  notificationService.registerRealtimeNotifier((userId, notification) => {
    emitToUser(userId, "notification:new", notification);
  });

  logger.info("socket_initialized");
  return io;
}

module.exports = {
  initSocket,
  emitToUser,
};
