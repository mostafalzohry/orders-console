import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { dropIfExists } from '../common/database/drop-if-exists';
import { NewOrder } from './new-order.type';
import { Order } from './order.schema';
import { SortField } from './constants/orders.constants';

export type OrderRow = Pick<
  Order,
  | 'customerName'
  | 'customerEmail'
  | 'status'
  | 'items'
  | 'totalMinor'
  | 'createdAt'
> & { _id: Types.ObjectId };

export interface FindOrdersParams {
  filter: FilterQuery<Order>;
  sort: SortField;
  direction: 1 | -1;
  limit: number;
}

const LIST_FIELDS = {
  customerName: 1,
  customerEmail: 1,
  status: 1,
  items: 1,
  totalMinor: 1,
  createdAt: 1,
};

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
