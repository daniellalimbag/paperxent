import type { DomainEvent, EventSubscriber } from '../event.types.js';

/**
 * Logging subscriber - logs all events for audit trail and debugging
 */
export class LoggingSubscriber implements EventSubscriber {
  id = 'logging-subscriber';
  eventTypes: string[] = ['TradeExecuted', 'PriceTick', 'PortfolioUpdated', 'BalanceUpdated'];

  async handle(event: DomainEvent): Promise<void> {
    const logLevel = this.getLogLevel(event.eventType);
    const message = this.formatLogMessage(event);

    switch (logLevel) {
      case 'error':
        console.error(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'info':
        console.info(message);
        break;
      default:
        console.log(message);
    }
  }

  onError(error: Error, event: DomainEvent): void {
    console.error(`[LoggingSubscriber] Failed to log event ${event.eventId}:`, error.message);
  }

  private getLogLevel(eventType: string): 'log' | 'info' | 'warn' | 'error' {
    switch (eventType) {
      case 'TradeExecuted':
        return 'info';
      case 'PriceTick':
        return 'log';
      case 'PortfolioUpdated':
        return 'info';
      case 'BalanceUpdated':
        return 'warn';
      default:
        return 'log';
    }
  }

  private formatLogMessage(event: DomainEvent): string {
    const timestamp = new Date(event.timestamp).toISOString();
    
    switch (event.eventType) {
      case 'TradeExecuted':
        return `[${timestamp}] TRADE_EXECUTED: ${event.data.side} ${event.data.quantity} ${event.data.ticker} @ $${event.data.price} (User: ${event.data.userId})`;
      
      case 'PriceTick':
        return `[${timestamp}] PRICE_TICK: ${event.data.ticker} = $${event.data.price} (${event.data.changePercent}% change)`;
      
      case 'PortfolioUpdated':
        return `[${timestamp}] PORTFOLIO_UPDATED: User ${event.data.userId} - ${event.data.ticker} qty: ${event.data.quantity}`;
      
      case 'BalanceUpdated':
        return `[${timestamp}] BALANCE_UPDATED: User ${event.data.userId} - $${event.data.previousBalance} → $${event.data.newBalance} (change: ${event.data.change})`;
    }
  }
}
