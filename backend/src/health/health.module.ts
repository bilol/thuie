import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/** §10.2 — liveness/readiness. No providers; the controller uses the global DataSource. */
@Module({ controllers: [HealthController] })
export class HealthModule {}
