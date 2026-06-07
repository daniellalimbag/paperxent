import { Router } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import type { ApiSuccessResponse } from '../../shared/http/api-response.js';
import { verifyToken } from '../auth/auth.middleware.js';
import { PortfoliosService } from './portfolios.service.js';
import type { PortfolioValuation } from './portfolios.types.js';

const portfoliosService = new PortfoliosService();

export const portfoliosRouter = Router();

portfoliosRouter.get(
  '/',
  verifyToken,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const valuation = await portfoliosService.getValuation({ userId });
    const response: ApiSuccessResponse<PortfolioValuation> = { data: valuation };

    res.json(response);
  }),
);
