import postgres from 'postgres';
import * as schema from '@school/shared';
import { drizzle } from '@school/shared';
import { env } from './env.js';

// With Neon Serverless PgBouncer pooler, `prepare: false` is strictly required
// because PgBouncer operates in transaction-pooling mode and cannot preserve
// named prepared statements across pooled connections.
const queryClient = postgres(env.DATABASE_URL, {
  prepare: false,      // REQUIRED for Neon PgBouncer pooler to prevent hanging on prepared statements
  ssl: 'require',
  connect_timeout: 30, // 30s connection timeout for Neon cold starts
  idle_timeout: 15,    // Automatically close idle connections after 15s so stale sockets are not reused
  max_lifetime: 60 * 30,
  keep_alive: 15,      // Keep TCP socket alive over intermediate NATs and firewalls
  max: 10,
});
export const db = drizzle(queryClient, { schema });
