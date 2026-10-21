import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createTestContext, TestContext } from './helpers/test-context';

const body = () => ({
  customerName: 'Parallel Customer',
  customerEmail: 'parallel@example.com',
  items: [
    { name: 'Widget', quantity: 2, unitPriceMinor: 1250 },
    { name: 'Gadget', quantity: 1, unitPriceMinor: 999 },
  ],
});

describe('R2: the same create request never makes two orders (e2e)', () => {
  let ctx: TestContext;

  const send = (key: string, payload: object = body()) =>
    request(ctx.app.getHttpServer())
      .post('/api/orders')
      .set('Cookie', ctx.adminCookie)
      .set('Idempotency-Key', key)
      .send(payload);

  const idsOf = (responses: request.Response[]) =>
    responses.map((res) => (res.body as { id: string }).id);
  const statusesOf = (responses: request.Response[]) =>
    responses.map((res) => res.status).sort();

  beforeAll(async () => {
    ctx = await createTestContext();
    await ctx.app.listen(0);
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('2 identical requests fired in parallel leave exactly one order', async () => {
    const key = randomUUID();
    const before = await ctx.orders.countDocuments();

    const responses = await Promise.all([send(key), send(key)]);

    const inDatabase = await ctx.orders.countDocuments({ idempotencyKey: key });
    console.info(
      `2 parallel requests -> statuses ${JSON.stringify(statusesOf(responses))}, ` +
        `same order id: ${new Set(idsOf(responses)).size === 1}, ` +
        `orders in the database for this key: ${inDatabase}`,
    );
    expect(statusesOf(responses)).toEqual([200, 201]);
    expect(new Set(idsOf(responses)).size).toBe(1);
    expect(inDatabase).toBe(1);
    expect(await ctx.orders.countDocuments()).toBe(before + 1);
  });

  it('10 identical requests fired in parallel leave exactly one order', async () => {
    const key = randomUUID();

    const responses = await Promise.all(
      Array.from({ length: 10 }, () => send(key)),
    );

    const inDatabase = await ctx.orders.countDocuments({ idempotencyKey: key });
    console.info(
      `10 parallel requests -> ${statusesOf(responses).filter((s) => s === 201).length} created, ` +
        `${statusesOf(responses).filter((s) => s === 200).length} replayed, ` +
        `orders in the database for this key: ${inDatabase}`,
    );
    expect(statusesOf(responses).filter((s) => s === 201)).toHaveLength(1);
    expect(statusesOf(responses).filter((s) => s === 200)).toHaveLength(9);
    expect(new Set(idsOf(responses)).size).toBe(1);
    expect(inDatabase).toBe(1);
  });

  it('a double-click (two requests back to back) leaves exactly one order', async () => {
    const key = randomUUID();

    const first = await send(key);
    const second = await send(key);

    expect([first.status, second.status]).toEqual([201, 200]);
    expect(idsOf([first, second])[0]).toBe(idsOf([first, second])[1]);
    expect(await ctx.orders.countDocuments({ idempotencyKey: key })).toBe(1);
  });

  it('a retry after a lost response returns the order that was already saved', async () => {
    const key = randomUUID();
    await send(key).then(() => undefined);

    const retry = await send(key);

    expect(retry.status).toBe(200);
    expect(retry.headers['idempotent-replayed']).toBe('true');
    expect(await ctx.orders.countDocuments({ idempotencyKey: key })).toBe(1);
  });

  it('parallel requests with the same key but different orders create one order and reject the rest', async () => {
    const key = randomUUID();
    const different = { ...body(), customerName: 'Someone Else' };

    const responses = await Promise.all([send(key), send(key, different)]);

    expect(statusesOf(responses)).toEqual([201, 422]);
    expect(await ctx.orders.countDocuments({ idempotencyKey: key })).toBe(1);
  });

  it('documented limit: a new key with the same data creates a second order', async () => {
    const before = await ctx.orders.countDocuments();

    await send(randomUUID()).expect(201);
    await send(randomUUID()).expect(201);

    expect(await ctx.orders.countDocuments()).toBe(before + 2);
  });
});
