import crypto from "crypto";
import Redis from "ioredis";

const memoryCounters = new Map();
const memoryEvents = new Map();
let redisClient;
let redisUnavailable = false;

function now() {
  return Date.now();
}

function cleanExpired(store) {
  const current = now();
  for (const [key, value] of store.entries()) {
    if (value.expiresAt <= current) store.delete(key);
  }
}

function getRedisClient() {
  if (!process.env.REDIS_URL || redisUnavailable) return null;
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true, connectTimeout: 1_000 });
    redisClient.on("error", () => { redisUnavailable = true; });
    redisClient.connect().catch(() => { redisUnavailable = true; });
  }
  return redisClient;
}

function clientKey(req) {
  return String(req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "anonymous").split(",")[0].trim();
}

export function createRateLimiter({ name, windowMs, max, key = clientKey }, { redis = getRedisClient() } = {}) {
  return async (req, res, next) => {
    const identifier = String(key(req) || "anonymous");
    const bucket = `salih:rate:${name}:${identifier}`;
    let count;
    let resetMs = windowMs;

    try {
      if (redis) {
        count = await redis.incr(bucket);
        if (count === 1) await redis.pexpire(bucket, windowMs);
        resetMs = Math.max(0, await redis.pttl(bucket));
      } else {
        cleanExpired(memoryCounters);
        const current = memoryCounters.get(bucket) || { count: 0, expiresAt: now() + windowMs };
        current.count += 1;
        memoryCounters.set(bucket, current);
        count = current.count;
        resetMs = Math.max(0, current.expiresAt - now());
      }
    } catch {
      const current = memoryCounters.get(bucket) || { count: 0, expiresAt: now() + windowMs };
      current.count += 1;
      memoryCounters.set(bucket, current);
      count = current.count;
      resetMs = Math.max(0, current.expiresAt - now());
    }

    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil((now() + resetMs) / 1000)));
    if (count > max) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil(resetMs / 1000))));
      return res.status(429).json({ error: "RATE_LIMITED", message: "تم تجاوز الحد المؤقت للطلبات." });
    }
    return next();
  };
}

export function stableEventKey(provider, eventId, payload) {
  if (eventId) return `${provider}:${String(eventId)}`;
  return `${provider}:${crypto.createHash("sha256").update(payload || "").digest("hex")}`;
}

export async function claimWebhookEvent({ provider, eventId, rawBody, ttlSeconds = 86_400, redis = getRedisClient() }) {
  const key = `salih:webhook:${stableEventKey(provider, eventId, rawBody)}`;
  try {
    if (redis) return (await redis.set(key, "1", "EX", ttlSeconds, "NX")) === "OK";
  } catch {
    // Continue with the in-process fallback only when Redis is unavailable.
  }
  cleanExpired(memoryEvents);
  if (memoryEvents.has(key)) return false;
  memoryEvents.set(key, { expiresAt: now() + ttlSeconds * 1000 });
  return true;
}

export function clearRequestControlMemoryForTest() {
  memoryCounters.clear();
  memoryEvents.clear();
}
