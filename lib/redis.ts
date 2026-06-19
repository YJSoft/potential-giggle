import Redis from 'ioredis'

const globalForRedis = global as unknown as { redis?: Redis }

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.AZURE_REDIS_CONNECTION_STRING ?? 'redis://localhost:6379')

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis
