import { DataSourceOptions } from 'typeorm';
import { ALL_ENTITIES } from '../entities';

/**
 * Single source for TypeORM connection options, consumed by `@nestjs/typeorm`
 * (forRootAsync in app.module.ts). The DDL/seed CLI scripts in `database/` talk
 * to Postgres directly via `pg`, so they stay framework-agnostic.
 */
export function buildDataSourceOptions(url?: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: url ?? process.env.DATABASE_URL ?? 'postgres://thuie:thuie@localhost:5432/thuie',
    entities: ALL_ENTITIES,
    // DDL is authored by hand in database/init/*.sql (`npm run db:setup`).
    synchronize: false,
    migrations: [],
    logging: (process.env.DB_LOGGING ?? 'warn') === 'true',
    extra: { max: parseInt(process.env.DB_POOL_MAX ?? '10', 10), idleTimeoutMillis: 30_000 },
  } as DataSourceOptions;
}
