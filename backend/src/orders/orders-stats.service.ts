import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sleep } from '../common/utils/sleep';
import { OrderStatus } from './order-status.enum';
import { OrdersRepository } from './orders.repository';

const CLIENT_CLOSED_REQUEST = 499;

export interface OrderStats {
  totalsByStatus: Record<OrderStatus, number>;
  totalOrders: number;
  revenueTodayMinor: number;
  generatedAt: Date;
}

@Injectable()
export class OrdersStatsService {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly config: ConfigService,
  ) {}

  async stats(signal: AbortSignal): Promise<OrderStats> {
    await this.waitForDeliberateDelay(signal);

    const counts = await this.orders.countByStatus();
    const totalsByStatus = Object.fromEntries(
      Object.values(OrderStatus).map((status) => [status, counts[status] ?? 0]),
    ) as Record<OrderStatus, number>;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return {
      totalsByStatus,
      totalOrders: Object.values(totalsByStatus).reduce((a, b) => a + b, 0),
      revenueTodayMinor: await this.orders.revenueSince(startOfToday),
      generatedAt: new Date(),
    };
  }

  private async waitForDeliberateDelay(signal: AbortSignal): Promise<void> {
    const min = this.config.getOrThrow<number>('STATS_DELAY_MIN_MS');
    const max = this.config.getOrThrow<number>('STATS_DELAY_MAX_MS');
    const delay = Math.round(min + Math.random() * (max - min));

    try {
      await sleep(delay, signal);
    } catch {
      throw new HttpException(
        'Client closed the request',
        CLIENT_CLOSED_REQUEST,
      );
    }
  }
}
