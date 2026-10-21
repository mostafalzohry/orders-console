import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Response } from 'express';

export const RequestAbortSignal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AbortSignal => {
    const res = context.switchToHttp().getResponse<Response>();
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) {
        controller.abort();
      }
    });
    return controller.signal;
  },
);
