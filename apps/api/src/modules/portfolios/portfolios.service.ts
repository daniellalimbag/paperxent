import { Prisma } from '@prisma/client';
import { AppError } from '../../shared/errors/app-error.js';
import { MarketRepository } from '../market/market.repository.js';
import { PortfoliosRepository } from './portfolios.repository.js';
import type {
  AssetValuation,
  GetPortfolioInput,
  PortfolioPosition,
  PortfolioValuation,
  PortfolioValuationInput,
} from './portfolios.types.js';

export class PortfoliosService {
  constructor(
    private readonly portfoliosRepository = new PortfoliosRepository(),
    private readonly marketRepository = new MarketRepository(),
  ) {}

  getPortfolio(input: GetPortfolioInput): Promise<PortfolioPosition[]> {
    return this.portfoliosRepository.findByUserId(input);
  }

  async getValuation(input: PortfolioValuationInput): Promise<PortfolioValuation> {
    const holdings = await this.portfoliosRepository.findByUserId({ userId: input.userId });

    if (holdings.length === 0) {
      return {
        userId: input.userId,
        totalCostBasis: '0',
        totalPortfolioValue: '0',
        totalUnrealizedPnl: '0',
        totalRoi: '0',
        assets: [],
        valuedAt: new Date().toISOString(),
      };
    }

    const quotesByTicker = await this.marketRepository.findQuotes(
      holdings.map((holding) => holding.ticker),
    );

    const missingTickers = holdings
      .map((holding) => holding.ticker)
      .filter((ticker) => !quotesByTicker.has(ticker));

    if (missingTickers.length > 0) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: 'Latest price is unavailable for one or more portfolio assets.',
        statusCode: 404,
        details: { tickers: missingTickers },
      });
    }

    const assets = holdings.map<AssetValuation>((holding) => {
      const quote = quotesByTicker.get(holding.ticker);

      if (!quote) {
        throw new AppError({
          code: 'NOT_FOUND',
          message: 'Latest price is unavailable for portfolio asset.',
          statusCode: 404,
          details: { ticker: holding.ticker },
        });
      }

      return this.valueAsset({
        holding,
        latestPrice: quote.price,
        pricedAt: quote.timestamp,
      });
    });

    const totals = assets.reduce(
      (runningTotals, asset) => {
        const costBasis = new Prisma.Decimal(asset.costBasis);
        const marketValue = new Prisma.Decimal(asset.marketValue);
        const unrealizedPnl = new Prisma.Decimal(asset.unrealizedPnl);

        return {
          totalCostBasis: runningTotals.totalCostBasis.plus(costBasis),
          totalPortfolioValue: runningTotals.totalPortfolioValue.plus(marketValue),
          totalUnrealizedPnl: runningTotals.totalUnrealizedPnl.plus(unrealizedPnl),
        };
      },
      {
        totalCostBasis: new Prisma.Decimal(0),
        totalPortfolioValue: new Prisma.Decimal(0),
        totalUnrealizedPnl: new Prisma.Decimal(0),
      },
    );

    return {
      userId: input.userId,
      totalCostBasis: totals.totalCostBasis.toString(),
      totalPortfolioValue: totals.totalPortfolioValue.toString(),
      totalUnrealizedPnl: totals.totalUnrealizedPnl.toString(),
      totalRoi: this.calculateRoi(totals.totalUnrealizedPnl, totals.totalCostBasis).toString(),
      assets,
      valuedAt: new Date().toISOString(),
    };
  }

  private valueAsset({
    holding,
    latestPrice,
    pricedAt,
  }: {
    holding: PortfolioPosition;
    latestPrice: string;
    pricedAt: string;
  }): AssetValuation {
    const quantity = new Prisma.Decimal(holding.quantity);
    const averageBuyPrice = new Prisma.Decimal(holding.averageBuyPrice);
    const price = new Prisma.Decimal(latestPrice);
    const costBasis = quantity.mul(averageBuyPrice);
    const marketValue = quantity.mul(price);
    const unrealizedPnl = marketValue.minus(costBasis);

    return {
      ticker: holding.ticker,
      quantity: quantity.toString(),
      averageBuyPrice: averageBuyPrice.toString(),
      latestPrice: price.toString(),
      costBasis: costBasis.toString(),
      marketValue: marketValue.toString(),
      unrealizedPnl: unrealizedPnl.toString(),
      roi: this.calculateRoi(unrealizedPnl, costBasis).toString(),
      pricedAt,
    };
  }

  private calculateRoi(unrealizedPnl: Prisma.Decimal, costBasis: Prisma.Decimal) {
    if (costBasis.isZero()) {
      return new Prisma.Decimal(0);
    }

    return unrealizedPnl.div(costBasis);
  }
}
