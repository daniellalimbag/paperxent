import { Router } from 'express';
import { marketRouter } from './market/market.routes.js';
import { portfoliosRouter } from './portfolios/portfolios.routes.js';
import { tradesRouter } from './trades/trades.routes.js';
import { usersRouter } from './users/users.routes.js';

export const apiRouter = Router();

apiRouter.use('/users', usersRouter);
apiRouter.use('/trades', tradesRouter);
apiRouter.use('/portfolios', portfoliosRouter);
apiRouter.use('/market', marketRouter);
