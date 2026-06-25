import { globalEventBus } from './event-bus.js';
import { LoggingSubscriber } from './subscribers/logging.subscriber.js';
import { AnalyticsSubscriber } from './subscribers/analytics.subscriber.js';
import { AlertsSubscriber } from './subscribers/alerts.subscriber.js';

/**
 * Initialize the event system with default subscribers
 * Call this during application startup
 */
export function initializeEventSystem(): void {
  // Register logging subscriber
  const loggingSubscriber = new LoggingSubscriber();
  globalEventBus.subscribe(loggingSubscriber);

  // Register analytics subscriber
  const analyticsSubscriber = new AnalyticsSubscriber();
  globalEventBus.subscribe(analyticsSubscriber);

  const alertsSubscriber = new AlertsSubscriber();
  globalEventBus.subscribe(alertsSubscriber);

  console.log('[EventSystem] Initialized with default subscribers');
}

/**
 * Get the global event bus instance
 */
export function getEventBus() {
  return globalEventBus;
}
