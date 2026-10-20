import { en, Faker } from '@faker-js/faker';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrderStatus } from '../orders/order-status.enum';
import { Order } from '../orders/order.schema';
import { PasswordService } from '../users/password.service';
import { Role } from '../users/role.enum';
import { User } from '../users/user.schema';
import { UsersService } from '../users/users.service';
import { buildOrder } from './order.factory';

const RANDOM_SEED = 42;
const BATCH_SIZE = 5000;
const NAMESPACE_NOT_FOUND = 26;

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
    @InjectModel(Order.name) private readonly orders: Model<Order>,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly usersService: UsersService,
    private readonly passwords: PasswordService,
    private readonly config: ConfigService,
  ) {}

  async run({ count, now = new Date() }: SeedOptions): Promise<SeedSummary> {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new Error('Refusing to seed: NODE_ENV is production');
    }
    const startedAt = Date.now();

    await Promise.all([this.orders.init(), this.users.init()]);
    await this.dropIfExists(this.orders);
    await this.dropIfExists(this.users);

    const creatorIds = await this.createUsers();
    await this.createOrders(count, creatorIds, now);

    await Promise.all([
      this.orders.createIndexes(),
      this.users.createIndexes(),
    ]);

    return this.summarise(Date.now() - startedAt);
  }

  private async dropIfExists(model: Model<any>): Promise<void> {
    try {
      await model.collection.drop();
    } catch (error) {
      if ((error as { code?: number }).code !== NAMESPACE_NOT_FOUND) {
        throw error;
      }
    }
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
      await this.orders.insertMany(batch, { ordered: false });
      this.logger.log(`Inserted ${inserted + size} / ${count} orders`);
    }
  }

  private async summarise(elapsedMs: number): Promise<SeedSummary> {
    const byStatus = await this.orders.aggregate<{
      _id: OrderStatus;
      n: number;
    }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
    const indexes = await this.orders.collection.indexes();

    return {
      orders: await this.orders.countDocuments(),
      users: await this.users.countDocuments(),
      ordersByStatus: Object.fromEntries(
        byStatus.map((row) => [row._id, row.n]),
      ),
      indexes: indexes.map((index) => String(index.name)),
      elapsedMs,
    };
  }
}
