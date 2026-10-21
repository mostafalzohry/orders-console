import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Request } from 'express';

export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

export const IdempotencyKey = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const header = context.switchToHttp().getRequest<Request>().headers[
      IDEMPOTENCY_KEY_HEADER
    ];

    if (header === undefined) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    if (typeof header !== 'string' || !isUUID(header)) {
      throw new BadRequestException('Idempotency-Key header must be a UUID');
    }
    return header.toLowerCase();
  },
);
