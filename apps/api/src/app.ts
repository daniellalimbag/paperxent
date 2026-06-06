import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { apiRouter } from './modules/index.js';
import { errorHandler } from './shared/errors/error-handler.js';
import { healthRouter } from './shared/routes/health.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  app.use('/health', healthRouter);
  app.use('/api', apiRouter);

  app.use(errorHandler);

  return app;
}
