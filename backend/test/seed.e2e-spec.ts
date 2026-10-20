import { TestingModule, Test } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Order } from '../src/orders/order.schema';
import { OrderStatus } from '../src/orders/order-status.enum';
import { SeedModule } from '../src/seed/seed.module';
import { SEED_USERS, SeedService } from '../src/seed/seed.service';
import { Role } from '../src/users/role.enum';
import { User } from '../src/users/user.schema';

const COUNT = 200;
const NOW = new Date('2026-10-21T15:30:00');
const DUPLICATE_KEY = 11000;

describe('Seed (e2e)', () => {
  let moduleRef: TestingModule;
  let seed: SeedService;
  let orders: Model<Order>;
  let users: Model<User>;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [SeedModule],
    }).compile();
    await moduleRef.init();

    const connection = moduleRef.get<Connection>(getConnectionToken());
    expect(connection.name).toMatch(/_test$/);

    seed = moduleRef.get(SeedService);
    orders = moduleRef.get<Model<Order>>(getModelToken(Order.name));
    users = moduleRef.get<Model<User>>(getModelToken(User.name));
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('creates the requested number of orders and the admin and agent users', async () => {
    const summary = await seed.run({ count: COUNT, now: NOW });

    expect(summary.orders).toBe(COUNT);
    expect(summary.users).toBe(SEED_USERS.length);
    expect(
      Object.values(summary.ordersByStatus).reduce((a, b) => a + b, 0),
    ).toBe(COUNT);
    expect(Object.keys(summary.ordersByStatus).sort()).toEqual(
      Object.values(OrderStatus).sort(),
    );
  });

  it('stores users with hashed passwords and the right roles', async () => {
    const admin = await users.findOne({ email: 'admin@test.local' });
    const agent = await users.findOne({ email: 'agent@test.local' });

    expect(admin?.role).toBe(Role.Admin);
    expect(agent?.role).toBe(Role.Agent);
    expect(admin?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(admin?.passwordHash).not.toContain('Admin123!');
  });

  it('creates every index the queries need', async () => {
    const names = (await orders.collection.indexes()).map(
      (index) => index.name,
    );

    expect(names).toEqual(
      expect.arrayContaining([
        'createdAt_-1__id_-1',
        'totalMinor_-1__id_-1',
        'status_1_createdAt_-1__id_-1',
        'status_1_totalMinor_-1__id_-1',
        'customerName_1',
        'customerEmail_1',
        'createdBy_1_idempotencyKey_1',
      ]),
    );
  });

  describe('idempotency key index', () => {
    const order = (createdBy: Types.ObjectId, idempotencyKey: string) => ({
      customerName: 'test customer',
      customerEmail: 'test@example.com',
      items: [{ name: 'item', quantity: 1, unitPriceMinor: 100 }],
      totalMinor: 100,
      createdBy,
      idempotencyKey,
    });

    it('allows many orders without a key (the seeded ones)', async () => {
      const withoutKey = await orders.countDocuments({
        idempotencyKey: { $exists: false },
      });

      expect(withoutKey).toBe(COUNT);
    });

    it('rejects a second order with the same user and key', async () => {
      const user = new Types.ObjectId();
      await orders.create(order(user, 'key-1'));

      await expect(orders.create(order(user, 'key-1'))).rejects.toMatchObject({
        code: DUPLICATE_KEY,
      });
    });

    it('accepts the same key from a different user', async () => {
      await orders.create(order(new Types.ObjectId(), 'shared-key'));

      await expect(
        orders.create(order(new Types.ObjectId(), 'shared-key')),
      ).resolves.toBeDefined();
    });
  });

  it('can run twice and leaves the same data (re-runnable, deterministic)', async () => {
    const firstRun = await orders
      .find({}, { customerName: 1, totalMinor: 1, _id: 0 })
      .sort({ _id: 1 })
      .limit(20)
      .lean();

    const summary = await seed.run({ count: COUNT, now: NOW });
    const secondRun = await orders
      .find({}, { customerName: 1, totalMinor: 1, _id: 0 })
      .sort({ _id: 1 })
      .limit(20)
      .lean();

    expect(summary.orders).toBe(COUNT);
    expect(summary.users).toBe(SEED_USERS.length);
    expect(secondRun).toEqual(firstRun);
  });
});
