import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../src/app.js';
import { MarketRepository } from '../src/modules/market/market.repository.js';

const app = createApp();
const marketRepository = new MarketRepository();

describe('Trade Core (integration)', () => {
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const email = `trade-core-${Date.now()}@example.com`;
    const password = 'test-password';
    const reg = await request(app).post('/api/auth/register').send({ email, password });
    accessToken = reg.body.tokens.accessToken;
    userId = reg.body.user.id;

    // Seed mock quotes for testing
    await marketRepository.saveQuote({
      ticker: 'AAPL',
      price: '150.00',
      timestamp: new Date().toISOString(),
    });
    await marketRepository.saveQuote({
      ticker: 'MSFT',
      price: '300.00',
      timestamp: new Date().toISOString(),
    });
  });

  describe('POST /api/trade/preview', () => {
    it('previews a BUY order by quantity', async () => {
      const res = await request(app)
        .post('/api/trade/preview')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          side: 'BUY',
          ticker: 'AAPL',
          quantity: '10',
        })
        .expect(200);

      expect(res.body.data.estimatedNotional).toBe('1500.00');
      expect(res.body.data.canExecute).toBe(true);
    });

    it('previews a BUY order by notional', async () => {
      const res = await request(app)
        .post('/api/trade/preview')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          side: 'BUY',
          ticker: 'MSFT',
          notional: '900',
        })
        .expect(200);

      expect(res.body.data.estimatedQuantity).toBe('3.0000');
      expect(res.body.data.canExecute).toBe(true);
    });

    it('rejects unsupported ticker', async () => {
      await request(app)
        .post('/api/trade/preview')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          side: 'BUY',
          ticker: 'INVALID',
          quantity: '1',
        })
        .expect(400);
    });
  });

  describe('POST /api/trade', () => {
    it('executes a BUY order by quantity', async () => {
      const res = await request(app)
        .post('/api/trade')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          side: 'BUY',
          ticker: 'AAPL',
          quantity: '2',
        })
        .expect(202);

      expect(res.body.data.ticker).toBe('AAPL');
      expect(parseFloat(res.body.data.quantity)).toBe(2);
      expect(parseFloat(res.body.data.price)).toBe(150);
      expect(res.body.data.analysis).toBeDefined();
      expect(res.body.data.analysis.summary).toBeTypeOf('string');
      expect(Array.isArray(res.body.data.analysis.insights)).toBe(true);
    });

    it('executes a SELL order by notional', async () => {
      // First buy some AAPL
      await request(app)
        .post('/api/trade')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ side: 'BUY', ticker: 'AAPL', quantity: '10' });

      const res = await request(app)
        .post('/api/trade')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          side: 'SELL',
          ticker: 'AAPL',
          notional: '300',
        })
        .expect(202);

      expect(res.body.data.ticker).toBe('AAPL');
      expect(parseFloat(res.body.data.quantity)).toBe(2); // 300 / 150 = 2
    });

    it('rejects insufficient funds', async () => {
      await request(app)
        .post('/api/trade')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          side: 'BUY',
          ticker: 'AAPL',
          notional: '1000000',
        })
        .expect(409);
    });

    it('rejects insufficient holdings', async () => {
      await request(app)
        .post('/api/trade')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          side: 'SELL',
          ticker: 'MSFT',
          quantity: '1',
        })
        .expect(409);
    });
  });
});
