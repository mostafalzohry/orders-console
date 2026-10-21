import request from 'supertest';
import { OrderStatus } from '../src/orders/order-status.enum';
import { createTestContext, TestContext } from './helpers/test-context';

interface Stats {
  totalsByStatus: Record<string, number>;
  totalOrders: number;
  revenueTodayMinor: number;
  generatedAt: string;
}

describe('Order stats (e2e)', () => {
  let ctx: TestContext;

  const fetchStats = (cookie = ctx.adminCookie) =>
    request(ctx.app.getHttpServer())
      .get('/api/orders/stats')
      .set('Cookie', cookie);
  const order = (status: OrderStatus, totalMinor: number, createdAt: Date) => ({
    customerName: 'stats customer',
    customerEmail: 'stats@example.com',
    status,
    items: [{ name: 'item', quantity: 1, unitPriceMinor: totalMinor }],
    totalMinor,
    createdBy: ctx.adminId,
    createdAt,
  });

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.orders.deleteMany({});
  });

  it('requires a login', async () => {
    await request(ctx.app.getHttpServer()).get('/api/orders/stats').expect(401);
  });

  it('lets an agent and an admin read it', async () => {
    await fetchStats(ctx.agentCookie).expect(200);
    await fetchStats(ctx.adminCookie).expect(200);
  });

  it('shows every status with 0 when there are no orders', async () => {
    const res = await fetchStats().expect(200);
    const stats = res.body as Stats;

    expect(stats.totalsByStatus).toEqual({
      pending: 0,
      paid: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    });
    expect(stats.totalOrders).toBe(0);
    expect(stats.revenueTodayMinor).toBe(0);
    expect(new Date(stats.generatedAt).getTime()).not.toBeNaN();
  });

  it('counts orders by status', async () => {
    const now = new Date();
    await ctx.orders.insertMany([
      order(OrderStatus.Paid, 100, now),
      order(OrderStatus.Paid, 100, now),
      order(OrderStatus.Paid, 100, now),
      order(OrderStatus.Pending, 100, now),
      order(OrderStatus.Cancelled, 100, now),
      order(OrderStatus.Cancelled, 100, now),
    ]);

    const stats = (await fetchStats().expect(200)).body as Stats;

    expect(stats.totalsByStatus).toMatchObject({
      paid: 3,
      pending: 1,
      cancelled: 2,
      shipped: 0,
      delivered: 0,
    });
    expect(stats.totalOrders).toBe(6);
  });

  it("adds up only today's orders, and leaves out cancelled ones", async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 36 * 60 * 60 * 1000);
    await ctx.orders.insertMany([
      order(OrderStatus.Paid, 1000, now),
      order(OrderStatus.Delivered, 2500, now),
      order(OrderStatus.Cancelled, 9999, now),
      order(OrderStatus.Paid, 7777, yesterday),
    ]);

    const stats = (await fetchStats().expect(200)).body as Stats;

    expect(stats.revenueTodayMinor).toBe(3500);
  });

  it('matches the database for a large set of orders', async () => {
    const now = new Date();
    const rows = Array.from({ length: 300 }, (_, i) =>
      order(
        Object.values(OrderStatus)[i % 5],
        100 + i,
        i % 3 === 0 ? now : new Date(now.getTime() - 40 * 60 * 60 * 1000),
      ),
    );
    await ctx.orders.insertMany(rows);

    const stats = (await fetchStats().expect(200)).body as Stats;

    const expectedToday = rows
      .filter((r) => r.createdAt === now && r.status !== OrderStatus.Cancelled)
      .reduce((sum, r) => sum + r.totalMinor, 0);
    expect(stats.totalOrders).toBe(300);
    expect(stats.totalsByStatus.pending).toBe(60);
    expect(stats.revenueTodayMinor).toBe(expectedToday);
  });
});
