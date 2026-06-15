import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Watchlist (integration)', () => {
  let accessToken: string;

  beforeAll(async () => {
    const email = `watchlist-${Date.now()}@example.com`;
    const reg = await request(app).post('/api/auth/register').send({ email, password: 'pw-test-12' }).expect(201);
    accessToken = reg.body.tokens.accessToken as string;
  });

  it('lists empty then add, list, remove', async () => {
    const empty = await request(app).get('/api/watchlist').set('Authorization', `Bearer ${accessToken}`).expect(200);
    expect(empty.body.data).toEqual([]);

    const add = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ticker: 'AAPL' })
      .expect(201);
    expect(add.body.data.ticker).toBe('AAPL');

    const one = await request(app).get('/api/watchlist').set('Authorization', `Bearer ${accessToken}`).expect(200);
    expect(one.body.data).toHaveLength(1);
    expect(one.body.data[0].ticker).toBe('AAPL');

    await request(app)
      .delete('/api/watchlist/AAPL')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const after = await request(app).get('/api/watchlist').set('Authorization', `Bearer ${accessToken}`).expect(200);
    expect(after.body.data).toEqual([]);
  });

  it('rejects duplicate add', async () => {
    await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ticker: 'MSFT' })
      .expect(201);
    await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ticker: 'MSFT' })
      .expect(409);
  });
});
