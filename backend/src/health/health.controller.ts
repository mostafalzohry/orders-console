import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  check(): Promise<{ status: 'ok' }> {
    return this.health.check();
  }
}
