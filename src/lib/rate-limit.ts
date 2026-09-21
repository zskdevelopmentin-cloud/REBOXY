// Simple in-memory rate limiter helper for serverless/container App Router endpoints

interface RateLimitTracker {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitTracker>();

export function checkRateLimit(key: string, limit: number = 100, windowMs: number = 60000): {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  const now = Date.now();
  const tracker = memoryStore.get(key);

  if (!tracker || tracker.resetTime <= now) {
    memoryStore.set(key, { count: 1, resetTime: now + windowMs });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + windowMs
    };
  }

  if (tracker.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: tracker.resetTime
    };
  }

  tracker.count += 1;
  memoryStore.set(key, tracker);

  return {
    success: true,
    limit,
    remaining: limit - tracker.count,
    reset: tracker.resetTime
  };
}

// Extract client IP address safely from request headers
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
