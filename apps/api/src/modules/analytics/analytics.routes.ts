import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/http/async-handler.js';
import type { ApiSuccessResponse } from '../../shared/http/api-response.js';
import { validateRequest } from '../../shared/http/validate-request.js';
import { verifyToken } from '../auth/auth.middleware.js';
import type { PortfolioAnalyticsPayload } from '@paperxent/shared-types';
import { AnalyticsService } from './analytics.service.js';

const getAnalyticsSchema = z.object({
  params: z.object({
    userId: z.string().min(1),
  }),
  query: z.object({
    range: z.enum(['7d', '30d', 'all']).optional(),
  }),
});

const analyticsService = new AnalyticsService();

export const analyticsRouter = Router();

analyticsRouter.get(
  '/:userId',
  verifyToken,
  validateRequest(getAnalyticsSchema),
  asyncHandler(async (req, res) => {
    const { userId } = getAnalyticsSchema.shape.params.parse(req.params);
    const q = getAnalyticsSchema.shape.query.parse(req.query);
    const range = q.range ?? '30d';

    const data: PortfolioAnalyticsPayload = await analyticsService.getAnalytics({
      requesterUserId: req.user!.userId,
      pathUserId: userId,
      range,
    });

    const response: ApiSuccessResponse<PortfolioAnalyticsPayload> = { data };
    res.json(response);
  }),
);
