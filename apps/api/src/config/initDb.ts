import { db } from './db.js';
import { sql } from '@school/shared';

export async function initializeDatabaseTables() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "payment_reversals" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "original_payment_id" uuid NOT NULL,
        "reason" text NOT NULL,
        "reversed_by_id" uuid NOT NULL,
        "approved_by_id" uuid,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "payment_reversals_payment_id_idx" 
      ON "payment_reversals" ("original_payment_id");
    `);

    console.log('[Database] payment_reversals table verified/initialized');
  } catch (err: any) {
    console.warn('[Database] initializeDatabaseTables warning:', err.message);
  }
}
