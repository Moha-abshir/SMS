import postgres from 'postgres';
import * as schema from '@school/shared';
import { drizzle } from '@school/shared';
import { env } from './env.js';

const queryClient = postgres(env.DATABASE_URL, {
  connect_timeout: 30,
  idle_timeout: 20,
  max: 10,
});
export const db = drizzle(queryClient, { schema });
