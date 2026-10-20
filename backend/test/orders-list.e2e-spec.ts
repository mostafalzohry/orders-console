import { en, Faker } from '@faker-js/faker';
import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection, Model, Types } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { OrderStatus } from '../src/orders/order-status.enum';
import { Order } from '../src/orders/order.schema';
import { buildOrder } from '../src/seed/order.factory';
import { PasswordService } from '../src/users/password.service';
import { Role } from '../src/users/role.enum';
import { UsersService } from '../src/users/users.service';

const TOTAL = 2000;
const ADMIN = { email: 'admin@test.local', password: 'Admin123!' };
const AGENT = { email: 'agent@test.local', password: 'Agent123!' };

type Row = Order & { _id: Types.ObjectId };
type Params = Record<string, string | number | undefined>;

describe('Orders list (e2e)', () => {
  let app: INestApplication<App>;
  let orders: Model<Order>;
  let connection: Connection;
  let adminCookie: string;
  let agentCookie: string;
  let adminId: Types.ObjectId;
  let all: Row[];

  const server = () => app.getHttpServer();
  const get = (params: Params, cookie = adminCookie) =>
    request(server()).get('/api/orders').query(params).set('Cookie', cookie);
  const cookieOf = async (credentials: object) => {
    const res = await request(server()).post('/api/login').send(credentials);
    const cookie = res
      .get('Set-Cookie')
      ?.find((c) => c.startsWith('access_token='));
    return cookie ? cookie.split(';')[0] : '';
  };

  async function walk(
    params: Params,
  ): Promise<{ ids: string[]; pages: number }> {
    const ids: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const res = await get({ ...params, cursor: cursor ?? undefined }).expect(
        200,
      );
      const body = res.body as {
        data: { id: string }[];
        nextCursor: string | null;
      };
      ids.push(...body.data.map((row) => row.id));
      cursor = body.nextCursor;
      pages++;
    } while (cursor);
    return { ids, pages };
  }

  async function expectedIds(
    filter: object,
    sort: 'createdAt' | 'totalMinor',
    dir: 'asc' | 'desc',
  ): Promise<string[]> {
    const direction = dir === 'asc' ? 1 : -1;
    const rows = await orders
      .find(filter, { _id: 1 })
      .sort({ [sort]: direction, _id: direction })
      .lean();
    return rows.map((row) => String(row._id));
  }

  const startsAWord = (text: string, term: string) =>
    (' ' + text.replace(/[._@-]/g, ' ')).includes(' ' + term);
  const matchingIds = (term: string, status?: OrderStatus) =>
    all
      .filter((row) => !status || row.status === status)
      .filter(
        (row) =>
          startsAWord(row.customerName, term) ||
          startsAWord(row.customerEmail, term),
      )
      .map((row) => row._id);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    connection = app.get<Connection>(getConnectionToken());
    expect(connection.name).toMatch(/_test$/);
    orders = app.get<Model<Order>>(getModelToken(Order.name));
    await orders.init();

    const users = app.get(UsersService);
    const passwords = app.get(PasswordService);
    await connection.collection('users').deleteMany({});
    await orders.deleteMany({});
    const admin = await users.create({
      email: ADMIN.email,
      passwordHash: await passwords.hash(ADMIN.password),
      role: Role.Admin,
    });
    const agent = await users.create({
      email: AGENT.email,
      passwordHash: await passwords.hash(AGENT.password),
      role: Role.Agent,
    });
    adminId = admin._id;

    const faker = new Faker({ locale: [en] });
    faker.seed(7);
    const creatorIds = [admin._id, agent._id];
    await orders.insertMany(
      Array.from({ length: TOTAL }, () =>
        buildOrder({ faker, creatorIds, now: new Date() }),
      ),
      { ordered: false },
    );
    all = await orders.find().lean<Row[]>();

    adminCookie = await cookieOf(ADMIN);
    agentCookie = await cookieOf(AGENT);
  });

  afterAll(async () => {
    await orders.deleteMany({});
    await connection.collection('users').deleteMany({});
    await app.close();
  });

  describe('access', () => {
    it('requires a login', async () => {
      await request(server()).get('/api/orders').expect(401);
    });

    it('lets both an agent and an admin read the list', async () => {
      await get({}, agentCookie).expect(200);
      await get({}, adminCookie).expect(200);
    });
  });

  describe('response shape', () => {
    it('returns 50 newest orders by default, with their line items and no internal fields', async () => {
      const res = await get({}).expect(200);
      const body = res.body as {
        data: Record<string, unknown>[];
        nextCursor: string | null;
      };

      expect(body.data).toHaveLength(50);
      expect(typeof body.nextCursor).toBe('string');
      expect(Object.keys(body.data[0]).sort()).toEqual(
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
      const items = body.data[0].items as Record<string, unknown>[];
      expect(Object.keys(items[0]).sort()).toEqual(
        ['name', 'quantity', 'unitPriceMinor'].sort(),
      );
      expect(body.data.map((row) => row.id)).toEqual(
        (await expectedIds({}, 'createdAt', 'desc')).slice(0, 50),
      );
    });

    it('honours the limit', async () => {
      const res = await get({ limit: 5 }).expect(200);

      expect((res.body as { data: unknown[] }).data).toHaveLength(5);
    });
  });

  describe('cursor pagination', () => {
    it.each([
      ['createdAt', 'desc'],
      ['createdAt', 'asc'],
      ['totalMinor', 'desc'],
      ['totalMinor', 'asc'],
    ] as const)(
      'visits every order exactly once, in order, sorted by %s %s',
      async (sort, dir) => {
        const { ids, pages } = await walk({ sort, dir, limit: 100 });

        expect(ids).toHaveLength(TOTAL);
        expect(new Set(ids).size).toBe(TOTAL);
        expect(ids).toEqual(await expectedIds({}, sort, dir));
        expect(pages).toBe(TOTAL / 100);
      },
    );

    it('ends the last page with a null cursor and no empty extra page', async () => {
      const { pages } = await walk({ limit: 50 });

      expect(pages).toBe(TOTAL / 50);
    });

    it('is not disturbed by a new order arriving between two pages', async () => {
      const first = (await get({ limit: 50 }).expect(200)).body as {
        data: { id: string }[];
        nextCursor: string;
      };
      const inserted = await orders.create({
        customerName: 'newcomer',
        customerEmail: 'newcomer@example.com',
        items: [{ name: 'late item', quantity: 1, unitPriceMinor: 100 }],
        totalMinor: 100,
        createdBy: adminId,
      });

      const second = (
        await get({ limit: 50, cursor: first.nextCursor }).expect(200)
      ).body as { data: { id: string }[] };
      await orders.deleteOne({ _id: inserted._id });

      const firstIds = first.data.map((row) => row.id);
      const secondIds = second.data.map((row) => row.id);
      expect(secondIds.filter((id) => firstIds.includes(id))).toEqual([]);
      expect(secondIds).not.toContain(String(inserted._id));
      expect(secondIds).toEqual(
        (await expectedIds({}, 'createdAt', 'desc')).slice(50, 100),
      );
    });
  });

  describe('orders that tie on the sort value', () => {
    it.each([
      ['createdAt', 'desc'],
      ['createdAt', 'asc'],
      ['totalMinor', 'desc'],
      ['totalMinor', 'asc'],
    ] as const)(
      'never repeats or skips an order when 12 share the same %s (%s)',
      async (sort, dir) => {
        const sameMoment = new Date('2026-01-01T10:00:00.000Z');
        const tied = await orders.insertMany(
          Array.from({ length: 12 }, (_, i) => ({
            customerName: `tied customer ${i}`,
            customerEmail: `tied${i}@example.com`,
            items: [{ name: 'tied item', quantity: 1, unitPriceMinor: 777 }],
            totalMinor: 777,
            createdBy: adminId,
            createdAt: sameMoment,
          })),
        );

        try {
          const { ids } = await walk({ sort, dir, limit: 5 });

          expect(ids).toHaveLength(TOTAL + 12);
          expect(new Set(ids).size).toBe(TOTAL + 12);
          expect(ids).toEqual(await expectedIds({}, sort, dir));
        } finally {
          await orders.deleteMany({ _id: { $in: tied.map((o) => o._id) } });
        }
      },
    );
  });

  describe('status filter', () => {
    it('returns only that status and all of it', async () => {
      const { ids } = await walk({ status: OrderStatus.Cancelled });

      expect(ids).toEqual(
        await expectedIds(
          { status: OrderStatus.Cancelled },
          'createdAt',
          'desc',
        ),
      );
      expect(ids.length).toBeGreaterThan(0);
    });
  });

  describe('search', () => {
    const lastWord = () => all[0].customerName.split(' ').pop() as string;
    const firstThree = () => all[1].customerName.slice(0, 3);

    it('finds a customer by the start of their last name', async () => {
      const term = lastWord();
      const expected = matchingIds(term);

      const { ids } = await walk({ search: term });

      expect(expected.length).toBeGreaterThan(0);
      expect(new Set(ids)).toEqual(new Set(expected.map(String)));
    });

    it('finds customers by the start of a first name', async () => {
      const term = firstThree();

      const { ids } = await walk({ search: term, limit: 100 });

      expect(new Set(ids)).toEqual(new Set(matchingIds(term).map(String)));
    });

    it('searches the email as well', async () => {
      const { ids } = await walk({ search: 'gmail', limit: 100 });

      expect(ids.length).toBeGreaterThan(0);
      expect(new Set(ids)).toEqual(new Set(matchingIds('gmail').map(String)));
    });

    it('ignores letter case and surrounding spaces', async () => {
      const term = lastWord();

      const plain = await walk({ search: term });
      const shouted = await walk({ search: `  ${term.toUpperCase()}  ` });

      expect(shouted.ids).toEqual(plain.ids);
    });

    it('combines with a status filter and an amount sort', async () => {
      const term = firstThree();
      const expectedSet = matchingIds(term, OrderStatus.Paid);

      const { ids } = await walk({
        search: term,
        status: OrderStatus.Paid,
        sort: 'totalMinor',
        dir: 'desc',
        limit: 20,
      });

      expect(ids).toEqual(
        await expectedIds({ _id: { $in: expectedSet } }, 'totalMinor', 'desc'),
      );
    });

    it.each(['.*', '(', '[', '\\', '^$', '+?'])(
      'treats "%s" as plain text, not a pattern',
      async (term) => {
        const res = await get({ search: term }).expect(200);

        expect((res.body as { data: unknown[] }).data).toEqual([]);
      },
    );
  });

  describe('validation', () => {
    it.each([
      ['limit of zero', 'limit=0'],
      ['limit above the maximum', 'limit=101'],
      ['limit that is not a number', 'limit=abc'],
      ['empty limit', 'limit='],
      ['unknown sort field', 'sort=customerName'],
      ['unknown direction', 'dir=up'],
      ['unknown status', 'status=bogus'],
      ['empty status', 'status='],
      ['garbage cursor', 'cursor=garbage'],
      ['operator object in search', 'search[$ne]=x'],
      ['search given twice', 'search=a&search=b'],
      ['search that is too long', `search=${'a'.repeat(101)}`],
      ['unknown parameter', 'foo=1'],
    ])('answers 400 for a %s', async (_label, query) => {
      await request(server())
        .get(`/api/orders?${query}`)
        .set('Cookie', adminCookie)
        .expect(400);
    });

    it('rejects a cursor made for a different sort', async () => {
      const page = (await get({ sort: 'totalMinor', limit: 5 }).expect(200))
        .body as { nextCursor: string };

      await get({ sort: 'createdAt', cursor: page.nextCursor }).expect(400);
      await get({
        sort: 'totalMinor',
        dir: 'asc',
        cursor: page.nextCursor,
      }).expect(400);
    });
  });
});
