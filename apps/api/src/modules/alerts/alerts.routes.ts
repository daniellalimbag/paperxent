import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/http/async-handler.js';
import type { ApiSuccessResponse } from '../../shared/http/api-response.js';
import { validateRequest } from '../../shared/http/validate-request.js';
import { verifyToken } from '../auth/auth.middleware.js';
import { AlertsService } from './alerts.service.js';
import type { PaperAlertRow, PaperAlertsPayload } from './alerts.types.js';

const service = new AlertsService();

const ALERT_TYPES = ['PRICE_ABOVE', 'PRICE_BELOW', 'PERCENT_UP', 'PERCENT_DOWN'] as const;

const createBodySchema = z.object({
  body: z
    .object({
      ticker: z.string().min(1).max(16),
      type: z.enum(ALERT_TYPES),
      targetPrice: z.string().optional(),
      percentThreshold: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const isPrice = data.type === 'PRICE_ABOVE' || data.type === 'PRICE_BELOW';
      const isPct = data.type === 'PERCENT_UP' || data.type === 'PERCENT_DOWN';
      if (isPrice && !data.targetPrice) {
        ctx.addIssue({ code: 'custom', message: 'targetPrice is required for price alerts.' });
      }
      if (isPct && !data.percentThreshold) {
        ctx.addIssue({ code: 'custom', message: 'percentThreshold is required for percent alerts.' });
      }
    }),
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const alertsRouter = Router();

alertsRouter.get(
  '/',
  verifyToken,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const data = await service.listForUser(userId);
    const response: ApiSuccessResponse<PaperAlertsPayload> = { data };
    res.json(response);
  }),
);

alertsRouter.post(
  '/',
  verifyToken,
  validateRequest(createBodySchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const body = createBodySchema.shape.body.parse(req.body);
    const item = await service.create({
      userId,
      ticker: body.ticker,
      type: body.type,
      ...(body.targetPrice !== undefined ? { targetPrice: body.targetPrice } : {}),
      ...(body.percentThreshold !== undefined ? { percentThreshold: body.percentThreshold } : {}),
    });
    const response: ApiSuccessResponse<PaperAlertRow> = { data: item };
    res.status(201).json(response);
  }),
);

alertsRouter.delete(
  '/:id',
  verifyToken,
  validateRequest(idParamSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { id } = idParamSchema.shape.params.parse(req.params);
    await service.remove(userId, id);
    res.status(204).send();
  }),
);
