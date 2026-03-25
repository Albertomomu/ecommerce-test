type TokenBucket = {
  timestamps: number[];
};

type RateLimiter = {
  check: (limit: number, token: string) => { success: boolean; remaining: number };
};

export function rateLimit({
  interval,
  uniqueTokenPerInterval = 500,
}: {
  interval: number;
  uniqueTokenPerInterval?: number;
}): RateLimiter {
  const tokenMap = new Map<string, TokenBucket>();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [token, bucket] of tokenMap) {
      bucket.timestamps = bucket.timestamps.filter((t) => now - t < interval);
      if (bucket.timestamps.length === 0) {
        tokenMap.delete(token);
      }
    }
  }, interval);

  // Don't block process exit
  if (cleanup.unref) cleanup.unref();

  return {
    check(limit: number, token: string) {
      const now = Date.now();

      // Evict oldest token if we hit the unique token cap
      if (tokenMap.size >= uniqueTokenPerInterval && !tokenMap.has(token)) {
        const oldestKey = tokenMap.keys().next().value!;
        tokenMap.delete(oldestKey);
      }

      const bucket = tokenMap.get(token) ?? { timestamps: [] };
      bucket.timestamps = bucket.timestamps.filter((t) => now - t < interval);

      if (bucket.timestamps.length >= limit) {
        tokenMap.set(token, bucket);
        return { success: false, remaining: 0 };
      }

      bucket.timestamps.push(now);
      tokenMap.set(token, bucket);
      return { success: true, remaining: limit - bucket.timestamps.length };
    },
  };
}
