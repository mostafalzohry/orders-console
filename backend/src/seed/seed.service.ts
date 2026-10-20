import { en, Faker } from '@faker-js/faker';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { OrdersRepository } from '../orders/orders.repository';
import { PasswordService } from '../users/password.service';
import { Role } from '../users/role.enum';
import { UsersRepository } from '../users/users.repository';
import { UsersService } from '../users/users.service';
import { buildOrder } from './order.factory';

const RANDOM_SEED = 42;
const BATCH_SIZE = 5000;

export const SEED_USERS = [
  { email: 'admin@test.local', password: 'Admin123!', role: Role.Admin },
  { email: 'agent@test.local', password: 'Agent123!', role: Role.Agent },
];

export interface SeedOptions {
  count: number;
  now?: Date;
}

export interface SeedSummary {
  orders: number;
  users: number;
  ordersByStatus: Record<string, number>;
  indexes: string[];
  elapsedMs: number;
}

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly orders: OrdersRepository,
    private readonly users: UsersRepository,
    private readonly usersService: UsersService,
    private readonly passwords: PasswordService,
    private readonly config: ConfigService,
  ) {}

  async run({ count, now = new Date() }: SeedOptions): Promise<SeedSummary> {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new Error('Refusing to seed: NODE_ENV is production');
    }
    const startedAt = Date.now();

    await Promise.all([this.orders.reset(), this.users.reset()]);

    const creatorIds = await this.createUsers();
    await this.createOrders(count, creatorIds, now);

    await Promise.all([
      this.orders.ensureIndexes(),
      this.users.ensureIndexes(),
    ]);

    return {
      orders: await this.orders.count(),
      users: await this.users.count(),
      ordersByStatus: await this.orders.countByStatus(),
      indexes: await this.orders.indexNames(),
      elapsedMs: Date.now() - startedAt,
    };
  }

  private async createUsers(): Promise<Types.ObjectId[]> {
    const ids: Types.ObjectId[] = [];
    for (const { email, password, role } of SEED_USERS) {
      const user = await this.usersService.create({
        email,
        passwordHash: await this.passwords.hash(password),
        role,
      });
      ids.push(user._id);
    }
    return ids;
  }

  private async createOrders(
    count: number,
    creatorIds: Types.ObjectId[],
    now: Date,
  ): Promise<void> {
    const faker = new Faker({ locale: [en] });
    faker.seed(RANDOM_SEED);

    for (let inserted = 0; inserted < count; inserted += BATCH_SIZE) {
      const size = Math.min(BATCH_SIZE, count - inserted);
      const batch = Array.from({ length: size }, () =>
        buildOrder({ faker, creatorIds, now }),
      );
      await this.orders.insertMany(batch);
      this.logger.log(`Inserted ${inserted + size} / ${count} orders`);
    }
  }
}
