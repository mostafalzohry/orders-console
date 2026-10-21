import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FilterQuery } from 'mongoose';
import type { AuthUser } from '../auth/auth-user.type';
import { normalizeText } from '../common/utils/normalize-text';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { OrderStatus } from './order-status.enum';
import { calculateTotalMinor } from './order-total';
import { Order, OrderItem } from './order.schema';
import {
  Cursor,
  decodeCursor,
  encodeCursor,
  keysetFilter,
} from './orders.cursor';
import { hashPayload } from './orders.hash';
import { OrderRow, OrdersRepository } from './orders.repository';
import { buildSearchFilter } from './orders.search';

export interface OrderListItem {
  id: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  items: OrderItem[];
  totalMinor: number;
  createdAt: Date;
}

export interface OrderPage {
  data: OrderListItem[];
  nextCursor: string | null;
}

export interface CreateOrderResult {
  order: OrderListItem;
  created: boolean;
}

@Injectable()
export class OrdersService {
  constructor(private readonly orders: OrdersRepository) {}

  async list(query: ListOrdersQueryDto): Promise<OrderPage> {
    const conditions: FilterQuery<Order>[] = [buildSearchFilter(query.search)];
    if (query.status) {
      conditions.push({ status: query.status });
    }
    if (query.cursor) {
      conditions.push(keysetFilter(this.readCursor(query)));
    }

    const rows = await this.orders.find({
      filter: { $and: conditions },
      sort: query.sort,
      direction: query.dir === 'asc' ? 1 : -1,
      limit: query.limit + 1,
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page[page.length - 1];

    return {
      data: page.map(toListItem),
      nextCursor:
        hasMore && last ? encodeCursor(cursorAfter(last, query)) : null,
    };
  }

  async create(
    user: AuthUser,
    idempotencyKey: string,
    dto: CreateOrderDto,
  ): Promise<CreateOrderResult> {
    const customerName = normalizeText(dto.customerName);
    const customerEmail = normalizeText(dto.customerEmail);
    const items = dto.items.map(({ name, quantity, unitPriceMinor }) => ({
      name: name.trim(),
      quantity,
      unitPriceMinor,
    }));
    const payloadHash = hashPayload({ customerName, customerEmail, items });

    const { order, created } = await this.orders.createOnce({
      customerName,
      customerEmail,
      status: OrderStatus.Pending,
      items,
      totalMinor: calculateTotalMinor(items),
      createdBy: user.id,
      idempotencyKey,
      payloadHash,
    });

    if (!created && order.payloadHash !== payloadHash) {
      throw new UnprocessableEntityException(
        'This Idempotency-Key was already used for a different order',
      );
    }
    return { order: toListItem(order), created };
  }

  private readCursor(query: ListOrdersQueryDto): Cursor {
    const cursor = decodeCursor(query.cursor ?? '');
    if (!cursor) {
      throw new BadRequestException('Invalid cursor');
    }
    if (cursor.sort !== query.sort || cursor.dir !== query.dir) {
      throw new BadRequestException('Cursor does not match the requested sort');
    }
    return cursor;
  }
}

function cursorAfter(row: OrderRow, query: ListOrdersQueryDto): Cursor {
  return {
    sort: query.sort,
    dir: query.dir,
    value:
      query.sort === 'createdAt' ? row.createdAt.getTime() : row.totalMinor,
    id: String(row._id),
  };
}

function toListItem(row: OrderRow): OrderListItem {
  return {
    id: String(row._id),
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    status: row.status,
    items: row.items,
    totalMinor: row.totalMinor,
    createdAt: row.createdAt,
  };
}
