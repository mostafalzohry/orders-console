import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../users/role.enum';
import { RolesGuard } from './roles.guard';

const contextWith = (user: { role: Role } | undefined) =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  const getAllAndOverride = jest.fn<Role[] | undefined, unknown[]>();
  const guard = new RolesGuard({ getAllAndOverride } as unknown as Reflector);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('allows any request when the route requires no role', () => {
    getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(contextWith(undefined))).toBe(true);
  });

  it('allows a user who has a required role', () => {
    getAllAndOverride.mockReturnValue([Role.Admin]);

    expect(guard.canActivate(contextWith({ role: Role.Admin }))).toBe(true);
  });

  it('forbids a user who lacks the required role', () => {
    getAllAndOverride.mockReturnValue([Role.Admin]);

    expect(() => guard.canActivate(contextWith({ role: Role.Agent }))).toThrow(
      ForbiddenException,
    );
  });

  it('answers 401, not a crash, when no user was authenticated first', () => {
    getAllAndOverride.mockReturnValue([Role.Admin]);

    expect(() => guard.canActivate(contextWith(undefined))).toThrow(
      UnauthorizedException,
    );
  });
});
