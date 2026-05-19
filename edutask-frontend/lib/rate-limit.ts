// In-memory rate limiter — resets on Vercel cold starts. Use Upstash Redis in production.

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    const newEntry = { count: 1, resetAt: now + windowMs }
    store.set(key, newEntry)
    return { ok: true, remaining: limit - 1, resetAt: newEntry.resetAt }
  }

  if (entry.count >= limit) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count += 1
  return { ok: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}, 300000)

export function rateLimitByIP(
  request: Request,
  endpoint: string,
  maxPerWindow: number,
  windowMs: number
) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous'

  return rateLimit(`${endpoint}:${ip}`, maxPerWindow, windowMs)
}
