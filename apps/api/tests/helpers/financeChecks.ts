import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as s from '@school/shared';
import { db } from '../../src/config/db.js';
import { FinanceService } from '../../src/modules/finance/finance.service.js';
import { FeeStructuresService } from '../../src/modules/fee-structures/feeStructures.service.js';
export async function financeChecks(f: {
  teacherId: string;
  headId: string;
  learnerId: string;
  classId: string;
  term: typeof s.academicTerms.$inferSelect;
  suffix: string;
  billId: string;
  fees: Array<typeof s.feeStructures.$inferSelect>;
}) {
  const { teacherId, headId, learnerId, classId, term, suffix, billId, fees } =
    f;
  const base = {
    studentId: learnerId,
    academicYear: term.year,
    termNumber: term.termNumber,
    paymentMethod: 'CASH' as const,
    paidBy: 'Finance test',
    amountPaid: '0.10',
    requestKey: randomUUID(),
  };
  const [beforeBill] = await db
    .select()
    .from(s.studentBills)
    .where(s.eq(s.studentBills.id, billId));
  const repeated = await Promise.all(
    Array.from({ length: 12 }, () =>
      FinanceService.recordPayment(base, teacherId),
    ),
  );
  assert.equal(new Set(repeated.map((p) => p.id)).size, 1);
  await assert.rejects(
    () =>
      FinanceService.recordPayment({ ...base, amountPaid: '0.20' }, teacherId),
    /request key/,
  );
  await assert.rejects(
    () => FinanceService.recordPayment(base, headId),
    /request key/,
  );
  const independent = await FinanceService.recordPayment(
    { ...base, requestKey: randomUUID() },
    teacherId,
  );
  assert.notEqual(independent.id, repeated[0].id);
  const [afterBill] = await db
    .select()
    .from(s.studentBills)
    .where(s.eq(s.studentBills.id, billId));
  assert.equal(
    (Number(afterBill.paidAmount) - Number(beforeBill.paidAmount)).toFixed(2),
    '0.20',
  );
  await assert.rejects(
    () =>
      FinanceService.recordPayment(
        { ...base, requestKey: randomUUID(), termNumber: 9 },
        teacherId,
      ),
    /explicit/,
  );
  await assert.rejects(
    () =>
      FinanceService.recordPayment(
        { ...base, requestKey: randomUUID(), academicYear: 2190 },
        teacherId,
      ),
    /not been configured/,
  );
  await assert.rejects(
    () =>
      FinanceService.recordPayment(
        { ...base, requestKey: randomUUID(), paymentMethod: 'MANUAL_MPESA' },
        teacherId,
      ),
    /reference is required/,
  );
  await assert.rejects(
    () =>
      FinanceService.recordPayment(
        { ...base, requestKey: randomUUID(), paymentMethod: 'MPESA_STK_PUSH' },
        teacherId,
      ),
    /provider confirmation/,
  );
  // Provider-reference retries bind their new request key to the existing receipt too.
  const reference = {
    ...base,
    amountPaid: '1.00',
    paymentMethod: 'MANUAL_MPESA' as const,
    mpesaRefCode: `KEY${suffix}`,
    requestKey: randomUUID(),
  };
  const first = await FinanceService.recordPayment(reference, teacherId);
  const alias = { ...reference, requestKey: randomUUID() };
  assert.equal(
    (await FinanceService.recordPayment(alias, teacherId)).id,
    first.id,
  );
  await assert.rejects(
    () =>
      FinanceService.recordPayment(
        { ...alias, amountPaid: '2.00', mpesaRefCode: `DIFF${suffix}` },
        teacherId,
      ),
    /request key/,
  );
  // Request, decision and balance updates are atomic; rejected requests are retained.
  const request = await FinanceService.requestReversal(
    first.id,
    'Wrong allocation',
    teacherId,
  );
  await assert.rejects(
    () => FinanceService.approveReversal(request.id, headId, 'BURSAR'),
    /Only the Head/,
  );
  await assert.rejects(
    () => FinanceService.approveReversal(request.id, teacherId, 'HEAD_TEACHER'),
    /own reversal/,
  );
  await FinanceService.rejectReversal(
    request.id,
    headId,
    'Verified against payment record',
    'HEAD_TEACHER',
  );
  const [rejected] = await db
    .select()
    .from(s.paymentReversals)
    .where(s.eq(s.paymentReversals.id, request.id));
  assert.equal(rejected.rejectedById, headId);
  assert.equal(rejected.decisionReason, 'Verified against payment record');
  assert(rejected.decidedAt);
  assert(
    !(
      await FinanceService.getPendingReversals(term.year, term.termNumber)
    ).some((r) => r.reversalId === request.id),
  );
  assert(
    (
      await FinanceService.reversalHistory(term.year, term.termNumber)
    ).items.some((r) => r.id === request.id),
  );
  const second = await FinanceService.requestReversal(
    first.id,
    'Second reviewed request',
    teacherId,
  );
  const race = await Promise.allSettled([
    FinanceService.approveReversal(second.id, headId, 'HEAD_TEACHER'),
    FinanceService.rejectReversal(
      second.id,
      headId,
      'Not approved',
      'HEAD_TEACHER',
    ),
  ]);
  assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
  const [decided] = await db
    .select()
    .from(s.paymentReversals)
    .where(s.eq(s.paymentReversals.id, second.id));
  assert(Boolean(decided.approvedById) !== Boolean(decided.rejectedById));
  const [consistent] = await db
    .select()
    .from(s.studentBills)
    .where(s.eq(s.studentBills.id, billId));
  await db
    .update(s.studentBills)
    .set({ paidAmount: (Number(consistent.paidAmount) + 0.01).toFixed(2) })
    .where(s.eq(s.studentBills.id, billId));
  await assert.rejects(
    () =>
      FinanceService.recordPayment(
        { ...base, requestKey: randomUUID() },
        teacherId,
      ),
    /reconcile this bill/,
  );
  await db
    .update(s.studentBills)
    .set({ paidAmount: consistent.paidAmount })
    .where(s.eq(s.studentBills.id, billId));
  // Failure to persist the audit event must roll back payment, balance and retry identity.
  const originalTransaction = db.transaction;
  const failedKey = randomUUID();
  (db as any).transaction = (work: any) =>
    originalTransaction.call(db, async (tx: any) => {
      const insert = tx.insert.bind(tx);
      tx.insert = (table: any) => {
        if (table === s.auditLogs) throw new Error('Synthetic audit failure');
        return insert(table);
      };
      return work(tx);
    });
  try {
    await assert.rejects(
      () =>
        FinanceService.recordPayment(
          { ...base, requestKey: failedKey },
          teacherId,
        ),
      /Synthetic audit/,
    );
  } finally {
    db.transaction = originalTransaction;
  }
  assert.equal(
    (
      await db
        .select()
        .from(s.paymentRequestKeys)
        .where(s.eq(s.paymentRequestKeys.requestKey, failedKey))
    ).length,
    0,
  );
  // Fee reads never create a year or default rates. Batches validate all rows before writing.
  const matrix = await FeeStructuresService.getFeeMatrix(2199);
  assert.equal(matrix.terms.length, 0);
  assert.equal(
    (
      await db
        .select()
        .from(s.academicTerms)
        .where(s.eq(s.academicTerms.year, 2199))
    ).length,
    0,
  );
  const fee = fees.find((row) => row.levelCategory === 'JUNIOR')!;
  await assert.rejects(
    () =>
      FeeStructuresService.batchUpdate(
        [
          { id: fee.id, totalAmount: '7500.00' },
          { id: randomUUID(), totalAmount: '1.00' },
        ],
        teacherId,
      ),
    /not found/,
  );
  await assert.rejects(
    () =>
      FeeStructuresService.batchUpdate(
        [{ id: fee.id, totalAmount: -5 }],
        teacherId,
      ),
    /Amount/,
  );
  await assert.rejects(
    () =>
      FeeStructuresService.batchUpdate(
        [{ id: fee.id, totalAmount: '1.999' }],
        teacherId,
      ),
    /decimal/,
  );
  assert.equal(
    (
      await db
        .select()
        .from(s.feeStructures)
        .where(s.eq(s.feeStructures.id, fee.id))
    )[0].totalAmount,
    '7000.00',
  );
  await FeeStructuresService.batchUpdate(
    [{ id: fee.id, totalAmount: '7500.00' }],
    teacherId,
  );
  assert.equal(
    (
      await db
        .select()
        .from(s.feeStructures)
        .where(s.eq(s.feeStructures.id, fee.id))
    )[0].approvedAt,
    null,
  );
  await assert.rejects(
    () =>
      FeeStructuresService.approveTerm(
        term.id,
        headId,
        fees.map((row) => ({ id: row.id, totalAmount: row.totalAmount })),
      ),
    /changed since/,
  );
  const currentFees = await db
    .select()
    .from(s.feeStructures)
    .where(s.eq(s.feeStructures.termId, term.id));
  await FeeStructuresService.approveTerm(
    term.id,
    headId,
    currentFees.map((row) => ({ id: row.id, totalAmount: row.totalAmount })),
  );
  assert.equal(
    (
      await db
        .select()
        .from(s.studentBills)
        .where(s.eq(s.studentBills.id, billId))
    )[0].netAmount,
    '7000.00',
  );
  const [guardian] = await db.select().from(s.guardians).limit(1);
  const [late] = await db
    .insert(s.students)
    .values({
      firstName: 'Late',
      lastName: 'Admission',
      gender: 'FEMALE',
      assessmentNumber: `LATE-${suffix}`,
      classId,
      primaryGuardianId: guardian.id,
      admissionDate: '2080-01-01',
      status: 'ACTIVE',
    })
    .returning();
  await assert.rejects(
    () =>
      FinanceService.recordPayment(
        { ...base, studentId: late.id, requestKey: randomUUID() },
        teacherId,
      ),
    /No bill exists/,
  );
  const [oldTerm] = await db
    .insert(s.academicTerms)
    .values({
      year: 2001,
      termNumber: 1,
      startDate: '2001-01-01',
      endDate: '2001-04-01',
    })
    .returning();
  await assert.rejects(
    () => FinanceService.previewBilling(2001, 1),
    /current academic year/,
  );
  const [oldBill] = await db
    .insert(s.studentBills)
    .values({
      studentId: learnerId,
      termId: oldTerm.id,
      title: 'Reviewed opening balance',
      billedAmount: '10.00',
      netAmount: '10.00',
      balance: '10.00',
    })
    .returning();
  const oldPayment = await FinanceService.recordPayment(
    {
      ...base,
      academicYear: 2001,
      termNumber: 1,
      billId: oldBill.id,
      requestKey: randomUUID(),
    },
    teacherId,
  );
  assert.equal(oldPayment.academicYear, 2001);
  assert.equal(
    (
      await FinanceService.getStudentStatement(learnerId, {
        academicYear: 2001,
        termNumber: 1,
      })
    ).payments.length,
    1,
  );
  const coverage = await FinanceService.previewBilling(
    term.year,
    term.termNumber,
  );
  assert(coverage.newBills >= 1);
  await FinanceService.generateBills(term.year, term.termNumber, teacherId);
  await FinanceService.generateBills(term.year, term.termNumber, teacherId);
  const lateBills = await db
    .select()
    .from(s.studentBills)
    .where(
      s.and(
        s.eq(s.studentBills.studentId, late.id),
        s.eq(s.studentBills.termId, term.id),
      ),
    );
  assert.equal(lateBills.length, 1);
  assert.equal(lateBills[0].netAmount, '7500.00');
  const reconciliation = await FinanceService.reconciliation(
    term.year,
    term.termNumber,
  );
  assert.equal(reconciliation.mismatchCount, 0);
  const page = await FinanceService.paymentPage({
    academicYear: term.year,
    termNumber: term.termNumber,
    studentId: learnerId,
    limit: 2,
    offset: 0,
  });
  assert.equal(page.items.length, 2);
  assert(page.total >= 4);
  const filtered = await FinanceService.paymentPage({
    academicYear: term.year,
    termNumber: term.termNumber,
    search: first.receiptNumber,
  });
  assert.equal(filtered.total, 1);
  assert.equal(
    (
      await FinanceService.getPayments({
        academicYear: term.year,
        termNumber: 3,
        studentId: learnerId,
      })
    ).length,
    0,
  );
  const nameSearch=await FinanceService.paymentPage({academicYear:term.year,termNumber:term.termNumber,studentId:learnerId,search:'Learner Test'});
  assert(nameSearch.total>0);
  const audit = await db
    .select()
    .from(s.auditLogs)
    .where(s.eq(s.auditLogs.entityId, first.id));
  assert.equal(
    audit.filter((row) => row.action === 'PAYMENT_RECORDED').length,
    1,
  );
}
