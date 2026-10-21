import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sleep } from '../common/utils/sleep';
import { OrderStatus } from './order-status.enum';
import { OrdersStatsService } from './orders-stats.service';
import { OrdersRepository } from './orders.repository';

jest.mock('../common/utils/sleep');

describe('OrdersStatsService', () => {
  const countByStatus = jest.fn<Promise<Record<string, number>>, []>();
  const revenueSince = jest.fn<Promise<number>, [Date]>();
  const sleepMock = jest.mocked(sleep);
  const config = {
    getOrThrow: (key: string) => (key === 'STATS_DELAY_MIN_MS' ? 3000 : 6000),
  } as unknown as ConfigService;
  const service = new OrdersStatsService(
    { countByStatus, revenueSince } as unknown as OrdersRepository,
    config,
  );
  const signal = new AbortController().signal;

  beforeEach(() => {
    jest.resetAllMocks();
    sleepMock.mockResolvedValue(undefined);
    countByStatus.mockResolvedValue({});
    revenueSince.mockResolvedValue(0);
  });

  it('waits a random time between the configured minimum and maximum', async () => {
    const random = jest.spyOn(Math, 'random');

    random.mockReturnValue(0);
    await service.stats(signal);
    random.mockReturnValue(0.5);
    await service.stats(signal);
    random.mockReturnValue(0.999999);
    await service.stats(signal);

    expect(sleepMock.mock.calls.map(([ms]) => ms)).toEqual([3000, 4500, 6000]);
    expect(sleepMock).toHaveBeenCalledWith(expect.any(Number), signal);
    random.mockRestore();
  });

  it('lists every status, with 0 for the ones that have no orders', async () => {
    countByStatus.mockResolvedValue({ paid: 7, cancelled: 2 });

    const stats = await service.stats(signal);

    expect(stats.totalsByStatus).toEqual({
      [OrderStatus.Pending]: 0,
      [OrderStatus.Paid]: 7,
      [OrderStatus.Shipped]: 0,
      [OrderStatus.Delivered]: 0,
      [OrderStatus.Cancelled]: 2,
    });
    expect(stats.totalOrders).toBe(9);
  });

  it('asks for the revenue since the start of today', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-22T15:45:30'));
    revenueSince.mockResolvedValue(123_456);

    const stats = await service.stats(signal);
    jest.useRealTimers();

    expect(revenueSince).toHaveBeenCalledWith(new Date('2026-10-22T00:00:00'));
    expect(stats.revenueTodayMinor).toBe(123_456);
  });

  it('answers 499 and runs no query when the client leaves during the wait', async () => {
    sleepMock.mockRejectedValue(new Error('Aborted'));

    await expect(service.stats(signal)).rejects.toMatchObject({
      constructor: HttpException,
      status: 499,
    });
    expect(countByStatus).not.toHaveBeenCalled();
    expect(revenueSince).not.toHaveBeenCalled();
  });
});
