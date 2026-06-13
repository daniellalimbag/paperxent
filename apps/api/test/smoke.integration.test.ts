import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('API smoke (integration)', () => {
  it('register → me → portfolio → trade → transactions', async () => {
    const email = `smoke-${Date.now()}@example.com`;
    const password = 'smoke-password-1';

    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email, password })
      .expect(201);

    expect(reg.body.tokens?.accessToken).toBeTruthy();
    const accessToken = reg.body.tokens.accessToken as string;
    const userId = reg.body.user.id as string;

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`).expect(200);

    expect(me.body.user?.email).toBe(email);

    await request(app).get('/api/portfolio').set('Authorization', `Bearer ${accessToken}`).expect(200);

    await request(app)
      .post('/api/trade')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        side: 'BUY',
        ticker: 'AAPL',
        quantity: '1',
      })
      .expect(202);

    const tx = await request(app)
      .get(`/api/transactions/${encodeURIComponent(userId)}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(tx.body.data?.items?.length).toBeGreaterThanOrEqual(1);
  });
});
