import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { Order } from '../orders/order.schema';
import { PasswordService } from '../users/password.service';
import { User } from '../users/user.schema';
import { UsersService } from '../users/users.service';
import { SeedService } from './seed.service';

describe('SeedService', () => {
  it('refuses to run in production before touching any data', async () => {
    const orders = { init: jest.fn(), collection: { drop: jest.fn() } };
    const service = new SeedService(
      orders as unknown as Model<Order>,
      {} as unknown as Model<User>,
      {} as unknown as UsersService,
      {} as unknown as PasswordService,
      { get: () => 'production' } as unknown as ConfigService,
    );

    await expect(service.run({ count: 1 })).rejects.toThrow(/production/);
    expect(orders.init).not.toHaveBeenCalled();
    expect(orders.collection.drop).not.toHaveBeenCalled();
  });
});
