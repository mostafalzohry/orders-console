import { Faker } from '@faker-js/faker';
import { Types } from 'mongoose';
import { OrderStatus } from '../orders/order-status.enum';
import { NewOrder } from '../orders/new-order.type';
import { MAX_ITEMS_PER_ORDER } from '../orders/constants/orders.constants';
import { OrderItem } from '../orders/order.schema';

export interface OrderFactoryContext {
  faker: Faker;
  creatorIds: Types.ObjectId[];
  now: Date;
}

const STATUS_WEIGHTS = [
  { weight: 25, value: OrderStatus.Paid },
  { weight: 25, value: OrderStatus.Delivered },
  { weight: 20, value: OrderStatus.Pending },
  { weight: 20, value: OrderStatus.Shipped },
  { weight: 10, value: OrderStatus.Cancelled },
];

const SHARE_CREATED_TODAY = 0.02;
const HISTORY_DAYS = 365;
const MAX_QUANTITY = 4;
const MIN_UNIT_PRICE_MINOR = 500;
const MAX_UNIT_PRICE_MINOR = 50_000;

function buildItem(faker: Faker): OrderItem {
  return {
    name: faker.commerce.productName(),
    quantity: faker.number.int({ min: 1, max: MAX_QUANTITY }),
    unitPriceMinor: faker.number.int({
      min: MIN_UNIT_PRICE_MINOR,
      max: MAX_UNIT_PRICE_MINOR,
    }),
  };
}

function buildCreatedAt({ faker, now }: OrderFactoryContext): Date {
  if (faker.number.float() < SHARE_CREATED_TODAY) {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const elapsed = now.getTime() - startOfToday.getTime();
    return new Date(
      startOfToday.getTime() + faker.number.int({ max: elapsed }),
    );
  }
  return faker.date.recent({ days: HISTORY_DAYS, refDate: now });
}

export function buildOrder(context: OrderFactoryContext): NewOrder {
  const { faker, creatorIds } = context;
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  const items = Array.from(
    { length: faker.number.int({ min: 1, max: MAX_ITEMS_PER_ORDER }) },
    () => buildItem(faker),
  );

  return {
    customerName: `${firstName} ${lastName}`.toLowerCase(),
    customerEmail: faker.internet.email({ firstName, lastName }).toLowerCase(),
    status: faker.helpers.weightedArrayElement(STATUS_WEIGHTS),
    items,
    totalMinor: items.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceMinor,
      0,
    ),
    createdBy: faker.helpers.arrayElement(creatorIds),
    createdAt: buildCreatedAt(context),
  };
}
