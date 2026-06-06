import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { validateRequest } from '../../shared/http/validate-request.js';
import { PortfoliosService } from './portfolios.service.js';

const getPortfolioSchema = z.object({
  params: z.object({
    userId: z.string().min(1),
  }),
});

const portfoliosService = new PortfoliosService();

export const portfoliosRouter = Router();

portfoliosRouter.get(
  '/:userId',
  validateRequest(getPortfolioSchema),
  asyncHandler(async (req, res) => {
    const { userId } = getPortfolioSchema.shape.params.parse(req.params);
    const positions = await portfoliosService.getPortfolio({ userId });
    res.json({ data: positions });
  }),
);
