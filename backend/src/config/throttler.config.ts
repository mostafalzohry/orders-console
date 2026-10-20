import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

const WINDOW_MS = 60_000;

function emailOf(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'email' in body) {
    return typeof body.email === 'string'
      ? body.email.trim().toLowerCase()
      : '';
  }
  return '';
}

export function loginThrottlers(config: ConfigService): ThrottlerModuleOptions {
  return {
    throttlers: [
      {
        name: 'ip',
        ttl: WINDOW_MS,
        limit: config.getOrThrow<number>('LOGIN_RATE_LIMIT_PER_IP'),
      },
      {
        name: 'account',
        ttl: WINDOW_MS,
        limit: config.getOrThrow<number>('LOGIN_RATE_LIMIT_PER_ACCOUNT'),
        getTracker: (req) => `${String(req.ip)}:${emailOf(req.body)}`,
      },
    ],
  };
}
