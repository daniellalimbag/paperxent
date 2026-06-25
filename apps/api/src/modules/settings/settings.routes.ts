import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/http/async-handler.js';
import type { ApiSuccessResponse } from '../../shared/http/api-response.js';
import { validateRequest } from '../../shared/http/validate-request.js';
import { verifyToken } from '../auth/auth.middleware.js';
import { SettingsService } from './settings.service.js';
import type { UserSettings } from '@paperxent/shared-types';

const service = new SettingsService();

const patchBodySchema = z.object({
  body: z.object({
    startingBalance: z.string().min(1),
  }),
});

export const settingsRouter = Router();

settingsRouter.get(
  '/',
  verifyToken,
  asyncHandler(async (req, res) => {
    const data = await service.getForUser(req.user!.userId);
    const response: ApiSuccessResponse<UserSettings> = { data };
    res.json(response);
  }),
);

settingsRouter.patch(
  '/',
  verifyToken,
  validateRequest(patchBodySchema),
  asyncHandler(async (req, res) => {
    const { startingBalance } = patchBodySchema.shape.body.parse(req.body);
    const data = await service.updateStartingBalance(req.user!.userId, startingBalance);
    const response: ApiSuccessResponse<UserSettings> = { data };
    res.json(response);
  }),
);

settingsRouter.post(
  '/reset-portfolio',
  verifyToken,
  asyncHandler(async (req, res) => {
    const data = await service.resetPortfolio(req.user!.userId);
    const response: ApiSuccessResponse<UserSettings> = { data };
    res.json(response);
  }),
);
