const logger = require("./logger");

let createClient = null;
try {
  ({ createClient } = require("redis"));
} catch (_) {
  createClient = null;
}

const redisUrl = process.env.REDIS_URL ? String(process.env.REDIS_URL).trim() : null;

const memoryCache = new Map();
let redisClient = null;
let redisReady = false;

if (redisUrl && createClient) {
  redisClient = createClient({ url: redisUrl });
  redisClient.on("error", (error) => {
    redisReady = false;
    logger.warn("redis_error", { message: error.message });
  });
  redisClient.on("ready", () => {
    redisReady = true;
    logger.info("redis_ready");
  });
  redisClient.connect().catch((error) => {
    redisReady = false;
    logger.warn("redis_connect_failed", { message: error.message });
  });
} else if (redisUrl && !createClient) {
  logger.warn("redis_module_missing_fallback_memory_cache");
}

function setMemory(key, value, ttlSeconds) {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  memoryCache.set(key, { value, expiresAt });
}

function getMemory(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

async function getCache(key) {
  if (redisClient && redisReady) {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  }
  return getMemory(key);
}

async function setCache(key, value, ttlSeconds = 60) {
  if (redisClient && redisReady) {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    return;
  }
  setMemory(key, value, ttlSeconds);
}

async function deleteByPrefix(prefix) {
  if (redisClient && redisReady) {
    let cursor = "0";
    do {
      const response = await redisClient.scan(cursor, {
        MATCH: `${prefix}*`,
        COUNT: 100,
      });
      cursor = response.cursor;
      if (response.keys && response.keys.length > 0) {
        await redisClient.del(response.keys);
      }
    } while (cursor !== "0");
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

module.exports = {
  getCache,
  setCache,
  deleteByPrefix,
};
