import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../src/app.js';
import { MarketRepository } from '../src/modules/market/market.repository.js';

const app = createApp();
const marketRepository = new MarketRepository();

describe('Settings (integration)', () => {
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const email = `settings-${Date.now()}@example.com`;
    const reg = await request(app).post('/api/auth/register').send({ email, password: 'pw-test-12' }).expect(201);
    accessToken = reg.body.tokens.accessToken as string;
    userId = reg.body.user.id as string;
    expect(reg.body.user.startingBalance).toBe('100000');

    await marketRepository.saveQuote({
      ticker: 'AAPL',
      price: '100.00',
      timestamp: new Date().toISOString(),
      previousPrice: '100.00',
      change: '0',
      changePercent: '0',
    });
  });

  it('returns settings and updates starting balance', async () => {
    const initial = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(initial.body.data.startingBalance).toBe('100000');
    expect(initial.body.data.balance).toBe('100000');

    const updated = await request(app)
      .patch('/api/settings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ startingBalance: '250000' })
      .expect(200);

    expect(updated.body.data.startingBalance).toBe('250000');
    expect(updated.body.data.balance).toBe('100000');
  });

  it('resets portfolio to starting balance after trades', async () => {
    await request(app)
      .post('/api/trade')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ side: 'BUY', ticker: 'AAPL', notional: '5000' })
      .expect(202);

    const beforeReset = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(Number(beforeReset.body.data.balance)).toBeLessThan(100000);

    const reset = await request(app)
      .post('/api/settings/reset-portfolio')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(reset.body.data.balance).toBe('250000');
    expect(reset.body.data.startingBalance).toBe('250000');

    const history = await request(app)
      .get(`/api/transactions/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(history.body.data.items).toEqual([]);
  });
});
