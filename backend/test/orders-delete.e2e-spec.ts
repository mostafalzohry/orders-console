import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createTestContext, TestContext } from './helpers/test-context';

describe('Delete order (e2e)', () => {
  let ctx: TestContext;

  const makeOrder = async (name = 'delete me') =>
    ctx.orders.create({
      customerName: name,
      customerEmail: `${randomUUID()}@example.com`,
      items: [{ name: 'item', quantity: 1, unitPriceMinor: 100 }],
      totalMinor: 100,
      createdBy: ctx.adminId,
    });
  const remove = (id: string, cookie = ctx.adminCookie) =>
    request(ctx.app.getHttpServer())
      .delete(`/api/orders/${id}`)
      .set('Cookie', cookie);

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('requires a login', async () => {
    const order = await makeOrder();

    await request(ctx.app.getHttpServer())
      .delete(`/api/orders/${order.id}`)
      .expect(401);

    expect(await ctx.orders.countDocuments({ _id: order._id })).toBe(1);
  });

  it('forbids an agent and leaves the order in place', async () => {
    const order = await makeOrder();

    await remove(String(order._id), ctx.agentCookie).expect(403);

    expect(await ctx.orders.countDocuments({ _id: order._id })).toBe(1);
  });

  it('lets an admin delete an order: 204 with no body', async () => {
    const order = await makeOrder();

    const res = await remove(String(order._id)).expect(204);

    expect(res.text).toBe('');
    expect(await ctx.orders.countDocuments({ _id: order._id })).toBe(0);
  });

  it('deletes only the order that was asked for', async () => {
    const target = await makeOrder('target');
    const neighbour = await makeOrder('neighbour');
    const before = await ctx.orders.countDocuments();

    await remove(String(target._id)).expect(204);

    expect(await ctx.orders.countDocuments()).toBe(before - 1);
    expect(await ctx.orders.countDocuments({ _id: neighbour._id })).toBe(1);
  });

  it('removes the order from the list', async () => {
    const order = await makeOrder('listed then deleted');
    await remove(String(order._id)).expect(204);

    const list = await request(ctx.app.getHttpServer())
      .get('/api/orders?limit=100')
      .set('Cookie', ctx.adminCookie)
      .expect(200);

    expect(
      (list.body as { data: { id: string }[] }).data.map((o) => o.id),
    ).not.toContain(String(order._id));
  });

  it('answers 404 for an id that does not exist, and for a second delete', async () => {
    const order = await makeOrder();
    await remove(String(order._id)).expect(204);

    await remove(String(order._id)).expect(404);
    await remove('6ad921964ffea9039a77ced2').expect(404);
  });

  it.each([
    'abc',
    '123',
    'not-an-id',
    '6ad921964ffea9039a77cedz',
    '%7B%22%24ne%22%3Anull%7D',
  ])('answers 400 for the malformed id "%s"', async (id) => {
    await remove(id).expect(400);
  });

  it('checks the role before the id: an agent with a bad id gets 403, not 400', async () => {
    await remove('abc', ctx.agentCookie).expect(403);
  });
});
