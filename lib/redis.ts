import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Lazy-init Redis to avoid connecting during build/static export
let _redis: IORedis | null = null;
function createRedis() {
  if (_redis) return _redis;
  _redis = new IORedis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      return Math.min(50 * times, 2000);
    },
  });
  _redis.on("error", (err: any) => {
    // Log but don't crash the process during build
    console.warn("Redis error (non-fatal):", err?.message ?? err);
  });
  return _redis;
}

// Expose helpers that behave like the previous exports but defer connection
export const getRedis = () => createRedis();
export const getRedisSubscriber = () => createRedis().duplicate();
export const getRedisPublisher = () => createRedis();

// Backwards-compatible `redis` object that lazily binds commands
export const redis = new Proxy(
  {},
  {
    get(_, prop: string) {
      const r = createRedis();
      const val = (r as any)[prop];
      if (typeof val === "function") return val.bind(r);
      return val;
    },
  }
) as unknown as IORedis;

// helper: publish a JSON message to a channel
export async function publishChannel(channel: string, payload: unknown) {
  try {
    await getRedisPublisher().publish(channel, JSON.stringify(payload));
  } catch (err) {
    console.error("Redis publish error:", err);
  }
}
