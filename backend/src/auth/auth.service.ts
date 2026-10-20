import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from '../users/password.service';
import { UsersService } from '../users/users.service';
import { AuthUser, toAuthUser } from './auth-user.type';

export interface LoginResult {
  token: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.users.findByEmail(email);
    const passwordMatches =
      user !== null &&
      (await this.passwords.verify(user.passwordHash, password));

    if (!user || !user.active || !passwordMatches) {
      throw new UnauthorizedException('Wrong email or password');
    }

    const token = await this.jwt.signAsync({
      sub: String(user.id),
      ver: user.tokenVersion,
    });
    return { token, user: toAuthUser(user) };
  }

  logout(userId: string): Promise<void> {
    return this.users.incrementTokenVersion(userId);
  }
}
