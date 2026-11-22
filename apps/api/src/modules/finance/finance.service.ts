import { createHash } from 'node:crypto';
import { db } from '../../config/db.js';
import {
  feePayments,
  paymentRequestKeys,
  studentBills,
  paymentReversals,
  students,
  classes,
  users,
  academicTerms,
  feeStructures,
  systemSettings,
  eq,
  and,
  desc,
  sql,
  isNull,
  inArray,
  or,
  ilike,
} from '@school/shared';
import {
  FinanceValidationError,
  cents,
  money,
  termForFinance,
  financeAudit,
  type FinanceTransaction,
} from './financeRules.js';
export interface RecordPaymentInput {
  studentId: string;
  amountPaid: number | string;
  paymentMethod:
    | 'CASH'
    | 'MANUAL_MPESA'
    | 'MPESA_STK_PUSH'
    | 'BANK_DEPOSIT'
    | 'CHEQUE'
    | 'OTHER';
  requestKey: string;
  mpesaRefCode?: string;
  bankRefNumber?: string;
  paidBy: string;
  academicYear: number;
  termNumber: number;
  notes?: string;
  paymentDate?: string | Date;
  billId?: string;
}
export interface PaymentFilters {
  studentId?: string;
  academicYear?: number;
  termNumber?: number;
  limit?: number;
  offset?: number;
  search?: string;
}
export class FinanceService {
  private static async assertBillConsistent(
    tx: FinanceTransaction,
    billId: string,
  ) {
    const [row] = await tx.execute(
      sql`SELECT (b.paid_amount=(SELECT coalesce(sum(p.amount_paid),0) FROM fee_payments p WHERE p.bill_id=b.id AND p.is_reversed=false AND p.deleted_at IS NULL) AND b.balance=b.net_amount-b.paid_amount AND b.net_amount=b.billed_amount-b.waiver_amount) AS consistent FROM student_bills b WHERE b.id=${billId}`,
    );
    if (!row?.consistent)
      throw new FinanceValidationError(
        'Bill totals do not match the payment ledger. Ask the Head Teacher to reconcile this bill before changing it.',
      );
  }

  private static async billingPlan(
    year: number,
    number: number,
    reader: Pick<typeof db, 'select'> = db,
  ) {
    const term = await termForFinance(year, number, reader);
    const [settings] = await reader
      .select({ year: systemSettings.currentAcademicYear })
      .from(systemSettings)
      .where(isNull(systemSettings.deletedAt))
      .limit(1);
    if (!settings || settings.year !== year)
      throw new FinanceValidationError(
        'New bills can be generated only for the configured current academic year. Historical charges require a reviewed import.',
      );
    const [roster, structures, bills] = await Promise.all([
      reader
        .select({
          student: { id: students.id },
          class: {
            id: classes.id,
            name: classes.name,
            levelCategory: classes.levelCategory,
          },
        })
        .from(students)
        .innerJoin(classes, eq(students.classId, classes.id))
        .where(
          and(
            eq(students.status, 'ACTIVE'),
            sql`${students.admissionDate} <= ${term.endDate}`,
            isNull(students.deletedAt),
            isNull(classes.deletedAt),
          ),
        ),
      reader
        .select()
        .from(feeStructures)
        .where(
          and(
            eq(feeStructures.termId, term.id),
            isNull(feeStructures.deletedAt),
          ),
        ),
      reader
        .select({ studentId: studentBills.studentId })
        .from(studentBills)
        .where(
          and(eq(studentBills.termId, term.id), isNull(studentBills.deletedAt)),
        ),
    ]);
    const billed = new Set(bills.map((b) => b.studentId));
    const byClass = new Map(
      structures.filter((f) => f.classId).map((f) => [f.classId, f]),
    );
    const byLevel = new Map(
      structures.filter((f) => !f.classId).map((f) => [f.levelCategory, f]),
    );
    const missing = new Set<string>();
    const proposed = roster
      .filter((row) => !billed.has(row.student.id))
      .flatMap((row) => {
        const fee =
          byClass.get(row.class.id) || byLevel.get(row.class.levelCategory);
        if (!fee?.approvedAt) {
          missing.add(row.class.name);
          return [];
        }
        const amount = money(cents(fee.totalAmount, true));
        return [
          {
            studentId: row.student.id,
            termId: term.id,
            title: `Term ${number} ${year} Tuition & School Fees`,
            billedAmount: amount,
            netAmount: amount,
            waiverAmount: '0.00',
            paidAmount: '0.00',
            balance: amount,
          },
        ];
      });
    return {
      term,
      eligible: roster.length,
      alreadyBilled: roster.filter((row) => billed.has(row.student.id)).length,
      missing: [...missing].sort(),
      proposed,
    };
  }
  static async previewBilling(year: number, number: number) {
    const plan = await this.billingPlan(year, number);
    return {
      academicYear: year,
      termNumber: number,
      eligible: plan.eligible,
      alreadyBilled: plan.alreadyBilled,
      newBills: plan.proposed.length,
      totalNewAmount: money(
        plan.proposed.reduce((sum, row) => sum + cents(row.netAmount, true), 0),
      ),
      missingFeeClasses: plan.missing,
      canGenerate: !plan.missing.length,
    };
  }
  static async generateBills(year: number, number: number, actorId: string) {
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended('fee-configuration',0))`,
      );
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`billing:${year}:${number}`},0))`,
      );
      const plan = await this.billingPlan(year, number, tx);
      if (plan.missing.length)
        throw new FinanceValidationError(
          `Configure and approve fees for: ${plan.missing.join(', ')}.`,
        );
      for (let offset = 0; offset < plan.proposed.length; offset += 500)
        await tx
          .insert(studentBills)
          .values(plan.proposed.slice(offset, offset + 500));
      if (plan.proposed.length)
        await financeAudit(
          tx,
          actorId,
          'TERM_BILLS_GENERATED',
          'academic_terms',
          plan.term.id,
          null,
          {
            count: plan.proposed.length,
            totalAmount: money(
              plan.proposed.reduce(
                (sum, row) => sum + cents(row.netAmount, true),
                0,
              ),
            ),
          },
        );
      return {
        created: plan.proposed.length,
        alreadyBilled: plan.alreadyBilled,
      };
    });
  }
  static async recordPayment(input: RecordPaymentInput, actorId: string) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        input.requestKey || '',
      )
    )
      throw new FinanceValidationError(
        'A unique payment request key is required.',
      );
    const amount = cents(input.amountPaid);
    if (
      !['CASH', 'MANUAL_MPESA', 'BANK_DEPOSIT', 'CHEQUE', 'OTHER'].includes(
        input.paymentMethod,
      )
    )
      throw new FinanceValidationError(
        'Select a supported manual payment method. STK payments require verified provider confirmation.',
      );
    const mpesa = input.mpesaRefCode?.trim().toUpperCase() || null,
      bank = input.bankRefNumber?.trim().toUpperCase() || null;
    if (input.paymentMethod === 'MANUAL_MPESA' && !mpesa)
      throw new FinanceValidationError('An M-Pesa reference is required.');
    if (['BANK_DEPOSIT', 'CHEQUE'].includes(input.paymentMethod) && !bank)
      throw new FinanceValidationError(
        'A bank or cheque reference is required.',
      );
    if (
      (mpesa && input.paymentMethod !== 'MANUAL_MPESA') ||
      (bank && !['BANK_DEPOSIT', 'CHEQUE'].includes(input.paymentMethod))
    )
      throw new FinanceValidationError(
        'The reference must match the payment method.',
      );
    if ((mpesa?.length || 0) > 50 || (bank?.length || 0) > 50)
      throw new FinanceValidationError(
        'Payment references must be at most 50 characters.',
      );
    if (!input.paidBy?.trim() || input.paidBy.trim().length > 100)
      throw new FinanceValidationError(
        'Provide the payer name (up to 100 characters).',
      );
    const paymentDate = input.paymentDate ? new Date(input.paymentDate) : null;
    if (paymentDate && isNaN(paymentDate.getTime()))
      throw new FinanceValidationError('Invalid payment date.');
    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify([
          input.studentId,
          input.academicYear,
          input.termNumber,
          input.billId || null,
          amount,
          input.paymentMethod,
          mpesa,
          bank,
          input.paidBy.trim(),
          input.notes?.trim() || null,
          paymentDate?.toISOString() || null,
        ]),
      )
      .digest('hex');
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`payment-key:${input.requestKey}`},0))`,
      );
      const [retry] = await tx
        .select()
        .from(paymentRequestKeys)
        .where(eq(paymentRequestKeys.requestKey, input.requestKey));
      if (retry) {
        if (retry.actorId !== actorId || retry.fingerprint !== fingerprint)
          throw new FinanceValidationError(
            'This payment request key was already used with different details.',
          );
        const [original] = await tx
          .select()
          .from(feePayments)
          .where(eq(feePayments.id, retry.paymentId));
        if (!original)
          throw new FinanceValidationError(
            'Original receipt is unavailable. Contact the Head Teacher.',
          );
        if (original.isReversed || original.deletedAt)
          throw new FinanceValidationError(
            'The original payment has been reversed or archived. This request key cannot be reused.',
          );
        return this.receipt(original, tx, true);
      }
      const term = await termForFinance(
        input.academicYear,
        input.termNumber,
        tx,
      );
      const reference = mpesa || bank;
      if (reference) {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtextextended(${`payment-ref:${mpesa ? 'mpesa' : 'bank'}:${reference}`},0))`,
        );
        const column = mpesa
          ? feePayments.mpesaRefCode
          : feePayments.bankRefNumber;
        const referenced = await tx
          .select()
          .from(feePayments)
          .where(sql`upper(trim(${column}))=${reference}`);
        if (referenced.length > 1)
          throw new FinanceValidationError(
            'Multiple existing payments use this reference. Reconcile them before proceeding.',
          );
        const existing = referenced[0];
        if (existing) {
          if (
            existing.studentId !== input.studentId ||
            existing.academicYear !== input.academicYear ||
            existing.termNumber !== input.termNumber ||
            cents(existing.amountPaid) !== amount ||
            existing.paymentMethod !== input.paymentMethod ||
            existing.isReversed ||
            existing.deletedAt ||
            (input.billId && existing.billId !== input.billId)
          )
            throw new FinanceValidationError(
              'Payment reference has already been recorded with different details or reversed.',
            );
          await tx.insert(paymentRequestKeys).values({
            requestKey: input.requestKey,
            paymentId: existing.id,
            actorId,
            fingerprint,
          });
          return this.receipt(existing, tx, true);
        }
      }
      // A former learner can still settle an existing bill; only generation uses the active roster.
      const [learner] = await tx
        .select({ id: students.id })
        .from(students)
        .where(eq(students.id, input.studentId));
      if (!learner) throw new FinanceValidationError('Learner not found.');
      const [bill] = await tx
        .select()
        .from(studentBills)
        .where(
          and(
            eq(studentBills.studentId, input.studentId),
            eq(studentBills.termId, term.id),
            isNull(studentBills.deletedAt),
            input.billId ? eq(studentBills.id, input.billId) : undefined,
          ),
        )
        .for('update');
      if (!bill)
        throw new FinanceValidationError(
          'No bill exists for this learner and term. Generate approved term bills first.',
        );
      await this.assertBillConsistent(tx, bill.id);
      // Receipt numbering is serialized, while bill balances are locked per learner.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`receipts:${input.academicYear}`},0))`,
      );
      const [{ sequence }] = await tx
        .select({
          sequence: sql<number>`coalesce(max((substring(${feePayments.receiptNumber} from '^REC-[0-9]+-([0-9]+)'))::bigint),0)::int+1`,
        })
        .from(feePayments)
        .where(eq(feePayments.academicYear, input.academicYear));
      const [payment] = await tx
        .insert(feePayments)
        .values({
          receiptNumber: `REC-${input.academicYear}-${String(sequence).padStart(4, '0')}`,
          requestKey: input.requestKey,
          requestFingerprint: fingerprint,
          studentId: input.studentId,
          billId: bill.id,
          amountPaid: money(amount),
          paymentMethod: input.paymentMethod,
          mpesaRefCode: mpesa,
          bankRefNumber: bank,
          paidBy: input.paidBy.trim(),
          academicYear: input.academicYear,
          termNumber: term.termNumber,
          notes: input.notes?.trim() || null,
          recordedById: actorId,
          paymentDate: paymentDate || new Date(),
        })
        .returning();
      const paid = cents(bill.paidAmount, true) + amount;
      await tx
        .update(studentBills)
        .set({
          paidAmount: money(paid),
          balance: money(cents(bill.netAmount, true) - paid),
          updatedAt: new Date(),
        })
        .where(eq(studentBills.id, bill.id));
      await tx.insert(paymentRequestKeys).values({
        requestKey: input.requestKey,
        paymentId: payment.id,
        actorId,
        fingerprint,
      });
      await financeAudit(
        tx,
        actorId,
        'PAYMENT_RECORDED',
        'fee_payments',
        payment.id,
        null,
        payment,
      );
      return this.receipt(payment, tx);
    });
  }
  private static async receipt(
    payment: typeof feePayments.$inferSelect,
    reader: Pick<typeof db, 'select'>,
    alreadyRecorded = false,
  ) {
    const [info] = await reader
      .select({ student: students, class: classes, bill: studentBills })
      .from(students)
      .innerJoin(classes, eq(students.classId, classes.id))
      .leftJoin(studentBills, eq(studentBills.id, payment.billId!))
      .where(eq(students.id, payment.studentId));
    return {
      ...payment,
      alreadyRecorded,
      studentName: info
        ? `${info.student.firstName} ${info.student.lastName}`
        : 'Learner',
      assessmentNumber: info?.student.assessmentNumber,
      className: info?.class.name,
      billTitle: info?.bill?.title,
    };
  }
  private static paymentConditions(filters: PaymentFilters) {
    if (
      filters.academicYear !== undefined &&
      (!Number.isInteger(filters.academicYear) ||
        filters.academicYear < 2000 ||
        filters.academicYear > 2200)
    )
      throw new FinanceValidationError('Invalid academic year.');
    if (
      filters.termNumber !== undefined &&
      ![1, 2, 3].includes(filters.termNumber)
    )
      throw new FinanceValidationError('Invalid academic term.');
    const search = filters.search?.trim();
    if (search && search.length > 100)
      throw new FinanceValidationError(
        'Search must be at most 100 characters.',
      );
    const pattern = search
      ? `%${search.replace(/[\\%_]/g, '\\$&')}%`
      : undefined;
    return and(
      isNull(feePayments.deletedAt),
      filters.studentId
        ? eq(feePayments.studentId, filters.studentId)
        : undefined,
      filters.academicYear
        ? eq(feePayments.academicYear, filters.academicYear)
        : undefined,
      filters.termNumber
        ? eq(feePayments.termNumber, filters.termNumber)
        : undefined,
      pattern
        ? or(
            ilike(feePayments.receiptNumber, pattern),
            ilike(feePayments.paidBy, pattern),
            sql`concat_ws(' ',${students.firstName},nullif(trim(${students.middleName}),''),${students.lastName}) ILIKE ${pattern}`,
            ilike(students.assessmentNumber, pattern),
            ilike(feePayments.mpesaRefCode, pattern),
            ilike(feePayments.bankRefNumber, pattern),
          )
        : undefined,
    );
  }
  static async getPayments(filters: PaymentFilters = {}) {
    const limit = filters.limit ?? 50,
      offset = filters.offset ?? 0;
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > 1000000
    )
      throw new FinanceValidationError('Invalid payment page.');
    return db
      .select({
        id: feePayments.id,
        receiptNumber: feePayments.receiptNumber,
        amountPaid: feePayments.amountPaid,
        paymentMethod: feePayments.paymentMethod,
        mpesaRefCode: feePayments.mpesaRefCode,
        bankRefNumber: feePayments.bankRefNumber,
        paidBy: feePayments.paidBy,
        academicYear: feePayments.academicYear,
        termNumber: feePayments.termNumber,
        notes: feePayments.notes,
        isReversed: feePayments.isReversed,
        paymentDate: feePayments.paymentDate,
        createdAt: feePayments.createdAt,
        studentId: students.id,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        assessmentNumber: students.assessmentNumber,
        className: classes.name,
        recordedByFirstName: users.firstName,
        recordedByLastName: users.lastName,
      })
      .from(feePayments)
      .innerJoin(students, eq(feePayments.studentId, students.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .innerJoin(users, eq(feePayments.recordedById, users.id))
      .where(this.paymentConditions(filters))
      .orderBy(desc(feePayments.paymentDate), desc(feePayments.id))
      .limit(limit)
      .offset(offset);
  }
  static async paymentPage(filters: PaymentFilters) {
    const [items, [{ total }]] = await Promise.all([
      this.getPayments(filters),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(feePayments)
        .innerJoin(students, eq(feePayments.studentId, students.id))
        .where(this.paymentConditions(filters)),
    ]);
    return {
      items,
      total,
      limit: filters.limit ?? 50,
      offset: filters.offset ?? 0,
    };
  }
  static async getFinancialSummary(year: number, termNumber?: number) {
    this.paymentConditions({ academicYear: year, termNumber });
    const paymentTotals = await db
      .select({
        method: feePayments.paymentMethod,
        total: sql<string>`coalesce(sum(${feePayments.amountPaid}),0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(feePayments)
      .where(
        and(
          eq(feePayments.academicYear, year),
          termNumber ? eq(feePayments.termNumber, termNumber) : undefined,
          eq(feePayments.isReversed, false),
          isNull(feePayments.deletedAt),
        ),
      )
      .groupBy(feePayments.paymentMethod);
    const [totals] = await db
      .select({
        billed: sql<string>`coalesce(sum(${studentBills.billedAmount}),0)`,
        paid: sql<string>`coalesce(sum(${studentBills.paidAmount}),0)`,
        outstanding: sql<string>`coalesce(sum(greatest(${studentBills.balance},0)),0)`,
        credits: sql<string>`coalesce(sum(greatest(-${studentBills.balance},0)),0)`,
        waivers: sql<string>`coalesce(sum(${studentBills.waiverAmount}),0)`,
      })
      .from(studentBills)
      .innerJoin(academicTerms, eq(studentBills.termId, academicTerms.id))
      .where(
        and(
          isNull(studentBills.deletedAt),
          eq(academicTerms.year, year),
          termNumber ? eq(academicTerms.termNumber, termNumber) : undefined,
        ),
      );
    const [{ pendingCount }] = await db
      .select({ pendingCount: sql<number>`count(*)::int` })
      .from(paymentReversals)
      .innerJoin(
        feePayments,
        eq(paymentReversals.originalPaymentId, feePayments.id),
      )
      .where(
        and(
          isNull(paymentReversals.approvedById),
          isNull(paymentReversals.rejectedById),
          eq(feePayments.academicYear, year),
          termNumber ? eq(feePayments.termNumber, termNumber) : undefined,
        ),
      );
    const methodBreakdown = Object.fromEntries(
      paymentTotals.map((row) => [
        row.method,
        { count: row.count, total: Number(row.total) },
      ]),
    );
    return {
      academicYear: year,
      termNumber: termNumber || 'All Terms',
      totalCollected:
        paymentTotals.reduce(
          (sum, row) => sum + Math.round(Number(row.total) * 100),
          0,
        ) / 100,
      totalTransactions: paymentTotals.reduce((sum, row) => sum + row.count, 0),
      totalBilled: Number(totals.billed),
      totalPaidFromBills: Number(totals.paid),
      totalOutstanding: Number(totals.outstanding),
      totalCredits: Number(totals.credits),
      totalWaivers: Number(totals.waivers),
      methodBreakdown,
      pendingReversalsCount: pendingCount,
      recentPayments: await this.getPayments({
        academicYear: year,
        termNumber,
        limit: 10,
      }),
    };
  }
  static async requestReversal(
    paymentId: string,
    reason: string,
    actorId: string,
  ) {
    if (!reason?.trim() || reason.trim().length > 2000)
      throw new FinanceValidationError(
        'Provide a reversal reason (up to 2000 characters).',
      );
    return db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(feePayments)
        .where(
          and(eq(feePayments.id, paymentId), isNull(feePayments.deletedAt)),
        )
        .for('update');
      if (!payment)
        throw new FinanceValidationError('Original payment record not found.');
      if (payment.isReversed)
        throw new FinanceValidationError('Payment is already reversed.');
      const [pending] = await tx
        .select()
        .from(paymentReversals)
        .where(
          and(
            eq(paymentReversals.originalPaymentId, paymentId),
            isNull(paymentReversals.approvedById),
            isNull(paymentReversals.rejectedById),
          ),
        );
      if (pending)
        throw new FinanceValidationError(
          'A pending reversal request already exists for this payment.',
        );
      const [saved] = await tx
        .insert(paymentReversals)
        .values({
          originalPaymentId: paymentId,
          reason: reason.trim(),
          reversedById: actorId,
        })
        .returning();
      await financeAudit(
        tx,
        actorId,
        'REVERSAL_REQUESTED',
        'payment_reversals',
        saved.id,
        null,
        saved,
      );
      return saved;
    });
  }
  static async getPendingReversals(
    year?: number,
    termNumber?: number,
    limit = 100,
    offset = 0,
  ) {
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > 1000000
    )
      throw new FinanceValidationError('Invalid reversal page.');
    this.paymentConditions({ academicYear: year, termNumber });
    return db
      .select({
        reversalId: paymentReversals.id,
        reason: paymentReversals.reason,
        requestedAt: paymentReversals.createdAt,
        paymentId: feePayments.id,
        receiptNumber: feePayments.receiptNumber,
        amountPaid: feePayments.amountPaid,
        paymentMethod: feePayments.paymentMethod,
        paidBy: feePayments.paidBy,
        paymentDate: feePayments.paymentDate,
        studentId: students.id,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        assessmentNumber: students.assessmentNumber,
        className: classes.name,
        requestedById: paymentReversals.reversedById,
        requestedByFirstName: users.firstName,
        requestedByLastName: users.lastName,
      })
      .from(paymentReversals)
      .innerJoin(
        feePayments,
        eq(paymentReversals.originalPaymentId, feePayments.id),
      )
      .innerJoin(students, eq(feePayments.studentId, students.id))
      .innerJoin(classes, eq(students.classId, classes.id))
      .innerJoin(users, eq(paymentReversals.reversedById, users.id))
      .where(
        and(
          isNull(paymentReversals.approvedById),
          isNull(paymentReversals.rejectedById),
          year ? eq(feePayments.academicYear, year) : undefined,
          termNumber ? eq(feePayments.termNumber, termNumber) : undefined,
        ),
      )
      .orderBy(desc(paymentReversals.createdAt), desc(paymentReversals.id))
      .limit(limit)
      .offset(offset);
  }
  static async reversalHistory(
    year: number,
    termNumber: number | undefined,
    offset = 0,
  ) {
    this.paymentConditions({ academicYear: year, termNumber });
    if (!Number.isInteger(offset) || offset < 0 || offset > 1000000)
      throw new FinanceValidationError('Invalid history page.');
    const rows = await db.execute(
      sql`SELECT r.id, r.reason, r.created_at AS "requestedAt", r.decision_reason AS "decisionReason", r.decided_at AS "decidedAt", p.receipt_number AS "receiptNumber", p.amount_paid AS amount, concat(requester.first_name,' ',requester.last_name) AS "requestedBy", concat(decider.first_name,' ',decider.last_name) AS "decidedBy", CASE WHEN r.approved_by_id IS NOT NULL THEN 'APPROVED' ELSE 'REJECTED' END AS status, count(*) OVER()::int AS total FROM payment_reversals r JOIN fee_payments p ON p.id=r.original_payment_id JOIN users requester ON requester.id=r.reversed_by_id LEFT JOIN users decider ON decider.id=coalesce(r.approved_by_id,r.rejected_by_id) WHERE p.academic_year=${year} AND (${termNumber || null}::int IS NULL OR p.term_number=${termNumber || null}) AND (r.approved_by_id IS NOT NULL OR r.rejected_by_id IS NOT NULL) ORDER BY r.created_at DESC,r.id DESC LIMIT 25 OFFSET ${offset}`,
    );
    return {
      items: rows,
      total: Number(rows[0]?.total || 0),
      limit: 25,
      offset,
    };
  }
  static async reconciliation(year: number, termNumber?: number) {
    this.paymentConditions({ academicYear: year, termNumber });
    const mismatches = await db.execute(
      sql`WITH received AS (SELECT bill_id,sum(amount_paid) AS amount FROM fee_payments WHERE is_reversed=false AND deleted_at IS NULL GROUP BY bill_id) SELECT b.id AS "billId", b.student_id AS "studentId", b.paid_amount AS "storedPaid", coalesce(p.amount,0) AS "recordedPayments", b.balance, b.net_amount AS "netAmount", count(*) OVER()::int AS total FROM student_bills b JOIN academic_terms t ON t.id=b.term_id LEFT JOIN received p ON p.bill_id=b.id WHERE b.deleted_at IS NULL AND t.year=${year} AND (${termNumber || null}::int IS NULL OR t.term_number=${termNumber || null}) AND (b.paid_amount<>coalesce(p.amount,0) OR b.balance<>b.net_amount-b.paid_amount OR b.net_amount<>b.billed_amount-b.waiver_amount) ORDER BY b.id LIMIT 50`,
    );
    const [unlinked] = await db.execute(
      sql`SELECT count(*)::int AS count FROM fee_payments p LEFT JOIN student_bills b ON b.id=p.bill_id LEFT JOIN academic_terms t ON t.id=b.term_id WHERE p.deleted_at IS NULL AND p.is_reversed=false AND p.academic_year=${year} AND (${termNumber || null}::int IS NULL OR p.term_number=${termNumber || null}) AND (b.id IS NULL OR b.deleted_at IS NOT NULL OR b.student_id<>p.student_id OR t.year<>p.academic_year OR t.term_number<>p.term_number)`,
    );
    return {
      mismatchCount: Number(mismatches[0]?.total || 0),
      unlinkedPayments: Number(unlinked.count),
      items: mismatches,
      limit: 50,
    };
  }
  static async approveReversal(id: string, actorId: string, roleName?: string) {
    return this.decideReversal(id, actorId, roleName, true, 'Approved');
  }
  static async rejectReversal(
    id: string,
    actorId: string,
    reason: string,
    roleName?: string,
  ) {
    return this.decideReversal(id, actorId, roleName, false, reason);
  }
  private static async decideReversal(
    id: string,
    actorId: string,
    roleName: string | undefined,
    approve: boolean,
    reason: string,
  ) {
    if (roleName !== 'HEAD_TEACHER')
      throw Object.assign(
        new Error('Only the Head Teacher can decide payment reversals.'),
        { status: 403 },
      );
    if (!reason?.trim() || reason.length > 2000)
      throw new FinanceValidationError(
        'Provide a decision reason (up to 2000 characters).',
      );
    return db.transaction(async (tx) => {
      const [reversal] = await tx
        .select()
        .from(paymentReversals)
        .where(eq(paymentReversals.id, id))
        .for('update');
      if (!reversal)
        throw new FinanceValidationError('Reversal request not found.');
      if (reversal.approvedById || reversal.rejectedById)
        throw new FinanceValidationError(
          'Reversal request has already been processed.',
        );
      if (reversal.reversedById === actorId)
        throw new FinanceValidationError(
          'You cannot decide your own reversal request. Another Head Teacher must review it.',
        );
      const [payment] = await tx
        .select()
        .from(feePayments)
        .where(eq(feePayments.id, reversal.originalPaymentId))
        .for('update');
      if (!payment || payment.isReversed || payment.deletedAt)
        throw new FinanceValidationError(
          'Original payment is unavailable or already reversed.',
        );
      if (approve) {
        if (!payment.billId)
          throw new FinanceValidationError(
            'This legacy payment has no bill. Reconcile it before approving a reversal.',
          );
        const [bill] = await tx
          .select()
          .from(studentBills)
          .where(eq(studentBills.id, payment.billId))
          .for('update');
        if (!bill || bill.deletedAt || bill.studentId !== payment.studentId)
          throw new FinanceValidationError(
            'The linked bill is unavailable. Reconcile before reversal.',
          );
        await this.assertBillConsistent(tx, bill.id);
        const paid = cents(bill.paidAmount, true) - cents(payment.amountPaid);
        if (paid < 0)
          throw new FinanceValidationError(
            'Bill and payment totals disagree. Reconcile before reversal.',
          );
        await tx
          .update(studentBills)
          .set({
            paidAmount: money(paid),
            balance: money(cents(bill.netAmount, true) - paid),
            updatedAt: new Date(),
          })
          .where(eq(studentBills.id, bill.id));
        await tx
          .update(feePayments)
          .set({ isReversed: true, updatedAt: new Date() })
          .where(eq(feePayments.id, payment.id));
      }
      const [saved] = await tx
        .update(paymentReversals)
        .set({
          approvedById: approve ? actorId : null,
          rejectedById: approve ? null : actorId,
          decisionReason: reason.trim(),
          decidedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(paymentReversals.id, id))
        .returning();
      await financeAudit(
        tx,
        actorId,
        approve ? 'REVERSAL_APPROVED' : 'REVERSAL_REJECTED',
        'payment_reversals',
        id,
        reversal,
        saved,
      );
      return saved;
    });
  }
  /**
   * Get student fee statement
   */
  static async getStudentStatement(
    studentId: string,
    filters: Pick<PaymentFilters, 'academicYear' | 'termNumber'> = {},
  ) {
    const [student] = await db
      .select({
        student: students,
        class: classes,
      })
      .from(students)
      .innerJoin(classes, eq(students.classId, classes.id))
      .where(eq(students.id, studentId));

    if (!student) {
      throw new FinanceValidationError('Student not found');
    }

    this.paymentConditions(filters);
    const selectedTerms = await db
      .select({ id: academicTerms.id })
      .from(academicTerms)
      .where(
        and(
          isNull(academicTerms.deletedAt),
          filters.academicYear
            ? eq(academicTerms.year, filters.academicYear)
            : undefined,
          filters.termNumber
            ? eq(academicTerms.termNumber, filters.termNumber)
            : undefined,
        ),
      );
    const bills = await db
      .select()
      .from(studentBills)
      .where(
        and(
          eq(studentBills.studentId, studentId),
          isNull(studentBills.deletedAt),
          inArray(
            studentBills.termId,
            selectedTerms.map((row) => row.id),
          ),
        ),
      )
      .orderBy(desc(studentBills.createdAt));

    const payments = await db
      .select()
      .from(feePayments)
      .where(
        and(
          eq(feePayments.studentId, studentId),
          isNull(feePayments.deletedAt),
          filters.academicYear
            ? eq(feePayments.academicYear, filters.academicYear)
            : undefined,
          filters.termNumber
            ? eq(feePayments.termNumber, filters.termNumber)
            : undefined,
        ),
      )
      .orderBy(desc(feePayments.paymentDate));

    let totalBilled = 0;
    let totalPaid = 0;
    let totalBalance = 0;

    bills.forEach((b) => {
      totalBilled += Math.round(Number(b.billedAmount) * 100);
      totalPaid += Math.round(Number(b.paidAmount) * 100);
      totalBalance += Math.round(Number(b.balance) * 100);
    });

    return {
      student: {
        id: student.student.id,
        fullName:
          `${student.student.firstName} ${student.student.middleName || ''} ${student.student.lastName}`
            .replace(/\s+/g, ' ')
            .trim(),
        assessmentNumber: student.student.assessmentNumber,
        className: student.class.name,
      },
      summary: {
        totalBilled: totalBilled / 100,
        totalPaid: totalPaid / 100,
        totalBalance: totalBalance / 100,
      },
      bills,
      payments,
    };
  }
}
