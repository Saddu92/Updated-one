import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // 🔥 VERY IMPORTANT
  enableReadyCheck: false,    // Upstash recommendation
  connectTimeout: 10000,
  retryStrategy(times) {
    return Math.min(times * 200, 2000); // gentle backoff
  },
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err.message);
});

export default redis;