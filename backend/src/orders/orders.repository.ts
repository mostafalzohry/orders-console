import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { dropIfExists } from '../common/database/drop-if-exists';
import { SortField } from './constants/orders.constants';
import { NewOrder, OrderToCreate } from './new-order.type';
import { Order, OrderDocument } from './order.schema';

export type OrderRow = Pick<
  Order,
  | 'customerName'
  | 'customerEmail'
  | 'status'
  | 'items'
  | 'totalMinor'
  | 'createdAt'
> & { _id: Types.ObjectId };

export type OrderRecord = OrderRow & { payloadHash?: string };

export interface CreateOnceResult {
  order: OrderRecord;
  created: boolean;
}

export interface FindOrdersParams {
  filter: FilterQuery<Order>;
  sort: SortField;
  direction: 1 | -1;
  limit: number;
}

const DUPLICATE_KEY = 11000;

const LIST_FIELDS = {
  customerName: 1,
  customerEmail: 1,
  status: 1,
  items: 1,
  totalMinor: 1,
  createdAt: 1,
};

const RECORD_FIELDS = { ...LIST_FIELDS, payloadHash: 1 };

function isIdempotencyConflict(error: unknown): boolean {
  const { code, keyPattern } = error as {
    code?: number;
    keyPattern?: Record<string, unknown>;
  };
  return code === DUPLICATE_KEY && keyPattern?.idempotencyKey !== undefined;
}

function toRecord(doc: OrderDocument): OrderRecord {
  return {
    _id: doc._id,
    customerName: doc.customerName,
    customerEmail: doc.customerEmail,
    status: doc.status,
    items: doc.items,
    totalMinor: doc.totalMinor,
    createdAt: doc.createdAt,
    payloadHash: doc.payloadHash,
  };
}

@Injectable()
export class OrdersRepository {
  constructor(@InjectModel(Order.name) private readonly orders: Model<Order>) {}

  find({
    filter,
    sort,
    direction,
    limit,
  }: FindOrdersParams): Promise<OrderRow[]> {
    return this.orders
      .find(filter)
      .sort({ [sort]: direction, _id: direction })
      .limit(limit)
      .select(LIST_FIELDS)
      .lean<OrderRow[]>()
      .exec();
  }

  async createOnce(order: OrderToCreate): Promise<CreateOnceResult> {
    const createdBy = new Types.ObjectId(order.createdBy);

    try {
      const doc = await this.orders.create({ ...order, createdBy });
      return { order: toRecord(doc), created: true };
    } catch (error) {
      if (!isIdempotencyConflict(error)) {
        throw error;
      }
      const existing = await this.orders
        .findOne({ createdBy, idempotencyKey: order.idempotencyKey })
        .select(RECORD_FIELDS)
        .lean<OrderRecord>()
        .exec();
      if (!existing) {
        throw error;
      }
      return { order: existing, created: false };
    }
  }

  async insertMany(orders: NewOrder[]): Promise<void> {
    await this.orders.insertMany(orders, { ordered: false });
  }

  count(): Promise<number> {
    return this.orders.countDocuments().exec();
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await this.orders.aggregate<{ _id: string; n: number }>([
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((row) => [row._id, row.n]));
  }

  async indexNames(): Promise<string[]> {
    const indexes = await this.orders.collection.indexes();
    return indexes.map((index) => String(index.name));
  }

  async reset(): Promise<void> {
    await this.orders.init();
    await dropIfExists(this.orders.collection);
  }

  async ensureIndexes(): Promise<void> {
    await this.orders.createIndexes();
  }
}
