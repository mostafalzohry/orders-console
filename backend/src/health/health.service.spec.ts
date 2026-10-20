import { ServiceUnavailableException } from '@nestjs/common';
import { Connection } from 'mongoose';
import { HealthService } from './health.service';

const connectionWith = (db: unknown) => ({ db }) as unknown as Connection;

describe('HealthService', () => {
  it('returns ok when MongoDB answers the ping', async () => {
    const ping = jest.fn().mockResolvedValue({ ok: 1 });
    const service = new HealthService(
      connectionWith({ admin: () => ({ ping }) }),
    );

    await expect(service.check()).resolves.toEqual({ status: 'ok' });
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it('throws 503 when the ping fails', async () => {
    const ping = jest.fn().mockRejectedValue(new Error('connection refused'));
    const service = new HealthService(
      connectionWith({ admin: () => ({ ping }) }),
    );

    await expect(service.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws 503 when there is no database connection yet', async () => {
    const service = new HealthService(connectionWith(undefined));

    await expect(service.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
