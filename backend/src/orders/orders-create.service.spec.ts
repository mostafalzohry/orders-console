import { UnprocessableEntityException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { AuthUser } from '../auth/auth-user.type';
import { Role } from '../users/role.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './order-status.enum';
import { hashPayload } from './orders.hash';
import {
  CreateOnceResult,
  OrderRecord,
  OrdersRepository,
} from './orders.repository';
import { OrdersService } from './orders.service';

const USER: AuthUser = {
  id: new Types.ObjectId().toHexString(),
  email: 'agent@test.local',
  role: Role.Agent,
};
const KEY = '11111111-1111-4111-8111-111111111111';

const dto = (overrides: Partial<CreateOrderDto> = {}): CreateOrderDto => ({
  customerName: '  Ada LOVELACE ',
  customerEmail: 'Ada@Example.COM',
  items: [
    { name: ' Widget ', quantity: 2, unitPriceMinor: 1250 },
    { name: 'Gadget', quantity: 1, unitPriceMinor: 999 },
  ],
  ...overrides,
});

const record = (payloadHash: string): OrderRecord => ({
  _id: new Types.ObjectId(),
  customerName: 'ada lovelace',
  customerEmail: 'ada@example.com',
  status: OrderStatus.Pending,
  items: [
    { name: 'Widget', quantity: 2, unitPriceMinor: 1250 },
    { name: 'Gadget', quantity: 1, unitPriceMinor: 999 },
  ],
  totalMinor: 3499,
  createdAt: new Date('2026-10-21T10:00:00Z'),
  payloadHash,
});

describe('OrdersService.create', () => {
  const createOnce = jest.fn<
    Promise<CreateOnceResult>,
    [Parameters<OrdersRepository['createOnce']>[0]]
  >();
  const service = new OrdersService({
    createOnce,
  } as unknown as OrdersRepository);
  const expectedHash = hashPayload({
    customerName: 'ada lovelace',
    customerEmail: 'ada@example.com',
    items: [
      { name: 'Widget', quantity: 2, unitPriceMinor: 1250 },
      { name: 'Gadget', quantity: 1, unitPriceMinor: 999 },
    ],
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('normalises the input, computes the total on the server and sets the status', async () => {
    createOnce.mockResolvedValue({
      order: record(expectedHash),
      created: true,
    });

    await service.create(USER, KEY, dto());

    expect(createOnce).toHaveBeenCalledWith({
      customerName: 'ada lovelace',
      customerEmail: 'ada@example.com',
      status: OrderStatus.Pending,
      items: [
        { name: 'Widget', quantity: 2, unitPriceMinor: 1250 },
        { name: 'Gadget', quantity: 1, unitPriceMinor: 999 },
      ],
      totalMinor: 3499,
      createdBy: USER.id,
      idempotencyKey: KEY,
      payloadHash: expectedHash,
    });
  });

  it('returns the public order and created: true for a new order', async () => {
    const stored = record(expectedHash);
    createOnce.mockResolvedValue({ order: stored, created: true });

    const result = await service.create(USER, KEY, dto());

    expect(result.created).toBe(true);
    expect(result.order).toEqual({
      id: String(stored._id),
      customerName: stored.customerName,
      customerEmail: stored.customerEmail,
      status: OrderStatus.Pending,
      items: stored.items,
      totalMinor: 3499,
      createdAt: stored.createdAt,
    });
    expect(result.order).not.toHaveProperty('payloadHash');
  });

  it('returns the existing order with created: false for a repeat of the same order', async () => {
    createOnce.mockResolvedValue({
      order: record(expectedHash),
      created: false,
    });

    const result = await service.create(USER, KEY, dto());

    expect(result.created).toBe(false);
  });

  it('treats spacing and letter case differences as the same order', async () => {
    createOnce.mockResolvedValue({
      order: record(expectedHash),
      created: false,
    });

    await expect(
      service.create(
        USER,
        KEY,
        dto({
          customerName: 'ada lovelace',
          customerEmail: ' ada@example.com ',
        }),
      ),
    ).resolves.toMatchObject({ created: false });
  });

  it('rejects the same key used for a different order', async () => {
    createOnce.mockResolvedValue({
      order: record('another-hash'),
      created: false,
    });

    await expect(service.create(USER, KEY, dto())).rejects.toThrow(
      UnprocessableEntityException,
    );
  });
});
