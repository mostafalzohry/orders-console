import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async check(): Promise<{ status: 'ok' }> {
    const db = this.connection.db;
    if (!db) {
      throw new ServiceUnavailableException('Database not connected');
    }

    try {
      await db.admin().ping();
    } catch {
      throw new ServiceUnavailableException('Database unreachable');
    }

    return { status: 'ok' };
  }
}
