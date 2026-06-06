import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './shared/logging/logger.js';

const app = createApp();

app.listen(env.API_PORT, () => {
  logger.info('PaperXent API listening', {
    url: `http://localhost:${env.API_PORT}`,
  });
});
