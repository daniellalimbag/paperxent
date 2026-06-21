import { env } from './config/env.js';
import { createApp } from './app.js';
import { PriceFeedService } from './modules/market/price-feed.service.js';
import { redis } from './shared/cache/redis.js';
import { logger } from './shared/logging/logger.js';
import { initializeEventSystem } from './shared/events/setup.js';
import { schedulePortfolioSnapshotCron } from './shared/jobs/portfolio-snapshot.cron.js';
import { isMarketstackEnabled } from './modules/market/marketstack.service.js';
import { isGeminiEnabled } from './modules/ai/gemini.service.js';

const app = createApp();

// Initialize event system
initializeEventSystem();

const stopSnapshotCron = schedulePortfolioSnapshotCron();

const server = app.listen(env.API_PORT, () => {
  logger.info('PaperXent API listening', {
    url: `http://localhost:${env.API_PORT}`,
    marketstackConfigured: isMarketstackEnabled(),
    geminiConfigured: isGeminiEnabled(),
  });
});

const priceFeed = new PriceFeedService(server);

void redis.connect().then(() => {
  logger.info('Redis connected');
  priceFeed.start();
});

function shutdown() {
  logger.info('Shutting down API server');
  stopSnapshotCron();
  priceFeed.stop();
  server.close(() => {
    void redis.quit();
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
