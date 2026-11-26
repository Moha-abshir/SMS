import { db } from "./db.js";
import { sql } from "@school/shared";
/** Additive bursar workspace migration. No existing transaction is rewritten. */
export async function initializeBursarSchema() {
  await db.transaction(async (tx) => {
    await tx.execute(sql`ALTER TABLE expenses
      ADD COLUMN IF NOT EXISTS payment_method payment_method,
      ADD COLUMN IF NOT EXISTS reference varchar(100),
      ADD COLUMN IF NOT EXISTS academic_year integer,
      ADD COLUMN IF NOT EXISTS term_number integer,
      ADD COLUMN IF NOT EXISTS request_key uuid,
      ADD COLUMN IF NOT EXISTS request_fingerprint varchar(64),
      ADD COLUMN IF NOT EXISTS attachment_data text,
      ADD COLUMN IF NOT EXISTS attachment_type varchar(50),
      ADD COLUMN IF NOT EXISTS attachment_name varchar(150),
      ADD COLUMN IF NOT EXISTS voided_at timestamptz,
      ADD COLUMN IF NOT EXISTS voided_by_id uuid REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS void_reason text`);
    await tx.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS expenses_request_key_uq ON expenses(request_key)`,
    );
    await tx.execute(sql`CREATE TABLE IF NOT EXISTS other_income (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), receipt_number varchar(50) NOT NULL UNIQUE,
      request_key uuid NOT NULL UNIQUE, request_fingerprint varchar(64) NOT NULL,
      title varchar(200) NOT NULL, amount numeric(10,2) NOT NULL CHECK(amount > 0),
      payment_method payment_method NOT NULL, reference varchar(100), party varchar(100) NOT NULL,
      entry_date date NOT NULL, academic_year integer NOT NULL, term_number integer NOT NULL CHECK(term_number BETWEEN 1 AND 3),
      notes text, recorded_by_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
      voided_at timestamptz, voided_by_id uuid REFERENCES users(id), void_reason text)`);
    await tx.execute(
      sql`CREATE INDEX IF NOT EXISTS other_income_period_idx ON other_income(academic_year,term_number,entry_date)`,
    );
    await tx.execute(
      sql`CREATE INDEX IF NOT EXISTS expenses_period_idx ON expenses(academic_year,term_number,expense_date)`,
    );
    for (const name of [
      "Stationery",
      "Food",
      "Electricity",
      "Water",
      "Repairs",
      "Salaries",
      "Transport",
      "Teaching Materials",
      "Maintenance",
    ]) {
      await tx.execute(
        sql`INSERT INTO expense_categories(name) VALUES (${name}) ON CONFLICT(name) DO NOTHING`,
      );
    }
  });
}
