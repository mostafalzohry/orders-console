import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { AuthUser } from '../auth/auth-user.type';
import { Role } from '../users/role.enum';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

const ADMIN: AuthUser = {
  id: new Types.ObjectId().toHexString(),
  email: 'admin@test.local',
  role: Role.Admin,
};
const ORDER_ID = new Types.ObjectId().toHexString();

describe('OrdersService.delete', () => {
  const deleteById = jest.fn<Promise<boolean>, [string]>();
  const service = new OrdersService({
    deleteById,
  } as unknown as OrdersRepository);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('deletes the order by id', async () => {
    deleteById.mockResolvedValue(true);

    await expect(service.delete(ORDER_ID, ADMIN)).resolves.toBeUndefined();

    expect(deleteById).toHaveBeenCalledWith(ORDER_ID);
  });

  it('answers 404 when no order has that id', async () => {
    deleteById.mockResolvedValue(false);

    await expect(service.delete(ORDER_ID, ADMIN)).rejects.toThrow(
      NotFoundException,
    );
  });
});
