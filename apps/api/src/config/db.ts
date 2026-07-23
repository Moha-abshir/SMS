import postgres from 'postgres';
import * as schema from '@school/shared';
import { drizzle } from '@school/shared';
import { env } from './env';

const queryClient = postgres(env.DATABASE_URL);
export const db = drizzle(queryClient, { schema });
