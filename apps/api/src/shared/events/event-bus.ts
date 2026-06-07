import { randomUUID } from 'node:crypto';
import type { DomainEvent, EventSubscriber, EventBusConfig } from './event.types.js';

/**
 * Event Bus - Central pub/sub system for domain events
 * Allows decoupled communication between different parts of the system
 * and enables future extensibility for analytics, logging, and ML pipelines
 */
export class EventBus {
  private subscribers: Map<string, EventSubscriber> = new Map();
  private config: Required<EventBusConfig>;

  constructor(config: EventBusConfig = {}) {
    this.config = {
      enableLogging: config.enableLogging ?? true,
      maxSubscribers: config.maxSubscribers ?? 100,
      asyncProcessing: config.asyncProcessing ?? true,
    };
  }

  /**
   * Subscribe to specific event types
   */
  subscribe(subscriber: EventSubscriber): void {
    if (this.subscribers.size >= this.config.maxSubscribers) {
      throw new Error(`Maximum number of subscribers (${this.config.maxSubscribers}) reached`);
    }

    if (this.subscribers.has(subscriber.id)) {
      throw new Error(`Subscriber with id ${subscriber.id} already exists`);
    }

    this.subscribers.set(subscriber.id, subscriber);

    if (this.config.enableLogging) {
      console.log(`[EventBus] Subscriber registered: ${subscriber.id} for events: ${subscriber.eventTypes.join(', ')}`);
    }
  }

  /**
   * Unsubscribe a specific subscriber
   */
  unsubscribe(subscriberId: string): void {
    const removed = this.subscribers.delete(subscriberId);
    
    if (removed && this.config.enableLogging) {
      console.log(`[EventBus] Subscriber unregistered: ${subscriberId}`);
    }
  }

  /**
   * Publish an event to all interested subscribers
   */
  async publish(event: DomainEvent): Promise<void> {
    if (this.config.enableLogging) {
      console.log(`[EventBus] Publishing event: ${event.eventType} (id: ${event.eventId})`);
    }

    const interestedSubscribers = Array.from(this.subscribers.values()).filter(
      (subscriber) => subscriber.eventTypes.includes(event.eventType)
    );

    if (interestedSubscribers.length === 0) {
      if (this.config.enableLogging) {
        console.log(`[EventBus] No subscribers for event: ${event.eventType}`);
      }
      return;
    }

    if (this.config.asyncProcessing) {
      // Process all subscribers asynchronously in parallel
      const promises = interestedSubscribers.map(async (subscriber) => {
        try {
          await subscriber.handle(event);
        } catch (error) {
          this.handleSubscriberError(error, subscriber, event);
        }
      });

      await Promise.allSettled(promises);
    } else {
      // Process subscribers synchronously
      for (const subscriber of interestedSubscribers) {
        try {
          await subscriber.handle(event);
        } catch (error) {
          this.handleSubscriberError(error, subscriber, event);
        }
      }
    }
  }

  /**
   * Get current subscriber count
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Get all subscriber IDs
   */
  getSubscriberIds(): string[] {
    return Array.from(this.subscribers.keys());
  }

  /**
   * Clear all subscribers (useful for testing)
   */
  clear(): void {
    this.subscribers.clear();
    if (this.config.enableLogging) {
      console.log('[EventBus] All subscribers cleared');
    }
  }

  /**
   * Handle subscriber errors
   */
  private handleSubscriberError(error: unknown, subscriber: EventSubscriber, event: DomainEvent): void {
    const err = error instanceof Error ? error : new Error(String(error));
    
    if (subscriber.onError) {
      subscriber.onError(err, event);
    } else {
      console.error(`[EventBus] Error in subscriber ${subscriber.id}:`, err.message);
    }
  }
}

/**
 * Helper function to create a base event with required fields
 */
export function createBaseEvent(eventType: DomainEvent['eventType']): Pick<DomainEvent, 'eventType' | 'eventId' | 'timestamp'> {
  return {
    eventType,
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Singleton event bus instance for application-wide use
 */
export const globalEventBus = new EventBus({
  enableLogging: true,
  maxSubscribers: 100,
  asyncProcessing: true,
});
