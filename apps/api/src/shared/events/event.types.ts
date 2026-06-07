/**
 * Base event interface that all events must extend
 */
export interface BaseEvent {
  eventType: string;
  timestamp: string;
  eventId: string;
}

/**
 * Trade execution event emitted when a trade is successfully executed
 */
export interface TradeExecutedEvent extends BaseEvent {
  eventType: 'TradeExecuted';
  data: {
    transactionId: string;
    userId: string;
    side: 'BUY' | 'SELL';
    ticker: string;
    quantity: string;
    price: string;
    userBalance: string;
    portfolioQuantity: string;
    averageBuyPrice: string | null;
    executedAt: string;
  };
}

/**
 * Price tick event emitted when market prices are updated
 */
export interface PriceTickEvent extends BaseEvent {
  eventType: 'PriceTick';
  data: {
    ticker: string;
    price: string;
    previousPrice: string;
    change: string;
    changePercent: string;
    timestamp: string;
  };
}

/**
 * Portfolio updated event emitted when portfolio holdings change
 */
export interface PortfolioUpdatedEvent extends BaseEvent {
  eventType: 'PortfolioUpdated';
  data: {
    userId: string;
    ticker: string;
    quantity: string;
    averageBuyPrice: string | null;
    timestamp: string;
  };
}

/**
 * User balance updated event emitted when user balance changes
 */
export interface BalanceUpdatedEvent extends BaseEvent {
  eventType: 'BalanceUpdated';
  data: {
    userId: string;
    previousBalance: string;
    newBalance: string;
    change: string;
    timestamp: string;
  };
}

/**
 * Union type of all possible events
 */
export type DomainEvent =
  | TradeExecutedEvent
  | PriceTickEvent
  | PortfolioUpdatedEvent
  | BalanceUpdatedEvent;

/**
 * Event subscriber interface for consuming events
 */
export interface EventSubscriber {
  /**
   * Unique identifier for this subscriber
   */
  id: string;

  /**
   * Event types this subscriber is interested in
   */
  eventTypes: string[];

  /**
   * Handler function called when subscribed events are emitted
   */
  handle(event: DomainEvent): Promise<void> | void;

  /**
   * Optional error handler for subscriber-specific error handling
   */
  onError?: (error: Error, event: DomainEvent) => void;
}

/**
 * Event bus configuration options
 */
export interface EventBusConfig {
  /**
   * Enable event logging
   */
  enableLogging?: boolean;

  /**
   * Maximum number of subscribers
   */
  maxSubscribers?: number;

  /**
   * Enable async event processing
   */
  asyncProcessing?: boolean;
}
