import { ConfigService } from '@nestjs/config';
import { OrdersRepository } from '../orders/orders.repository';
import { PasswordService } from '../users/password.service';
import { UsersRepository } from '../users/users.repository';
import { UsersService } from '../users/users.service';
import { SeedService } from './seed.service';

describe('SeedService', () => {
  it('refuses to run in production before touching any data', async () => {
    const orders = { reset: jest.fn() };
    const users = { reset: jest.fn() };
    const service = new SeedService(
      orders as unknown as OrdersRepository,
      users as unknown as UsersRepository,
      {} as unknown as UsersService,
      {} as unknown as PasswordService,
      { get: () => 'production' } as unknown as ConfigService,
    );

    await expect(service.run({ count: 1 })).rejects.toThrow(/production/);
    expect(orders.reset).not.toHaveBeenCalled();
    expect(users.reset).not.toHaveBeenCalled();
  });
});
