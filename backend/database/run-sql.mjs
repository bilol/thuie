#!/usr/bin/env node
// Database init runner — executes the numbered SQL scripts in database/init
// against DATABASE_URL using the `pg` driver (no psql/Docker required).
//
//   node database/run-sql.mjs init     # run every init script (idempotent-safe? no — fresh schema expected)
//   node database/run-sql.mjs reset    # DROP SCHEMA public CASCADE, then run all init scripts
import { readFileSync, existsSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));

// Load .env (tiny parser — no dotenv dependency in this script)
let DATABASE_URL = process.env.DATABASE_URL;
const envPath = join(here, '..', '.env');
if (!DATABASE_URL && existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)$/);
    if (m) { DATABASE_URL = m[1].trim(); break; }
  }
}
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set (copy .env.example to .env)');
  process.exit(1);
}

const mode = process.argv[2] || 'init';
if (!['init', 'reset'].includes(mode)) {
  console.error(`unknown mode "${mode}" (expected init|reset)`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
console.log(`connected: ${DATABASE_URL.replace(/:[^:@/]*@/, ':****@')}`);

try {
  if (mode === 'reset') {
    console.log('dropping schema public …');
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO CURRENT_USER;');
  }
  const files = readdirSync(join(here, 'init')).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    console.log(`running ${f} …`);
    await client.query(readFileSync(join(here, 'init', f), 'utf8'));
  }
  console.log('✔ database scripts complete');
} catch (err) {
  console.error('✖ failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
