import { Redis } from 'ioredis';
import { env } from '../../config/env.js';
import { logger } from '../logging/logger.js';

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

export const redis =
  globalForRedis.redis ??
  new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });

if (env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

redis.on('error', (error: Error) => {
  logger.error('Redis client error', { error });
});
