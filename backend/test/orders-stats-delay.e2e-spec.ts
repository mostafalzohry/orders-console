process.env.STATS_DELAY_MIN_MS = '500';
process.env.STATS_DELAY_MAX_MS = '500';

import { request as httpRequest } from 'node:http';
import request from 'supertest';
import { OrdersRepository } from '../src/orders/orders.repository';
import { createTestContext, TestContext } from './helpers/test-context';

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Order stats are deliberately slow and cancellable (e2e)', () => {
  let ctx: TestContext;
  let port: number;

  beforeAll(async () => {
    ctx = await createTestContext();
    await ctx.app.listen(0);
    port = Number(new URL(await ctx.app.getUrl()).port);
  });

  afterAll(async () => {
    await ctx.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('waits for the configured time before answering', async () => {
    const startedAt = Date.now();

    await request(ctx.app.getHttpServer())
      .get('/api/orders/stats')
      .set('Cookie', ctx.adminCookie)
      .expect(200);

    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(450);
  });

  it('does no database work when the client gives up during the wait', async () => {
    const countByStatus = jest.spyOn(
      ctx.app.get(OrdersRepository),
      'countByStatus',
    );

    const req = httpRequest({
      port,
      path: '/api/orders/stats',
      headers: { Cookie: ctx.adminCookie },
    });
    req.on('error', () => undefined);
    req.end();
    await pause(100);
    req.destroy();
    await pause(800);

    expect(countByStatus).not.toHaveBeenCalled();
  });

  it('does run the query when the client waits for the answer', async () => {
    const countByStatus = jest.spyOn(
      ctx.app.get(OrdersRepository),
      'countByStatus',
    );

    await request(ctx.app.getHttpServer())
      .get('/api/orders/stats')
      .set('Cookie', ctx.adminCookie)
      .expect(200);

    expect(countByStatus).toHaveBeenCalledTimes(1);
  });
});
