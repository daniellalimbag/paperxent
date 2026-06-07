import type { DomainEvent, EventSubscriber } from '../event.types.js';

/**
 * Analytics subscriber - collects metrics for analytics and reporting
 * This demonstrates how events can be consumed for data pipelines
 */
export class AnalyticsSubscriber implements EventSubscriber {
  id = 'analytics-subscriber';
  eventTypes: string[] = ['TradeExecuted', 'PriceTick'];

  private metrics = {
    tradeCount: 0,
    totalVolume: 0,
    priceTickCount: 0,
    tickerPriceUpdates: new Map<string, number>(),
  };

  async handle(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case 'TradeExecuted':
        this.trackTrade(event);
        break;
      case 'PriceTick':
        this.trackPriceTick(event);
        break;
    }
  }

  onError(error: Error, event: DomainEvent): void {
    console.error(`[AnalyticsSubscriber] Failed to process event ${event.eventId}:`, error.message);
  }

  private trackTrade(event: DomainEvent & { eventType: 'TradeExecuted' }): void {
    this.metrics.tradeCount += 1;
    const quantity = parseFloat(event.data.quantity);
    const price = parseFloat(event.data.price);
    this.metrics.totalVolume += quantity * price;

    // In a real implementation, this could write to a database, send to analytics service, etc.
    // For now, we just track in memory
    console.log(`[Analytics] Trade #${this.metrics.tradeCount}: ${event.data.side} ${quantity} ${event.data.ticker} @ $${price}`);
  }

  private trackPriceTick(event: DomainEvent & { eventType: 'PriceTick' }): void {
    this.metrics.priceTickCount += 1;
    
    const updateCount = this.metrics.tickerPriceUpdates.get(event.data.ticker) || 0;
    this.metrics.tickerPriceUpdates.set(event.data.ticker, updateCount + 1);

    // In a real implementation, this could:
    // - Update time-series databases
    // - Calculate technical indicators
    // - Feed into ML models
    // - Send to external analytics platforms
  }

  /**
   * Get current metrics (useful for testing/monitoring)
   */
  getMetrics() {
    return {
      ...this.metrics,
      tickerPriceUpdates: Object.fromEntries(this.metrics.tickerPriceUpdates),
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      tradeCount: 0,
      totalVolume: 0,
      priceTickCount: 0,
      tickerPriceUpdates: new Map(),
    };
  }
}
