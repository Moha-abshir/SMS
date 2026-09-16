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

    // Ensure leave out sheet specific fields exist
    await db.execute(sql`
      ALTER TABLE "teacher_leave_requests" 
      ADD COLUMN IF NOT EXISTS "departure_time" varchar(50),
      ADD COLUMN IF NOT EXISTS "duration" varchar(100),
      ADD COLUMN IF NOT EXISTS "standing_in_teacher_id" uuid,
      ADD COLUMN IF NOT EXISTS "deputy_reason" text,
      ADD COLUMN IF NOT EXISTS "head_teacher_reason" text,
      ADD COLUMN IF NOT EXISTS "reasons_json" text;
    `);

    console.log('[Database] database schema extensions verified/initialized');
  } catch (err: any) {
    console.warn('[Database] initializeDatabaseTables warning:', err.message);
  }
}
