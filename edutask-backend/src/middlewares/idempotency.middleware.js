const crypto = require("crypto");
const env = require("../config/env");
const { increment } = require("./metrics.middleware");
const idempotencyRepo = require("../repositories/idempotency.repo");
const { sendError } = require("../utils/http");
const memoryStore = new Map();

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const fields = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`);
  return `{${fields.join(",")}}`;
}

function hashInput(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashRequest(req) {
  const endpoint = req.route
    ? `${req.method}:${req.baseUrl || ""}${req.route.path}`
    : `${req.method}:${req.originalUrl || req.url || ""}`;
  const payload = stableStringify({
    endpoint,
    params: req.params || {},
    query: req.query || {},
    body: req.body || {},
  });
  return hashInput(payload);
}

function hashResponse(statusCode, payload) {
  return hashInput(
    stableStringify({
      statusCode,
      payload: payload ?? null,
    })
  );
}

function replayResponse(res, reason) {
  increment("idempotency_replay_total");
  return sendError(res, {
    statusCode: 409,
    code: "idempotency_replay",
    message:
      reason === "payload_mismatch"
        ? "Idempotency key re-used with different payload."
        : "Duplicate request detected.",
  });
}

function replayFromMemory(res) {
  increment("idempotency_replay_total");
  return sendError(res, {
    statusCode: 409,
    code: "idempotency_replay",
    message: "Duplicate request detected.",
  });
}

function evaluateExistingRecord(existing, requestHash) {
  if (!existing) {
    return { shouldProceed: true, reason: "new" };
  }

  if (existing.request_hash !== requestHash) {
    return { shouldProceed: false, reason: "payload_mismatch" };
  }

  if (existing.status === "in_progress") {
    return { shouldProceed: false, reason: "in_progress" };
  }

  if (existing.status === "completed") {
    return { shouldProceed: false, reason: "replay" };
  }

  return { shouldProceed: true, reason: "retry_failed" };
}

async function finalizeIdempotency(idempotencyId, statusCode, responsePayload) {
  const db = require("../config/db");
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    if (statusCode >= 200 && statusCode < 500) {
      await idempotencyRepo.markCompleted(client, {
        id: idempotencyId,
        response_hash: hashResponse(statusCode, responsePayload),
      });
    } else {
      await idempotencyRepo.markFailed(client, {
        id: idempotencyId,
        response_hash: hashResponse(statusCode, responsePayload),
      });
    }
    await client.query("COMMIT");
  } catch (_) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      // best effort only
    }
  } finally {
    client.release();
  }
}

function idempotencyMiddleware({
  header = "idempotency-key",
  ttlMs = 10 * 60 * 1000,
} = {}) {
  return async function idempotency(req, res, next) {
    try {
      if (!env.idempotency.enabled) {
        return next();
      }

      const idempotencyKey = req.headers[header];
      if (!idempotencyKey) {
        return next();
      }

      const userId = req.user && req.user.id;
      if (!userId) {
        const now = Date.now();
        const entry = memoryStore.get(idempotencyKey);
        if (entry && entry.expiresAt > now) {
          return replayFromMemory(res);
        }
        memoryStore.set(idempotencyKey, { expiresAt: now + ttlMs });
        return next();
      }

      let withSerializableTransaction;
      try {
        withSerializableTransaction =
          require("../utils/transaction").withSerializableTransaction;
      } catch (_) {
        const now = Date.now();
        const memoryKey = `${userId}:${idempotencyKey}`;
        const entry = memoryStore.get(memoryKey);
        if (entry && entry.expiresAt > now) {
          return replayFromMemory(res);
        }
        memoryStore.set(memoryKey, { expiresAt: now + ttlMs });
        return next();
      }

      const endpoint = req.route
        ? `${req.method}:${req.baseUrl || ""}${req.route.path}`
        : `${req.method}:${req.originalUrl || req.url || ""}`;
      const requestHash = hashRequest(req);

      let state;
      const resolveExistingState = async () =>
        withSerializableTransaction(async (client) => {
          const existing = await idempotencyRepo.getByKeyForUpdate(client, {
            user_id: userId,
            endpoint,
            idempotency_key: idempotencyKey,
          });

          if (!existing) {
            const created = await idempotencyRepo.insertKey(client, {
              user_id: userId,
              endpoint,
              idempotency_key: idempotencyKey,
              request_hash: requestHash,
            });
            return { shouldProceed: true, idempotencyId: created.id };
          }

          if (new Date(existing.expires_at).getTime() <= Date.now()) {
            const refreshed = await idempotencyRepo.resetKey(client, {
              id: existing.id,
              request_hash: requestHash,
            });
            return { shouldProceed: true, idempotencyId: refreshed.id };
          }

          const evaluated = evaluateExistingRecord(existing, requestHash);
          if (!evaluated.shouldProceed) {
            return evaluated;
          }

          const retry = await idempotencyRepo.resetKey(client, {
            id: existing.id,
            request_hash: requestHash,
          });
          return { shouldProceed: true, idempotencyId: retry.id };
        });

      try {
        state = await resolveExistingState();
      } catch (error) {
        // Unique-collision race (PostgreSQL 23505): fetch winner and reply deterministically.
        if (error && error.code === "23505") {
          try {
            state = await withSerializableTransaction(async (client) => {
              const existing = await idempotencyRepo.getByKeyForUpdate(client, {
                user_id: userId,
                endpoint,
                idempotency_key: idempotencyKey,
              });
              if (!existing) {
                return { shouldProceed: false, reason: "replay" };
              }
              return evaluateExistingRecord(existing, requestHash);
            });
          } catch (_) {
            state = { shouldProceed: false, reason: "replay" };
          }
        } else {
          throw error;
        }
      }

      if (!state.shouldProceed) {
        return replayResponse(res, state.reason);
      }

      let responsePayload = null;
      const originalJson = res.json.bind(res);
      res.json = (payload) => {
        responsePayload = payload;
        return originalJson(payload);
      };

      res.on("finish", () => {
        finalizeIdempotency(
          state.idempotencyId,
          res.statusCode,
          responsePayload
        );
      });

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  idempotencyMiddleware,
  hashRequest,
};
