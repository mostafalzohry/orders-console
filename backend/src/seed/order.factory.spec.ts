import { en, Faker } from '@faker-js/faker';
import { Types } from 'mongoose';
import { OrderStatus } from '../orders/order-status.enum';
import { MAX_ITEMS_PER_ORDER } from '../orders/order.schema';
import { buildOrder, NewOrder } from './order.factory';

const NOW = new Date('2026-10-21T15:30:00');
const CREATORS = [new Types.ObjectId(), new Types.ObjectId()];

function buildMany(count: number, seed = 42): NewOrder[] {
  const faker = new Faker({ locale: [en] });
  faker.seed(seed);
  return Array.from({ length: count }, () =>
    buildOrder({ faker, creatorIds: CREATORS, now: NOW }),
  );
}

describe('buildOrder', () => {
  const orders = buildMany(2000);

  it('gives every order 1 to 5 items with whole-number quantities and prices', () => {
    for (const order of orders) {
      expect(order.items.length).toBeGreaterThanOrEqual(1);
      expect(order.items.length).toBeLessThanOrEqual(MAX_ITEMS_PER_ORDER);
      for (const item of order.items) {
        expect(Number.isInteger(item.quantity)).toBe(true);
        expect(Number.isInteger(item.unitPriceMinor)).toBe(true);
        expect(item.quantity).toBeGreaterThanOrEqual(1);
        expect(item.unitPriceMinor).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('makes the total exactly the sum of quantity times price', () => {
    for (const order of orders) {
      const expected = order.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPriceMinor,
        0,
      );
      expect(order.totalMinor).toBe(expected);
    }
  });

  it('uses only known statuses and covers all of them', () => {
    const seen = new Set(orders.map((order) => order.status));

    expect([...seen].sort()).toEqual(Object.values(OrderStatus).sort());
  });

  it('stores names and emails in lowercase', () => {
    for (const order of orders) {
      expect(order.customerName).toBe(order.customerName.toLowerCase());
      expect(order.customerEmail).toBe(order.customerEmail.toLowerCase());
      expect(order.customerEmail).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    }
  });

  it('dates every order within the last 365 days and never in the future', () => {
    const oldest = NOW.getTime() - 365 * 24 * 60 * 60 * 1000;
    for (const order of orders) {
      expect(order.createdAt.getTime()).toBeGreaterThanOrEqual(oldest);
      expect(order.createdAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
    }
  });

  it('creates some orders today so a revenue-today figure is not empty', () => {
    const startOfToday = new Date(NOW);
    startOfToday.setHours(0, 0, 0, 0);

    const today = orders.filter((order) => order.createdAt >= startOfToday);

    expect(today.length).toBeGreaterThan(0);
    expect(today.length).toBeLessThan(orders.length * 0.06);
  });

  it('assigns each order to one of the given users', () => {
    for (const order of orders) {
      expect(CREATORS.some((id) => id.equals(order.createdBy))).toBe(true);
    }
  });

  it('is deterministic: the same seed gives the same orders', () => {
    const again = buildMany(2000);

    expect(again).toEqual(orders);
    expect(buildMany(5, 7)).not.toEqual(buildMany(5, 8));
  });
});
