import { Router } from 'express';
import authRouter from './auth/auth.routes.js';
import { marketRouter } from './market/market.routes.js';
import { portfoliosRouter } from './portfolios/portfolios.routes.js';
import { tradesRouter } from './trades/trades.routes.js';
import { transactionsRouter } from './transactions/transactions.routes.js';
import { usersRouter } from './users/users.routes.js';
import { analyticsRouter } from './analytics/analytics.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/trade', tradesRouter);
apiRouter.use('/transactions', transactionsRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/portfolio', portfoliosRouter);
apiRouter.use('/market', marketRouter);
