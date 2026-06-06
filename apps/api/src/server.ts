import { createApp } from './app.js';
import { env } from './config/env.js';
import { PriceFeedService } from './modules/market/price-feed.service.js';
import { redis } from './shared/cache/redis.js';
import { logger } from './shared/logging/logger.js';

const app = createApp();

const server = app.listen(env.API_PORT, () => {
  logger.info('PaperXent API listening', {
    url: `http://localhost:${env.API_PORT}`,
  });
});

const priceFeed = new PriceFeedService(server);

void redis.connect().then(() => {
  logger.info('Redis connected');
  priceFeed.start();
});

function shutdown() {
  logger.info('Shutting down API server');
  priceFeed.stop();
  server.close(() => {
    void redis.quit();
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
