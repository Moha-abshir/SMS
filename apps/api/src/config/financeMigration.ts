import { db } from './db.js';
import { sql } from '@school/shared';
/** Finance integrity migration 2026-11-22. Additive, rerunnable; never merges old financial records. */
export async function initializeFinanceSchema() {
  await db.execute(
    sql`ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS approved_by_id uuid REFERENCES users(id), ADD COLUMN IF NOT EXISTS approved_at timestamptz`,
  );
  await db.execute(
    sql`ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS request_key uuid, ADD COLUMN IF NOT EXISTS request_fingerprint varchar(64)`,
  );
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS fee_payments_request_key_uq ON fee_payments(request_key)`,
  );
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS payment_request_keys (request_key uuid PRIMARY KEY, payment_id uuid NOT NULL REFERENCES fee_payments(id), actor_id uuid NOT NULL REFERENCES users(id), fingerprint varchar(64) NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  );
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS payment_reversals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), original_payment_id uuid NOT NULL REFERENCES fee_payments(id), reason text NOT NULL, reversed_by_id uuid NOT NULL REFERENCES users(id), approved_by_id uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
  );
  await db.execute(
    sql`ALTER TABLE payment_reversals ADD COLUMN IF NOT EXISTS rejected_by_id uuid REFERENCES users(id), ADD COLUMN IF NOT EXISTS decision_reason text, ADD COLUMN IF NOT EXISTS decided_at timestamptz`,
  );
  const duplicates = await db.execute(
    sql`SELECT 'bills' AS kind FROM student_bills WHERE deleted_at IS NULL GROUP BY student_id,term_id HAVING count(*)>1 UNION ALL SELECT 'level fees' FROM fee_structures WHERE deleted_at IS NULL AND class_id IS NULL GROUP BY term_id,level_category HAVING count(*)>1 UNION ALL SELECT 'class fees' FROM fee_structures WHERE deleted_at IS NULL AND class_id IS NOT NULL GROUP BY term_id,class_id HAVING count(*)>1 LIMIT 1`,
  );
  if (duplicates.length)
    throw Object.assign(
      new Error(
        'Finance migration stopped: duplicate active bills or fee structures require review. No records were merged or deleted.',
      ),
      { code: 'FINANCE_DUPLICATES' },
    );
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS student_bills_active_student_term_uq ON student_bills(student_id,term_id) WHERE deleted_at IS NULL`,
  );
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS fee_structures_active_level_uq ON fee_structures(term_id,level_category) WHERE deleted_at IS NULL AND class_id IS NULL`,
  );
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS fee_structures_active_class_uq ON fee_structures(term_id,class_id) WHERE deleted_at IS NULL AND class_id IS NOT NULL`,
  );
}
