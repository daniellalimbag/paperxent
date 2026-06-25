import type { DomainEvent, EventSubscriber } from '../event.types.js';
import { AlertsService } from '../../../modules/alerts/alerts.service.js';

export class AlertsSubscriber implements EventSubscriber {
  id = 'alerts-subscriber';
  eventTypes = ['PriceTick'];

  private readonly alertsService = new AlertsService();

  async handle(event: DomainEvent): Promise<void> {
    if (event.eventType !== 'PriceTick') return;
    await this.alertsService.evaluateForTicker(event.data.ticker, event.data.price);
  }
}
