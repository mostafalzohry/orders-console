import request from 'supertest';
import { createTestContext, TestContext } from './helpers/test-context';

describe('Security headers (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('does not reveal the framework', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/me')
      .expect(401);

    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sets the standard hardening headers on every response', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/api/me')
      .expect(401);

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });
});
