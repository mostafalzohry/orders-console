import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createTestContext, TestContext } from './helpers/test-context';

type Body = Record<string, unknown>;

const validBody = (): Body => ({
  customerName: 'Ada Lovelace',
  customerEmail: 'Ada@Example.com',
  items: [
    { name: 'Widget', quantity: 2, unitPriceMinor: 1250 },
    { name: 'Gadget', quantity: 1, unitPriceMinor: 999 },
  ],
});

describe('Create order (e2e)', () => {
  let ctx: TestContext;

  const post = (
    body: unknown,
    key: string | null = randomUUID(),
    cookie = ctx.adminCookie,
  ) => {
    const req = request(ctx.app.getHttpServer())
      .post('/api/orders')
      .set('Cookie', cookie);
    return (key === null ? req : req.set('Idempotency-Key', key)).send(
      body as object,
    );
  };

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await ctx.close();
  });

  describe('access and headers', () => {
    it('requires a login', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/orders')
        .set('Idempotency-Key', randomUUID())
        .send(validBody())
        .expect(401);
    });

    it('lets an agent create an order', async () => {
      await post(validBody(), randomUUID(), ctx.agentCookie).expect(201);
    });

    it('answers 400 when the Idempotency-Key header is missing', async () => {
      const res = await post(validBody(), null).expect(400);

      expect(JSON.stringify(res.body)).toContain('Idempotency-Key');
    });

    it.each([
      'not-a-uuid',
      '12345',
      '11111111-1111-1111-1111-11111111111',
      ' ',
    ])('answers 400 when the key is "%s"', async (key) => {
      await post(validBody(), key).expect(400);
    });
  });

  describe('a valid order', () => {
    it('answers 201 with the new order, a server-computed total and no internal fields', async () => {
      const key = randomUUID();

      const res = await post(validBody(), key).expect(201);
      const order = res.body as Record<string, unknown>;

      expect(Object.keys(order).sort()).toEqual(
        [
          'createdAt',
          'customerEmail',
          'customerName',
          'id',
          'items',
          'status',
          'totalMinor',
        ].sort(),
      );
      expect(order).toMatchObject({
        customerName: 'ada lovelace',
        customerEmail: 'ada@example.com',
        status: 'pending',
        totalMinor: 3499,
        items: [
          { name: 'Widget', quantity: 2, unitPriceMinor: 1250 },
          { name: 'Gadget', quantity: 1, unitPriceMinor: 999 },
        ],
      });
      expect(new Date(order.createdAt as string).getTime()).not.toBeNaN();
    });

    it('stores the creator, the key and a payload hash', async () => {
      const key = randomUUID();

      await post(validBody(), key).expect(201);
      const stored = await ctx.orders.findOne({ idempotencyKey: key }).lean();

      expect(String(stored?.createdBy)).toBe(String(ctx.adminId));
      expect(stored?.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('shows up in the orders list', async () => {
      const created = (await post(validBody()).expect(201)).body as {
        id: string;
      };

      const list = await request(ctx.app.getHttpServer())
        .get('/api/orders?limit=5')
        .set('Cookie', ctx.adminCookie)
        .expect(200);

      expect(
        (list.body as { data: { id: string }[] }).data.map((o) => o.id),
      ).toContain(created.id);
    });

    it('accepts an order with the maximum five items and the maximum values', async () => {
      const item = { name: 'x', quantity: 1000, unitPriceMinor: 10_000_000 };

      const res = await post({
        ...validBody(),
        items: Array(5).fill(item),
      }).expect(201);

      expect((res.body as { totalMinor: number }).totalMinor).toBe(
        50_000_000_000,
      );
    });
  });

  describe('sending the same request again', () => {
    it('answers 200 with the same order and a replay header, and creates nothing new', async () => {
      const key = randomUUID();
      const first = (await post(validBody(), key).expect(201)).body as {
        id: string;
      };

      const second = await post(validBody(), key).expect(200);

      expect((second.body as { id: string }).id).toBe(first.id);
      expect(second.headers['idempotent-replayed']).toBe('true');
      expect(await ctx.orders.countDocuments({ idempotencyKey: key })).toBe(1);
    });

    it('does not mark a first request as a replay', async () => {
      const res = await post(validBody()).expect(201);

      expect(res.headers['idempotent-replayed']).toBeUndefined();
    });

    it('treats spacing and letter case differences as the same order', async () => {
      const key = randomUUID();
      const first = (await post(validBody(), key).expect(201)).body as {
        id: string;
      };

      const second = await post(
        {
          customerName: '  ADA lovelace ',
          customerEmail: 'ada@example.COM',
          items: [
            { name: ' Widget', quantity: 2, unitPriceMinor: 1250 },
            { name: 'Gadget ', quantity: 1, unitPriceMinor: 999 },
          ],
        },
        key,
      ).expect(200);

      expect((second.body as { id: string }).id).toBe(first.id);
    });

    it('treats an upper-case key as the same key', async () => {
      const key = randomUUID();
      await post(validBody(), key).expect(201);

      await post(validBody(), key.toUpperCase()).expect(200);

      expect(await ctx.orders.countDocuments({ idempotencyKey: key })).toBe(1);
    });

    it('answers 422 when the key is reused for a different order, and keeps the original', async () => {
      const key = randomUUID();
      const first = (await post(validBody(), key).expect(201)).body as {
        id: string;
      };

      await post({ ...validBody(), customerName: 'Grace Hopper' }, key).expect(
        422,
      );

      expect(await ctx.orders.countDocuments({ idempotencyKey: key })).toBe(1);
      const stored = await ctx.orders.findById(first.id).lean();
      expect(stored?.customerName).toBe('ada lovelace');
    });

    it('keeps keys separate per user: the same key from another user makes another order', async () => {
      const key = randomUUID();
      const byAdmin = (await post(validBody(), key).expect(201)).body as {
        id: string;
      };

      const byAgent = (
        await post(validBody(), key, ctx.agentCookie).expect(201)
      ).body as { id: string };

      expect(byAgent.id).not.toBe(byAdmin.id);
      expect(await ctx.orders.countDocuments({ idempotencyKey: key })).toBe(2);
    });
  });

  describe('validation', () => {
    const withItems = (items: unknown): Body => ({ ...validBody(), items });
    const item = (overrides: Body = {}): Body => ({
      name: 'Widget',
      quantity: 1,
      unitPriceMinor: 100,
      ...overrides,
    });

    it.each<[string, () => Body]>([
      ['an empty body', () => ({})],
      [
        'a missing customer name',
        () => ({ ...validBody(), customerName: undefined }),
      ],
      [
        'a blank customer name',
        () => ({ ...validBody(), customerName: '   ' }),
      ],
      [
        'a customer name that is too long',
        () => ({ ...validBody(), customerName: 'a'.repeat(101) }),
      ],
      [
        'a customer name that is not text',
        () => ({ ...validBody(), customerName: 42 }),
      ],
      [
        'an invalid email',
        () => ({ ...validBody(), customerEmail: 'not-an-email' }),
      ],
      ['a missing email', () => ({ ...validBody(), customerEmail: undefined })],
      [
        'an email that is too long',
        () => ({ ...validBody(), customerEmail: `${'a'.repeat(250)}@x.com` }),
      ],
      ['no items', () => withItems([])],
      ['items that are not a list', () => withItems('widget')],
      ['six items', () => withItems(Array(6).fill(item()))],
      ['an item without a name', () => withItems([item({ name: undefined })])],
      ['an item with a blank name', () => withItems([item({ name: '  ' })])],
      [
        'an item name that is too long',
        () => withItems([item({ name: 'a'.repeat(101) })]),
      ],
      ['a quantity of zero', () => withItems([item({ quantity: 0 })])],
      ['a negative quantity', () => withItems([item({ quantity: -1 })])],
      ['a fractional quantity', () => withItems([item({ quantity: 1.5 })])],
      [
        'a quantity above the maximum',
        () => withItems([item({ quantity: 1001 })]),
      ],
      ['a quantity sent as text', () => withItems([item({ quantity: '2' })])],
      ['a price of zero', () => withItems([item({ unitPriceMinor: 0 })])],
      ['a negative price', () => withItems([item({ unitPriceMinor: -5 })])],
      ['a fractional price', () => withItems([item({ unitPriceMinor: 10.5 })])],
      [
        'a price above the maximum',
        () => withItems([item({ unitPriceMinor: 10_000_001 })]),
      ],
      [
        'a price sent as text',
        () => withItems([item({ unitPriceMinor: '100' })]),
      ],
      ['an unknown field on an item', () => withItems([item({ discount: 5 })])],
      [
        'a status chosen by the client',
        () => ({ ...validBody(), status: 'paid' }),
      ],
      [
        'a total chosen by the client',
        () => ({ ...validBody(), totalMinor: 1 }),
      ],
      [
        'a creator chosen by the client',
        () => ({ ...validBody(), createdBy: 'someone' }),
      ],
      ['an id chosen by the client', () => ({ ...validBody(), id: 'abc' })],
      [
        'an idempotency key in the body',
        () => ({ ...validBody(), idempotencyKey: randomUUID() }),
      ],
    ])('answers 400 for %s', async (_label, body) => {
      const before = await ctx.orders.countDocuments();

      await post(body()).expect(400);

      expect(await ctx.orders.countDocuments()).toBe(before);
    });
  });
});
