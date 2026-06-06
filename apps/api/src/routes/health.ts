import { Router } from 'express';
import type { HealthResponse } from '@paperxent/shared-types';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const response: HealthResponse = {
    status: 'ok',
    service: 'api',
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});
