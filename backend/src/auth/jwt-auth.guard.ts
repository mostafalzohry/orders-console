import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { UsersService } from '../users/users.service';
import { AuthUser, toAuthUser } from './auth-user.type';
import { AUTH_COOKIE } from './constants/auth.constants';

export type AuthenticatedRequest = Request & { user: AuthUser };

interface TokenPayload {
  sub?: unknown;
  ver?: unknown;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const token = (request.cookies as Record<string, unknown> | undefined)?.[
      AUTH_COOKIE
    ];
    if (typeof token !== 'string') {
      throw new UnauthorizedException();
    }

    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }
    if (typeof payload.sub !== 'string') {
      throw new UnauthorizedException();
    }

    const user = await this.users.findById(payload.sub);
    if (!user || !user.active || payload.ver !== user.tokenVersion) {
      throw new UnauthorizedException();
    }

    request.user = toAuthUser(user);
    return true;
  }
}
