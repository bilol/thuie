import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../common/decorators';

/**
 * BACKEND.md §10.2 — liveness and readiness for any host/orchestrator.
 * Both are `@Public()` (the global guard otherwise requires a token) and must
 * never leak dependency version or error detail (§10.2). They sit under the
 * `/api/v1` prefix like every other route.
 */
@Controller()
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Liveness: process up, event loop responsive. No dependency checks. */
  @Public()
  @Get('healthz')
  liveness() {
    return { status: 'ok' };
  }

  /**
   * Readiness: pings Postgres and returns 503 until it answers. Redis/object
   * storage checks slot in here once those seams are real (§10.2). The body
   * carries only a stable code — never the driver error (§10.2).
   */
  @Public()
  @Get('ready')
  async readiness() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({ code: 'not_ready', message: 'Service not ready' });
    }
    return { status: 'ready' };
  }
}
