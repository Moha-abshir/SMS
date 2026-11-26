import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import jwt from "jsonwebtoken";
import * as schema from "@school/shared";
import { db } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import app from "../src/app.js";
import { initializeBursarSchema } from "../src/config/bursarMigration.js";
import { BursarService as S } from "../src/modules/bursar/bursar.service.js";
import {
  entryInput,
  periodFilters,
  validateAttachment,
} from "../src/modules/bursar/bursar.rules.js";
import { FinanceService } from "../src/modules/finance/finance.service.js";
import { setUserSessionCache } from "../src/middleware/auth.js";

test("bursar validation rejects invalid dates, money, missing references and disguised files", () => {
  assert.equal(
    periodFilters.safeParse({ academicYear: 2026, from: "2026-02-30" }).success,
    false,
  );
  assert.equal(
    periodFilters.safeParse({
      academicYear: 2026,
      from: "2026-12-01",
      to: "2026-01-01",
    }).success,
    false,
  );
  const entry = {
    requestKey: randomUUID(),
    title: "Stationery",
    amount: "100.01",
    party: "Test shop",
    entryDate: "2026-01-01",
    academicYear: 2026,
    termNumber: 1,
    paymentMethod: "CASH",
  };
  assert.equal(entryInput.safeParse(entry).success, true);
  for (const amount of ["0", "-1", "0.001", "Infinity"])
    assert.equal(entryInput.safeParse({ ...entry, amount }).success, false);
  assert.equal(
    entryInput.safeParse({ ...entry, paymentMethod: "MANUAL_MPESA" }).success,
    false,
  );
  assert.throws(() =>
    validateAttachment({
      buffer: Buffer.from("<svg>"),
      mimetype: "image/png",
      originalname: "fake.png",
    }),
  );
  assert.equal(
    validateAttachment({
      buffer: Buffer.from("%PDF-1.7\ntest"),
      mimetype: "application/pdf",
      originalname: "invoice.pdf",
    })?.type,
    "application/pdf",
  );
});

test(
  "bursar finance integrity, reports, history and role boundaries",
  { skip: !process.env.BURSAR_TEST_DATABASE_URL, timeout: 60000 },
  async (t) => {
    const client = postgres(process.env.BURSAR_TEST_DATABASE_URL!, {
      max: 6,
      connection: { statement_timeout: 10000, lock_timeout: 10000 },
    });
    let queries = 0;
    const local = schema.drizzle(client, {
      logger: {
        logQuery() {
          queries++;
        },
      },
    });
    const methods = [
      "select",
      "insert",
      "update",
      "delete",
      "execute",
      "transaction",
    ] as const;
    const saved = new Map(methods.map((k) => [k, db[k]]));
    for (const k of methods)
      (db as any)[k] = (local[k] as Function).bind(local);
    const suffix = randomUUID().slice(0, 8);
    let server: ReturnType<typeof app.listen> | undefined;
    try {
      await initializeBursarSchema();
      await initializeBursarSchema();
      const [role] = await db
        .insert(schema.roles)
        .values({ name: `BURSAR_TEST_${suffix}` })
        .returning();
      const [user] = await db
        .insert(schema.users)
        .values({
          firstName: "Bursar",
          lastName: suffix,
          email: `${suffix}@example.test`,
          nationalId: suffix,
          phoneNumber: suffix,
          passwordHash: "test",
          roleId: role.id,
        })
        .returning();
      const [{ year }] = await db
        .select({ year: schema.sql<number>`coalesce(max(year),2000)::int+1` })
        .from(schema.academicTerms);
      await db.insert(schema.academicTerms).values({
        year,
        termNumber: 1,
        startDate: "2026-01-01",
        endDate: "2026-04-01",
      });
      const f = { academicYear: year, termNumber: 1 };
      const category = await S.category(`Category ${suffix}`, "Test", user.id);
      const entry = entryInput.parse({
        requestKey: randomUUID(),
        title: "Paper supplies",
        amount: "123.45",
        party: "Test supplier",
        entryDate: "2026-01-15",
        academicYear: year,
        termNumber: 1,
        paymentMethod: "CASH",
        categoryId: category.id,
      });
      await t.test(
        "concurrent expense retries create one voucher and one audited debit",
        async () => {
          const attachment = validateAttachment({
            buffer: Buffer.from("%PDF-1.7\ninvoice"),
            mimetype: "application/pdf",
            originalname: "invoice.pdf",
          });
          const [a, b] = await Promise.all([
            S.record("expense", entry, user.id, attachment),
            S.record("expense", entry, user.id, attachment),
          ]);
          assert.equal(a.id, b.id);
          assert.notEqual(a.alreadyRecorded, b.alreadyRecorded);
          await assert.rejects(
            () =>
              S.record(
                "expense",
                { ...entry, amount: "234.56" },
                user.id,
                attachment,
              ),
            /already used/,
          );
          assert.equal(
            (await S.attachment(String(a.id))).type,
            "application/pdf",
          );
          const listing = await S.entries("expense", {
            ...f,
            limit: 25,
            offset: 0,
            search: "",
          });
          assert.equal(listing.total, 1);
          assert.equal("attachment_data" in listing.items[0], false);
          assert.equal(listing.items[0].hasAttachment, true);
          assert.equal((await S.report(f)).totalExpenses, "123.45");
          const audits = await db
            .select()
            .from(schema.auditLogs)
            .where(schema.eq(schema.auditLogs.entityId, String(a.id)));
          assert.equal(audits.length, 1);
          assert.equal(JSON.stringify(audits).includes("JVBER"), false);
        },
      );
      await t.test("audit failure rolls back the financial entry", async () => {
        await client.unsafe(
          `CREATE OR REPLACE FUNCTION bursar_test_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='EXPENSE_RECORDED' AND NEW.new_values->>'title'='Audit rollback test' THEN RAISE EXCEPTION 'test audit failure'; END IF; RETURN NEW; END $$`,
        );
        await client.unsafe(
          `CREATE TRIGGER bursar_test_audit_failure BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION bursar_test_audit_failure()`,
        );
        const failed = {
          ...entry,
          title: "Audit rollback test",
          requestKey: randomUUID(),
        };
        try {
          await assert.rejects(() =>
            S.record("expense", failed, user.id, null),
          );
          assert.equal(
            (
              await client`SELECT count(*)::int count FROM expenses WHERE request_key=${failed.requestKey}`
            )[0].count,
            0,
          );
        } finally {
          await client.unsafe(
            "DROP TRIGGER bursar_test_audit_failure ON audit_logs",
          );
          await client.unsafe("DROP FUNCTION bursar_test_audit_failure()");
        }
      });
      await t.test(
        "other income and voids reconcile without deleting original transactions",
        async () => {
          await S.record(
            "income",
            { ...entry, requestKey: randomUUID(), amount: "200.10" },
            user.id,
            null,
          );
          let report = await S.report(f);
          assert.equal(report.netPosition, "76.65");
          const expense = await S.entries("expense", {
            ...f,
            limit: 25,
            offset: 0,
            search: "",
          });
          await S.voidEntry(
            "expense",
            String(expense.items[0].id),
            "Duplicate supplier invoice",
            user.id,
          );
          await assert.rejects(
            () =>
              S.voidEntry(
                "expense",
                String(expense.items[0].id),
                "Duplicate supplier invoice",
                user.id,
              ),
            /already voided/,
          );
          report = await S.report(f);
          assert.equal(report.totalExpenses, "0.00");
          assert.equal(report.netPosition, "200.10");
          assert.equal(
            (
              await S.entries("expense", {
                ...f,
                limit: 25,
                offset: 0,
                search: "",
              })
            ).items.length,
            1,
          );
          assert.equal(
            (await S.report({ ...f, from: "2026-02-01" })).totalIncome,
            "0.00",
          );
          assert.ok((await S.dashboard(f)).recentExpenses.length);
        },
      );
      await t.test(
        "learner balances aggregate credits separately in a constant number of queries",
        async () => {
          const [cls] = await db
            .insert(schema.classes)
            .values({
              name: `Finance ${suffix}`,
              numericOrder: 5,
              levelCategory: "UPPER_PRIMARY",
            })
            .returning();
          const [g] = await db
            .insert(schema.guardians)
            .values({
              fullName: "Finance Parent",
              idNumber: suffix,
              phoneNumber: suffix,
            })
            .returning();
          const [learner] = await db
            .insert(schema.students)
            .values({
              firstName: "Finance",
              lastName: "Learner",
              assessmentNumber: suffix,
              gender: "MALE",
              classId: cls.id,
              primaryGuardianId: g.id,
              admissionDate: "2026-01-01",
              status: "TRANSFERRED",
            })
            .returning();
          const [term] = await db
            .select()
            .from(schema.academicTerms)
            .where(schema.eq(schema.academicTerms.year, year));
          await db.insert(schema.studentBills).values({
            studentId: learner.id,
            termId: term.id,
            title: "Fees",
            billedAmount: "100.00",
            netAmount: "100.00",
            paidAmount: "120.00",
            balance: "-20.00",
          });
          const before = queries;
          const result = await S.balances({
            ...f,
            search: "",
            limit: 25,
            offset: 0,
            classId: cls.id,
          });
          assert.equal(queries - before, 2);
          assert.equal(result.total, 1);
          assert.equal(result.items[0].outstanding, "0");
          assert.equal(result.items[0].credit, "20.00");
          assert.equal(
            (
              await S.balances({
                ...f,
                search: "",
                limit: 25,
                offset: 0,
                classId: cls.id,
                outstanding: "true",
              })
            ).total,
            0,
          );
          await db.insert(schema.feePayments).values({
            studentId: learner.id,
            billId: (
              await db
                .select()
                .from(schema.studentBills)
                .where(schema.eq(schema.studentBills.studentId, learner.id))
            )[0].id,
            receiptNumber: `REC-${suffix}`,
            amountPaid: "120.00",
            paymentMethod: "CASH",
            paidBy: "Test parent",
            academicYear: year,
            termNumber: 1,
            recordedById: user.id,
          });
          const statement = await FinanceService.getStudentStatement(
            learner.id,
            f,
          );
          assert.equal(statement.ledger.at(-1)?.balance, -20);
          assert.equal(statement.summary.totalBalance, -20);
          const report = await S.report(f);
          assert.equal(report.collections, "120.00");
          assert.equal(report.outstanding.credits, "20.00");
          const [head] = await db
            .insert(schema.users)
            .values({
              firstName: "Head",
              lastName: suffix,
              email: `head-${suffix}@example.test`,
              nationalId: `head${suffix}`,
              phoneNumber: `head${suffix}`,
              passwordHash: "test",
              roleId: role.id,
            })
            .returning();
          const [payment] = await db
            .select()
            .from(schema.feePayments)
            .where(schema.eq(schema.feePayments.studentId, learner.id));
          const reversal = await FinanceService.requestReversal(
            payment.id,
            "Incorrect learner payment",
            user.id,
          );
          await FinanceService.approveReversal(
            reversal.id,
            head.id,
            "HEAD_TEACHER",
          );
          const corrected = await FinanceService.getStudentStatement(
            learner.id,
            f,
          );
          assert.equal(corrected.ledger.length, 3);
          assert.equal(corrected.ledger.at(-1)?.balance, 100);
          assert.equal(corrected.summary.totalBalance, 100);
        },
      );
      await t.test(
        "archived categories preserve history and reject new spending",
        async () => {
          await assert.rejects(
            () => S.category(`category ${suffix}`, "Duplicate case", user.id),
            /already exists/,
          );
          await S.updateCategory(
            String(category.id),
            { name: `Updated category ${suffix}` },
            user.id,
          );
          await S.updateCategory(
            String(category.id),
            { archived: true },
            user.id,
          );
          const options = await S.options();
          assert.equal(
            options.categories.some((c) => c.id === category.id),
            false,
          );
          assert.equal(
            (
              await S.entries("expense", {
                ...f,
                limit: 25,
                offset: 0,
                search: "",
              })
            ).total,
            1,
          );
          await assert.rejects(
            () =>
              S.record(
                "expense",
                { ...entry, requestKey: randomUUID() },
                user.id,
                null,
              ),
            /unavailable/,
          );
        },
      );
      await t.test(
        "Head Teacher reads expenses but cannot write; other roles cannot use finance endpoints",
        async () => {
          server = app.listen(0);
          await new Promise<void>((resolve) =>
            server!.once("listening", resolve),
          );
          const port = (server.address() as any).port;
          setUserSessionCache(user.id, {
            tokenVersion: user.tokenVersion,
            isActive: true,
          });
          const token = (roleName: string) =>
            jwt.sign(
              {
                id: user.id,
                email: user.email,
                roleId: role.id,
                roleName,
                tokenVersion: user.tokenVersion,
                permissions: ["*"],
              },
              env.JWT_SECRET,
            );
          let res = await fetch(
            `http://127.0.0.1:${port}/api/bursar/expenses?academicYear=${year}`,
            { headers: { Authorization: `Bearer ${token("HEAD_TEACHER")}` } },
          );
          assert.equal(res.status, 200);
          res = await fetch(`http://127.0.0.1:${port}/api/bursar/income`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token("HEAD_TEACHER")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(entry),
          });
          assert.equal(res.status, 403);
          res = await fetch(
            `http://127.0.0.1:${port}/api/bursar/dashboard?academicYear=${year}`,
            { headers: { Authorization: `Bearer ${token("TEACHER")}` } },
          );
          assert.equal(res.status, 403);
          res = await fetch(
            `http://127.0.0.1:${port}/api/bursar/dashboard?academicYear=abc`,
            { headers: { Authorization: `Bearer ${token("BURSAR")}` } },
          );
          assert.equal(res.status, 400);
        },
      );
    } finally {
      if (server)
        await new Promise<void>((resolve) => server!.close(() => resolve()));
      for (const k of methods) (db as any)[k] = saved.get(k);
      await client.end({ timeout: 1 });
    }
  },
);
