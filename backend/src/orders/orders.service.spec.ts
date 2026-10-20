import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { OrderStatus } from './order-status.enum';
import { decodeCursor, encodeCursor } from './orders.cursor';
import { OrderRow, OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

const row = (n: number): OrderRow => ({
  _id: new Types.ObjectId(),
  customerName: `customer ${n}`,
  customerEmail: `c${n}@example.com`,
  status: OrderStatus.Paid,
  items: [{ name: 'item', quantity: 1, unitPriceMinor: 100 * n }],
  totalMinor: 100 * n,
  createdAt: new Date(1_760_000_000_000 - n * 1000),
});

const query = (
  overrides: Partial<ListOrdersQueryDto> = {},
): ListOrdersQueryDto => Object.assign(new ListOrdersQueryDto(), overrides);

describe('OrdersService.list', () => {
  const find = jest.fn<
    Promise<OrderRow[]>,
    [Parameters<OrdersRepository['find']>[0]]
  >();
  const service = new OrdersService({ find } as unknown as OrdersRepository);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('asks the repository for one extra row to learn if there is a next page', async () => {
    find.mockResolvedValue([]);

    await service.list(query({ limit: 20 }));

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 21, sort: 'createdAt', direction: -1 }),
    );
  });

  it('returns a next cursor built from the last row of the page when more rows exist', async () => {
    const rows = [row(1), row(2), row(3)];
    find.mockResolvedValue(rows);

    const page = await service.list(query({ limit: 2 }));

    expect(page.data.map((item) => item.id)).toEqual([
      String(rows[0]._id),
      String(rows[1]._id),
    ]);
    expect(decodeCursor(page.nextCursor as string)).toEqual({
      sort: 'createdAt',
      dir: 'desc',
      value: rows[1].createdAt.getTime(),
      id: String(rows[1]._id),
    });
  });

  it('uses the amount in the cursor when sorting by amount', async () => {
    const rows = [row(1), row(2), row(3)];
    find.mockResolvedValue(rows);

    const page = await service.list(
      query({ limit: 2, sort: 'totalMinor', dir: 'asc' }),
    );

    expect(decodeCursor(page.nextCursor as string)).toMatchObject({
      sort: 'totalMinor',
      dir: 'asc',
      value: rows[1].totalMinor,
    });
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'totalMinor', direction: 1 }),
    );
  });

  it('returns no cursor on the last page', async () => {
    find.mockResolvedValue([row(1), row(2)]);

    const page = await service.list(query({ limit: 2 }));

    expect(page.data).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it('returns an empty page without a cursor when nothing matches', async () => {
    find.mockResolvedValue([]);

    await expect(service.list(query())).resolves.toEqual({
      data: [],
      nextCursor: null,
    });
  });

  it('maps a row to the public list item', async () => {
    const source = row(4);
    find.mockResolvedValue([source]);

    const { data } = await service.list(query());

    expect(data[0]).toEqual({
      id: String(source._id),
      customerName: source.customerName,
      customerEmail: source.customerEmail,
      status: source.status,
      items: source.items,
      totalMinor: source.totalMinor,
      createdAt: source.createdAt,
    });
  });

  it('adds the status and cursor conditions only when they were requested', async () => {
    find.mockResolvedValue([]);
    const first = encodeCursor({
      sort: 'createdAt',
      dir: 'desc',
      value: 1_760_000_000_000,
      id: new Types.ObjectId().toHexString(),
    });

    await service.list(query());
    await service.list(query({ status: OrderStatus.Cancelled }));
    await service.list(query({ status: OrderStatus.Cancelled, cursor: first }));

    const conditionCounts = find.mock.calls.map(
      ([params]) => (params.filter.$and as unknown[]).length,
    );
    expect(conditionCounts).toEqual([1, 2, 3]);
  });

  it('rejects a cursor that cannot be read', async () => {
    await expect(service.list(query({ cursor: 'garbage' }))).rejects.toThrow(
      BadRequestException,
    );
    expect(find).not.toHaveBeenCalled();
  });

  it('rejects a cursor made for a different sort', async () => {
    const other = encodeCursor({
      sort: 'totalMinor',
      dir: 'desc',
      value: 5,
      id: new Types.ObjectId().toHexString(),
    });

    await expect(service.list(query({ cursor: other }))).rejects.toThrow(
      BadRequestException,
    );
    expect(find).not.toHaveBeenCalled();
  });
});
