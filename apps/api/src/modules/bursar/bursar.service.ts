import { createHash, randomUUID } from "node:crypto";
import { sql, expenses, otherIncome } from "@school/shared";
import { db } from "../../config/db.js";
import {
  cents,
  money,
  financeAudit,
  FinanceValidationError,
  termForFinance,
} from "../finance/financeRules.js";
import type { Entry, Period, validateAttachment } from "./bursar.rules.js";

// All report periods use Nairobi calendar days, including UTC-stored fee payments.
const day = sql`(p.payment_date AT TIME ZONE 'Africa/Nairobi')::date`;
function range(date: any, f: Period) {
  return sql`${f.from ? sql`AND ${date} >= ${f.from}::date` : sql``} ${f.to ? sql`AND ${date} <= ${f.to}::date` : sql``}`;
}
function scope(year: any, term: any, f: Period) {
  return sql`${year} = ${f.academicYear} ${f.termNumber ? sql`AND ${term} = ${f.termNumber}` : sql``}`;
}
export class BursarService {
  static async options() {
    const [classes, categories, terms, settings] = await Promise.all([
      db.execute(
        sql`SELECT id,name,level_category AS "levelCategory" FROM classes WHERE deleted_at IS NULL ORDER BY numeric_order,name`,
      ),
      db.execute(
        sql`SELECT id,name,description FROM expense_categories WHERE deleted_at IS NULL ORDER BY name`,
      ),
      db.execute(
        sql`SELECT id,year,term_number AS "termNumber",start_date AS "startDate",end_date AS "endDate",is_current AS "isCurrent" FROM academic_terms WHERE deleted_at IS NULL ORDER BY year DESC,term_number`,
      ),
      db.execute(
        sql`SELECT school_name AS "schoolName",logo_url AS "logoUrl",address,contact_phone AS "contactPhone",contact_email AS "contactEmail",current_academic_year AS "currentAcademicYear" FROM system_settings LIMIT 1`,
      ),
    ]);
    return { classes, categories, terms, school: settings[0] || null };
  }
  static async balances(
    f: Period & {
      search: string;
      limit: number;
      offset: number;
      classId?: string;
      level?: string;
      minBalance?: string;
      maxBalance?: string;
      outstanding?: string;
    },
  ) {
    const pattern = `%${f.search.replace(/[\\%_]/g, "\\$&")}%`;
    const base = sql`WITH bills AS (
      SELECT b.student_id, sum(b.net_amount) expected, sum(b.paid_amount) paid,
      sum(greatest(b.balance,0)) outstanding, sum(greatest(-b.balance,0)) credit, count(*) bill_count
      FROM student_bills b JOIN academic_terms t ON t.id=b.term_id
      WHERE b.deleted_at IS NULL AND ${scope(sql`t.year`, sql`t.term_number`, f)} GROUP BY b.student_id
    ), learners AS (
      SELECT s.id,concat_ws(' ',s.first_name,nullif(trim(s.middle_name),''),s.last_name) AS "learnerName",
      s.assessment_number AS "assessmentNumber",s.status,c.id AS "classId",c.name AS "className",c.level_category AS "levelCategory",
      g.full_name AS "guardianName",g.phone_number AS "guardianPhone",
      coalesce(b.expected,0)::text AS expected,coalesce(b.paid,0)::text AS paid,
      coalesce(b.outstanding,0)::text AS outstanding,coalesce(b.credit,0)::text AS credit,coalesce(b.bill_count,0)::int AS "billCount"
      FROM students s JOIN classes c ON c.id=s.class_id JOIN guardians g ON g.id=s.primary_guardian_id
      LEFT JOIN bills b ON b.student_id=s.id WHERE (s.deleted_at IS NULL OR b.student_id IS NOT NULL)
      AND (s.status='ACTIVE' OR b.student_id IS NOT NULL)
      ${f.classId ? sql`AND c.id=${f.classId}` : sql``} ${f.level ? sql`AND c.level_category::text=${f.level}` : sql``}
      ${f.search ? sql`AND (concat_ws(' ',s.first_name,s.middle_name,s.last_name) ILIKE ${pattern} OR s.assessment_number ILIKE ${pattern} OR g.full_name ILIKE ${pattern} OR g.phone_number ILIKE ${pattern})` : sql``}
      ${f.outstanding === "true" ? sql`AND b.outstanding > 0` : sql``}
      ${f.minBalance !== undefined ? sql`AND coalesce(b.outstanding,0) >= ${money(cents(f.minBalance, true))}::numeric` : sql``}
      ${f.maxBalance !== undefined ? sql`AND coalesce(b.outstanding,0) <= ${money(cents(f.maxBalance, true))}::numeric` : sql``}
    )`;
    const [items, total] = await Promise.all([
      db.execute(
        sql`${base} SELECT * FROM learners ORDER BY outstanding::numeric DESC,"learnerName",id LIMIT ${f.limit} OFFSET ${f.offset}`,
      ),
      db.execute(sql`${base} SELECT count(*)::int total FROM learners`),
    ]);
    return { items, total: total[0].total, limit: f.limit, offset: f.offset };
  }
  static async exportBalances(f: Parameters<typeof BursarService.balances>[0]) {
    const result = await this.balances({ ...f, limit: 10001, offset: 0 });
    if (Number(result.total) > 10000)
      throw new FinanceValidationError(
        "Narrow the class or level filters to export at most 10,000 learners.",
      );
    return result;
  }
  static async entries(
    kind: "expense" | "income",
    f: Period & { search: string; limit: number; offset: number },
  ) {
    const table = kind === "expense" ? sql`expenses e` : sql`other_income e`;
    const date = kind === "expense" ? sql`e.expense_date` : sql`e.entry_date`;
    const code =
      kind === "expense" ? sql`e.voucher_number` : sql`e.receipt_number`;
    const party = kind === "expense" ? sql`e.vendor_name` : sql`e.party`;
    const pattern = `%${f.search.replace(/[\\%_]/g, "\\$&")}%`;
    // Historical expense rows without term metadata remain visible by calendar date;
    // do not guess an accounting term for them.
    const where = sql`WHERE ${kind === "expense" ? sql`e.deleted_at IS NULL AND (e.academic_year=${f.academicYear} OR (e.academic_year IS NULL AND extract(year FROM e.expense_date)=${f.academicYear})) ${f.termNumber ? sql`AND e.term_number=${f.termNumber}` : sql``}` : scope(sql`e.academic_year`, sql`e.term_number`, f)} ${range(date, f)}
      ${f.search ? sql`AND (e.title ILIKE ${pattern} OR ${party} ILIKE ${pattern} OR ${code} ILIKE ${pattern} OR e.reference ILIKE ${pattern})` : sql``}`;
    const [items, total] = await Promise.all([
      db.execute(sql`SELECT e.id,${code} AS number,e.title,e.amount::text,${party} AS party,${date}::text AS date,
        e.payment_method AS "paymentMethod",e.reference,e.academic_year AS "academicYear",e.term_number AS "termNumber",
        e.voided_at AS "voidedAt",e.void_reason AS "voidReason",concat_ws(' ',u.first_name,u.last_name) AS "recordedBy",
        ${kind === "expense" ? sql`e.description AS notes,c.name AS category,e.category_id AS "categoryId",(e.attachment_data IS NOT NULL) AS "hasAttachment"` : sql`e.notes,NULL::text AS category,false AS "hasAttachment"`}
        FROM ${table} JOIN users u ON u.id=e.recorded_by_id ${kind === "expense" ? sql`JOIN expense_categories c ON c.id=e.category_id` : sql``}
        ${where} ORDER BY ${date} DESC,e.created_at DESC,e.id LIMIT ${f.limit} OFFSET ${f.offset}`),
      db.execute(sql`SELECT count(*)::int total FROM ${table} ${where}`),
    ]);
    return { items, total: total[0].total, limit: f.limit, offset: f.offset };
  }
  static async record(
    kind: "expense" | "income",
    input: Entry,
    actor: string,
    attachment: ReturnType<typeof validateAttachment>,
  ) {
    const fingerprint = createHash("sha256")
      .update(JSON.stringify({ kind, input, attachment, actor }))
      .digest("hex");
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${`bursar:${kind}:${input.requestKey}`}))`,
      );
      const table = kind === "expense" ? expenses : otherIncome;
      const existing = await tx.execute(
        kind === "expense"
          ? sql`SELECT id,voucher_number AS number,request_fingerprint AS fingerprint,voided_at FROM expenses WHERE request_key=${input.requestKey}`
          : sql`SELECT id,receipt_number AS number,request_fingerprint AS fingerprint,voided_at FROM other_income WHERE request_key=${input.requestKey}`,
      );
      if (existing[0]) {
        if (existing[0].fingerprint !== fingerprint || existing[0].voided_at)
          throw new FinanceValidationError(
            "This request was already used. Check its original transaction.",
          );
        return {
          id: existing[0].id,
          number: existing[0].number,
          alreadyRecorded: true,
        };
      }
      await termForFinance(input.academicYear, input.termNumber, tx);
      if (
        input.entryDate >
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Africa/Nairobi",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date())
      )
        throw new FinanceValidationError(
          "A completed transaction cannot be dated in the future.",
        );
      const id = randomUUID();
      const number = `${kind === "expense" ? "VCH" : "INC"}-${input.entryDate.slice(0, 4)}-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
      if (kind === "expense") {
        if (!input.categoryId)
          throw new FinanceValidationError("Choose an expense category.");
        const categories = await tx.execute(
          sql`SELECT id FROM expense_categories WHERE id=${input.categoryId} AND deleted_at IS NULL FOR SHARE`,
        );
        if (!categories.length)
          throw new FinanceValidationError("Expense category is unavailable.");
        await tx.insert(expenses).values({
          id,
          voucherNumber: number,
          categoryId: input.categoryId,
          title: input.title,
          amount: money(cents(input.amount)),
          paymentMethod: input.paymentMethod,
          reference: input.reference,
          vendorName: input.party,
          description: input.notes,
          expenseDate: input.entryDate,
          academicYear: input.academicYear,
          termNumber: input.termNumber,
          recordedById: actor,
          requestKey: input.requestKey,
          requestFingerprint: fingerprint,
          attachmentData: attachment?.data,
          attachmentType: attachment?.type,
          attachmentName: attachment?.name,
        });
      } else
        await tx.insert(otherIncome).values({
          id,
          receiptNumber: number,
          requestKey: input.requestKey,
          requestFingerprint: fingerprint,
          title: input.title,
          amount: money(cents(input.amount)),
          paymentMethod: input.paymentMethod,
          reference: input.reference,
          party: input.party,
          entryDate: input.entryDate,
          academicYear: input.academicYear,
          termNumber: input.termNumber,
          notes: input.notes,
          recordedById: actor,
        });
      await financeAudit(
        tx,
        actor,
        kind === "expense" ? "EXPENSE_RECORDED" : "OTHER_INCOME_RECORDED",
        kind === "expense" ? "expenses" : "other_income",
        id,
        null,
        {
          ...input,
          amount: money(cents(input.amount)),
          number,
          attachment: attachment?.name,
        },
      );
      return { id, number, alreadyRecorded: false };
    });
  }
  static async voidEntry(
    kind: "expense" | "income",
    id: string,
    reason: string,
    actor: string,
  ) {
    return db.transaction(async (tx) => {
      const table = kind === "expense" ? sql`expenses` : sql`other_income`;
      const rows = await tx.execute(
        sql`SELECT id,title,amount,voided_at FROM ${table} WHERE id=${id} FOR UPDATE`,
      );
      if (!rows.length || rows[0].voided_at)
        throw new FinanceValidationError(
          "Transaction is missing or already voided.",
        );
      await tx.execute(
        sql`UPDATE ${table} SET voided_at=now(),voided_by_id=${actor},void_reason=${reason} WHERE id=${id}`,
      );
      await financeAudit(
        tx,
        actor,
        "FINANCIAL_ENTRY_VOIDED",
        kind === "expense" ? "expenses" : "other_income",
        id,
        rows[0],
        { reason },
      );
      return { id };
    });
  }
  static async category(name: string, description: string, actor: string) {
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext('expense-category'))`,
      );
      const duplicates = await tx.execute(
        sql`SELECT id FROM expense_categories WHERE lower(name)=lower(${name})`,
      );
      if (duplicates.length)
        throw new FinanceValidationError(
          "A category with this name already exists.",
        );
      const rows = await tx.execute(
        sql`INSERT INTO expense_categories(name,description) VALUES (${name},${description}) RETURNING id,name,description`,
      );
      await financeAudit(
        tx,
        actor,
        "EXPENSE_CATEGORY_CREATED",
        "expense_categories",
        String(rows[0].id),
        null,
        rows[0],
      );
      return rows[0];
    });
  }
  static async updateCategory(
    id: string,
    input: { name?: string; archived?: boolean },
    actor: string,
  ) {
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext('expense-category'))`,
      );
      const rows = await tx.execute(
        sql`SELECT id,name,deleted_at FROM expense_categories WHERE id=${id} FOR UPDATE`,
      );
      if (!rows[0] || rows[0].deleted_at)
        throw new FinanceValidationError("Category is unavailable.");
      if (input.name) {
        const conflict = await tx.execute(
          sql`SELECT id FROM expense_categories WHERE lower(name)=lower(${input.name}) AND id<>${id}`,
        );
        if (conflict.length)
          throw new FinanceValidationError(
            "A category with this name already exists.",
          );
      }
      await tx.execute(
        sql`UPDATE expense_categories SET name=${input.name || String(rows[0].name)},deleted_at=${input.archived ? sql`now()` : sql`NULL`},updated_at=now() WHERE id=${id}`,
      );
      await financeAudit(
        tx,
        actor,
        input.archived
          ? "EXPENSE_CATEGORY_ARCHIVED"
          : "EXPENSE_CATEGORY_UPDATED",
        "expense_categories",
        id,
        rows[0],
        input,
      );
      return { id };
    });
  }
  static async attachment(id: string) {
    const rows = await db.execute(
      sql`SELECT attachment_data AS data,attachment_type AS type,attachment_name AS name FROM expenses WHERE id=${id} AND deleted_at IS NULL`,
    );
    if (!rows[0]?.data)
      throw new FinanceValidationError("Attachment not found.");
    return rows[0];
  }
  static async report(f: Period) {
    const [daily, expenseTotals, incomeTotals, methods, outstanding] =
      await Promise.all([
        db.execute(sql`SELECT ${day}::text date,sum(p.amount_paid)::text amount,count(*)::int count FROM fee_payments p
        WHERE p.deleted_at IS NULL AND NOT p.is_reversed AND ${scope(sql`p.academic_year`, sql`p.term_number`, f)} ${range(day, f)} GROUP BY ${day} ORDER BY ${day}`),
        db.execute(sql`SELECT c.name category,coalesce(sum(e.amount),0)::text amount,count(*)::int count FROM expenses e JOIN expense_categories c ON c.id=e.category_id
        WHERE e.deleted_at IS NULL AND e.voided_at IS NULL AND (e.academic_year=${f.academicYear} OR (e.academic_year IS NULL AND extract(year FROM e.expense_date)=${f.academicYear}))
        ${f.termNumber ? sql`AND e.term_number=${f.termNumber}` : sql``} ${range(sql`e.expense_date`, f)} GROUP BY c.name ORDER BY c.name`),
        db.execute(
          sql`SELECT coalesce(sum(e.amount),0)::text amount,count(*)::int count FROM other_income e WHERE e.voided_at IS NULL AND ${scope(sql`e.academic_year`, sql`e.term_number`, f)} ${range(sql`e.entry_date`, f)}`,
        ),
        db.execute(
          sql`SELECT p.payment_method method,sum(p.amount_paid)::text amount,count(*)::int count FROM fee_payments p WHERE p.deleted_at IS NULL AND NOT p.is_reversed AND ${scope(sql`p.academic_year`, sql`p.term_number`, f)} ${range(day, f)} GROUP BY p.payment_method`,
        ),
        db.execute(sql`SELECT coalesce(sum(greatest(b.balance,0)),0)::text outstanding,coalesce(sum(greatest(-b.balance,0)),0)::text credits,
        count(DISTINCT b.student_id) FILTER (WHERE b.balance > 0)::int learners
        FROM student_bills b JOIN academic_terms t ON t.id=b.term_id WHERE b.deleted_at IS NULL AND ${scope(sql`t.year`, sql`t.term_number`, f)}`),
      ]);
    const total = (rows: any[]): bigint =>
      rows.reduce<bigint>((sum, row) => {
        const [whole, fraction = ""] = String(row.amount).split(".");
        return sum + BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
      }, 0n);
    const totalMoney = (value: bigint) =>
      `${value < 0n ? "-" : ""}${(value < 0n ? -value : value) / 100n}.${String((value < 0n ? -value : value) % 100n).padStart(2, "0")}`;
    const collections = total(daily),
      expense = total(expenseTotals),
      income = total(incomeTotals);
    return {
      period: f,
      collections: totalMoney(collections),
      otherIncome: totalMoney(income),
      totalIncome: totalMoney(collections + income),
      totalExpenses: totalMoney(expense),
      netPosition: totalMoney(collections + income - expense),
      cashCollections:
        methods.find((r) => r.method === "CASH")?.amount || "0.00",
      daily,
      expenseCategories: expenseTotals,
      methods,
      outstanding: outstanding[0],
      basis:
        "Recorded receipts less voided/reversed transactions; not a bank reconciliation. Outstanding balances reflect current balances for the selected academic period, not an as-of-date balance.",
    };
  }
  static async dashboard(f: Period) {
    const [report, collections, payments, expenses] = await Promise.all([
      this.report(f),
      db.execute(sql`SELECT coalesce(sum(p.amount_paid) FILTER(WHERE ${day}= (now() AT TIME ZONE 'Africa/Nairobi')::date),0)::text today,
        coalesce(sum(p.amount_paid) FILTER(WHERE ${day} >= date_trunc('week',now() AT TIME ZONE 'Africa/Nairobi')::date),0)::text AS "week",
        coalesce(sum(p.amount_paid) FILTER(WHERE ${day} >= date_trunc('month',now() AT TIME ZONE 'Africa/Nairobi')::date),0)::text AS "month",
        count(*) FILTER(WHERE ${day}=(now() AT TIME ZONE 'Africa/Nairobi')::date)::int "paymentsToday"
        FROM fee_payments p WHERE p.deleted_at IS NULL AND NOT p.is_reversed AND ${scope(sql`p.academic_year`, sql`p.term_number`, f)}`),
      db.execute(
        sql`SELECT p.id,p.receipt_number AS number,p.amount_paid::text amount,p.payment_date AS date,concat_ws(' ',s.first_name,s.last_name) AS title FROM fee_payments p JOIN students s ON s.id=p.student_id WHERE p.deleted_at IS NULL AND NOT p.is_reversed AND ${scope(sql`p.academic_year`, sql`p.term_number`, f)} ORDER BY p.payment_date DESC,p.id LIMIT 5`,
      ),
      this.entries("expense", { ...f, search: "", limit: 5, offset: 0 }),
    ]);
    return {
      ...report,
      ...collections[0],
      recentPayments: payments,
      recentExpenses: expenses.items,
    };
  }
  static async audit(
    f: Period & { limit: number; offset: number; search: string },
  ) {
    const pattern = `%${f.search.replace(/[\\%_]/g, "\\$&")}%`;
    const where = sql`WHERE a.entity_name IN ('fee_payments','student_bills','payment_reversals','fee_structures','expenses','other_income','expense_categories')
      AND extract(year FROM a.created_at AT TIME ZONE 'Africa/Nairobi')=${f.academicYear} ${range(sql`(a.created_at AT TIME ZONE 'Africa/Nairobi')::date`, f)}
      ${f.search ? sql`AND (a.action ILIKE ${pattern} OR concat_ws(' ',u.first_name,u.last_name) ILIKE ${pattern} OR a.entity_id::text ILIKE ${pattern})` : sql``}`;
    const [items, total] = await Promise.all([
      db.execute(
        sql`SELECT a.id,a.action,a.entity_name AS entity,a.entity_id AS "entityId",a.created_at AS date,a.old_values AS "oldValues",a.new_values AS "newValues",concat_ws(' ',u.first_name,u.last_name) AS actor FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id ${where} ORDER BY a.created_at DESC,a.id LIMIT ${f.limit} OFFSET ${f.offset}`,
      ),
      db.execute(
        sql`SELECT count(*)::int total FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id ${where}`,
      ),
    ]);
    return { items, total: total[0].total, limit: f.limit, offset: f.offset };
  }
}
