import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const findByEmail = jest.fn();
  const service = new UsersService({
    findByEmail,
  } as unknown as UsersRepository);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('looks users up by trimmed, lowercase email', async () => {
    findByEmail.mockResolvedValue(null);

    await service.findByEmail('  Admin@Test.LOCAL ');

    expect(findByEmail).toHaveBeenCalledWith('admin@test.local');
  });
});
