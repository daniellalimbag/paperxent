import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '@paperxent/database';
import { AppError } from '../../shared/errors/app-error.js';
import { globalEventBus } from '../../shared/events/event-bus.js';
import type { TradeExecutedEvent } from '../../shared/events/event.types.js';
import type { NormalizedTradeInput, TradeExecutionResult } from './trades.types.js';

export class TradesRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  executeTrade(input: NormalizedTradeInput): Promise<TradeExecutionResult> {
    return this.db.$transaction(
      async (tx) => {
        return input.side === 'BUY' ? this.executeBuy(tx, input) : this.executeSell(tx, input);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  private async executeBuy(
    tx: Prisma.TransactionClient,
    input: NormalizedTradeInput,
  ): Promise<TradeExecutionResult> {
    const quantity = new Prisma.Decimal(input.quantity);
    const price = new Prisma.Decimal(input.price);
    const tradeCost = quantity.mul(price);

    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });

    if (!user) {
      throw new AppError({
        code: 'NOT_FOUND',
        message: 'User was not found.',
        statusCode: 404,
      });
    }

    const balanceUpdate = await tx.user.updateMany({
      where: {
        id: input.userId,
        balance: { gte: tradeCost },
      },
      data: {
        balance: { decrement: tradeCost },
      },
    });

    if (balanceUpdate.count === 0) {
      throw new AppError({
        code: 'INSUFFICIENT_FUNDS',
        message: 'User balance is too low for this trade.',
        statusCode: 409,
      });
    }

    const currentPosition = await tx.portfolio.findUnique({
      where: {
        userId_ticker: {
          userId: input.userId,
          ticker: input.ticker,
        },
      },
    });

    const nextPosition = currentPosition
      ? await tx.portfolio.update({
          where: { id: currentPosition.id },
          data: {
            quantity: { increment: quantity },
            averageBuyPrice: this.calculateWeightedAverageBuyPrice({
              currentQuantity: currentPosition.quantity,
              currentAverageBuyPrice: currentPosition.averageBuyPrice,
              buyQuantity: quantity,
              buyPrice: price,
            }),
          },
        })
      : await tx.portfolio.create({
          data: {
            userId: input.userId,
            ticker: input.ticker,
            quantity,
            averageBuyPrice: price,
          },
        });

    const transaction = await tx.transaction.create({
      data: {
        userId: input.userId,
        type: 'BUY',
        ticker: input.ticker,
        quantity,
        price,
      },
    });

    const updatedUser = await tx.user.findUniqueOrThrow({
      where: { id: input.userId },
      select: { balance: true },
    });

    const result = {
      transactionId: transaction.id,
      userId: input.userId,
      side: 'BUY' as const,
      ticker: input.ticker,
      quantity: transaction.quantity.toString(),
      price: transaction.price.toString(),
      userBalance: updatedUser.balance.toString(),
      portfolioQuantity: nextPosition.quantity.toString(),
      averageBuyPrice: nextPosition.averageBuyPrice.toString(),
      executedAt: transaction.timestamp.toISOString(),
    };

    // Emit TradeExecuted event
    const event: TradeExecutedEvent = {
      eventType: 'TradeExecuted',
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      data: result,
    };

    void globalEventBus.publish(event);

    return result;
  }

  private async executeSell(
    tx: Prisma.TransactionClient,
    input: NormalizedTradeInput,
  ): Promise<TradeExecutionResult> {
    const quantity = new Prisma.Decimal(input.quantity);
    const price = new Prisma.Decimal(input.price);
    const saleProceeds = quantity.mul(price);

    const currentPosition = await tx.portfolio.findUnique({
      where: {
        userId_ticker: {
          userId: input.userId,
          ticker: input.ticker,
        },
      },
    });

    if (!currentPosition || currentPosition.quantity.lt(quantity)) {
      throw new AppError({
        code: 'INSUFFICIENT_HOLDINGS',
        message: 'Portfolio holdings are too low for this sell order.',
        statusCode: 409,
      });
    }

    const remainingQuantity = currentPosition.quantity.sub(quantity);

    if (remainingQuantity.isZero()) {
      await tx.portfolio.delete({
        where: { id: currentPosition.id },
      });
    } else {
      await tx.portfolio.update({
        where: { id: currentPosition.id },
        data: {
          quantity: remainingQuantity,
        },
      });
    }

    const updatedUser = await tx.user.update({
      where: { id: input.userId },
      data: {
        balance: { increment: saleProceeds },
      },
      select: {
        balance: true,
      },
    });

    const transaction = await tx.transaction.create({
      data: {
        userId: input.userId,
        type: 'SELL',
        ticker: input.ticker,
        quantity,
        price,
      },
    });

    const result = {
      transactionId: transaction.id,
      userId: input.userId,
      side: 'SELL' as const,
      ticker: input.ticker,
      quantity: transaction.quantity.toString(),
      price: transaction.price.toString(),
      userBalance: updatedUser.balance.toString(),
      portfolioQuantity: remainingQuantity.toString(),
      averageBuyPrice: remainingQuantity.isZero() ? null : currentPosition.averageBuyPrice.toString(),
      executedAt: transaction.timestamp.toISOString(),
    };

    // Emit TradeExecuted event
    const event: TradeExecutedEvent = {
      eventType: 'TradeExecuted',
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      data: result,
    };

    void globalEventBus.publish(event);

    return result;
  }

  private calculateWeightedAverageBuyPrice({
    currentQuantity,
    currentAverageBuyPrice,
    buyQuantity,
    buyPrice,
  }: {
    currentQuantity: Prisma.Decimal;
    currentAverageBuyPrice: Prisma.Decimal;
    buyQuantity: Prisma.Decimal;
    buyPrice: Prisma.Decimal;
  }) {
    const currentCostBasis = currentQuantity.mul(currentAverageBuyPrice);
    const newCostBasis = buyQuantity.mul(buyPrice);
    const nextQuantity = currentQuantity.plus(buyQuantity);

    return currentCostBasis.plus(newCostBasis).div(nextQuantity);
  }
}
