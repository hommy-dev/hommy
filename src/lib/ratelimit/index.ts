/**
 * Per-user, per-key token bucket rate limiter. v1 is in-memory; swapping to
 * Upstash Redis later is a one-file change behind the same interface.
 *
 * Used as the first line of every AI server action and any other endpoint
 * with non-trivial per-user cost. Caller passes a key + identity; we either
 * consume a token or reject with `retryAfterSeconds`.
 *
 *   const result = await rateLimit('ai:photo-analysis', userId, { limit: 30, windowSec: 60 })
 *   if (!result.allowed) return { ok: false, error: 'RATE_LIMITED', retryAfterSeconds: result.retryAfterSeconds }
 *
 * Buckets are stored per-process. Multi-instance deployments will not share
 * limits — acceptable at v1; will migrate to Redis when scale warrants.
 */

interface BucketState {
  tokens: number
  lastRefillMs: number
  capacity: number
  refillPerSec: number
}

const buckets = new Map<string, BucketState>()

export interface RateLimitOptions {
  /** Maximum requests per `windowSec`. */
  limit: number
  /** Sliding window in seconds. */
  windowSec: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export async function rateLimit(
  key: string,
  identity: string,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const id = `${key}:${identity}`
  const now = Date.now()
  const refillPerSec = opts.limit / opts.windowSec

  let bucket = buckets.get(id)
  if (!bucket) {
    bucket = {
      tokens: opts.limit,
      lastRefillMs: now,
      capacity: opts.limit,
      refillPerSec,
    }
    buckets.set(id, bucket)
  }

  // Refill based on elapsed time.
  const elapsedSec = (now - bucket.lastRefillMs) / 1000
  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + elapsedSec * bucket.refillPerSec)
  bucket.lastRefillMs = now

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterSeconds: 0 }
  }

  const tokensShort = 1 - bucket.tokens
  const retryAfterSeconds = Math.ceil(tokensShort / bucket.refillPerSec)
  return { allowed: false, remaining: 0, retryAfterSeconds }
}

/** Clear all buckets — used in tests and `/api/ai/health`. */
export function clearRateLimits(): void {
  buckets.clear()
}
