import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../src/app.js';
import { MarketRepository } from '../src/modules/market/market.repository.js';
import { AlertsService } from '../src/modules/alerts/alerts.service.js';

const app = createApp();
const marketRepository = new MarketRepository();

describe('Paper alerts (integration)', () => {
  let accessToken: string;

  beforeAll(async () => {
    const email = `alerts-${Date.now()}@example.com`;
    const reg = await request(app).post('/api/auth/register').send({ email, password: 'pw-test-12' }).expect(201);
    accessToken = reg.body.tokens.accessToken as string;

    await marketRepository.saveQuote({
      ticker: 'AAPL',
      price: '100.00',
      timestamp: new Date().toISOString(),
      previousPrice: '100.00',
      change: '0',
      changePercent: '0',
    });
  });

  it('creates, lists, and removes a price-above alert', async () => {
    const empty = await request(app)
      .get('/api/alerts')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(empty.body.data.active).toEqual([]);

    const created = await request(app)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ticker: 'AAPL', type: 'PRICE_ABOVE', targetPrice: '105' })
      .expect(201);

    expect(created.body.data.ticker).toBe('AAPL');
    expect(created.body.data.type).toBe('PRICE_ABOVE');
    expect(created.body.data.isActive).toBe(true);

    const list = await request(app)
      .get('/api/alerts')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(list.body.data.active).toHaveLength(1);

    await request(app)
      .delete(`/api/alerts/${created.body.data.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
  });

  it('triggers a price-below alert when evaluated', async () => {
    const created = await request(app)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ticker: 'AAPL', type: 'PRICE_BELOW', targetPrice: '99' })
      .expect(201);

    const service = new AlertsService();
    await service.evaluateForTicker('AAPL', '98.50');

    const list = await request(app)
      .get('/api/alerts')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const triggered = list.body.data.triggered.find((a: { id: string }) => a.id === created.body.data.id);
    expect(triggered).toBeDefined();
    expect(triggered.triggeredPrice).toBe('98.5');
  });
});
