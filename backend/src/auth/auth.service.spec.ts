import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from '../users/password.service';
import { Role } from '../users/role.enum';
import { UserDocument } from '../users/user.schema';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

const makeUser = (overrides: Partial<UserDocument> = {}): UserDocument =>
  ({
    id: 'user-1',
    email: 'agent@test.local',
    passwordHash: 'stored-hash',
    role: Role.Agent,
    active: true,
    tokenVersion: 2,
    ...overrides,
  }) as UserDocument;

describe('AuthService', () => {
  const findByEmail = jest.fn<Promise<UserDocument | null>, [string]>();
  const verify = jest.fn<Promise<boolean>, [string, string]>();
  const incrementTokenVersion = jest.fn<Promise<void>, [string]>();
  const signAsync = jest.fn<Promise<string>, [object]>();
  let service: AuthService;

  beforeEach(() => {
    jest.resetAllMocks();
    signAsync.mockResolvedValue('signed.jwt.token');
    service = new AuthService(
      { findByEmail, incrementTokenVersion } as unknown as UsersService,
      { verify } as unknown as PasswordService,
      { signAsync } as unknown as JwtService,
    );
  });

  it('returns a token and the public user when the password is right', async () => {
    findByEmail.mockResolvedValue(makeUser());
    verify.mockResolvedValue(true);

    const result = await service.login('agent@test.local', 'Agent123!');

    expect(verify).toHaveBeenCalledWith('stored-hash', 'Agent123!');
    expect(result).toEqual({
      token: 'signed.jwt.token',
      user: { id: 'user-1', email: 'agent@test.local', role: Role.Agent },
    });
  });

  it('puts only the subject and token version in the token, never the role', async () => {
    findByEmail.mockResolvedValue(makeUser({ role: Role.Admin }));
    verify.mockResolvedValue(true);

    await service.login('agent@test.local', 'Agent123!');

    expect(signAsync).toHaveBeenCalledWith({ sub: 'user-1', ver: 2 });
  });

  it('rejects a wrong password', async () => {
    findByEmail.mockResolvedValue(makeUser());
    verify.mockResolvedValue(false);

    await expect(service.login('agent@test.local', 'nope')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('rejects an inactive user even with the right password', async () => {
    findByEmail.mockResolvedValue(makeUser({ active: false }));
    verify.mockResolvedValue(true);

    await expect(
      service.login('agent@test.local', 'Agent123!'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an unknown email without checking any password', async () => {
    findByEmail.mockResolvedValue(null);

    await expect(service.login('ghost@test.local', 'whatever')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(verify).not.toHaveBeenCalled();
  });

  it('logout bumps the token version so every issued token stops working', async () => {
    incrementTokenVersion.mockResolvedValue(undefined);

    await service.logout('user-1');

    expect(incrementTokenVersion).toHaveBeenCalledWith('user-1');
  });
});
