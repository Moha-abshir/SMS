import { AcademicTermsService } from '../academic-terms/academicTerms.service.js';
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
const DEFAULT_TERM_FEES: Record<string, number> = {
  PPE: 6000,
  LOWER_PRIMARY: 7000,
  UPPER_PRIMARY: 7500,
  JUNIOR: 11000,
};

export class FinanceService {
  /**
   * Helper to format receipt number e.g. REC-2026-0001
   */
  private static async generateReceiptNumber(
    year: number,
    executor: Pick<typeof db, 'select'> = db,
  ): Promise<string> {
    const [{ count }] = await executor
      .select({ count: sql<number>`count(*)` })
      .from(feePayments)
      .where(eq(feePayments.academicYear, year));

    const nextSeq = Number(count) + 1;
    const padded = String(nextSeq).padStart(4, '0');
    let candidate = `REC-${year}-${padded}`;

    // Verify uniqueness
    const [existing] = await executor
      .select({ id: feePayments.id })
      .from(feePayments)
      .where(eq(feePayments.receiptNumber, candidate));

    if (existing) {
      candidate = `REC-${year}-${padded}-${Math.floor(100 + Math.random() * 900)}`;
    }

    return candidate;
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

  /**
   * Record fee payment and update student bill balance
   */
  static async recordPayment(input: RecordPaymentInput, recordedById: string) {
    const terms = await AcademicTermsService.ensureThreeTerms(
      input.academicYear || 2026,
    );
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`finance:${input.academicYear || 2026}`}, 0))`,
      );

      const year = input.academicYear || 2026;
      const numAmount = Number(input.amountPaid);
      if (
        !Number.isFinite(numAmount) ||
        numAmount <= 0 ||
        numAmount > 99999999.99 ||
        Math.abs(numAmount * 100 - Math.round(numAmount * 100)) > 0.00001
      ) {
        throw new Error(
          'Payment amount must be positive with at most two decimal places',
        );
      }

      // 1. Ensure academic terms exist

      let targetTerm = input.termNumber
        ? terms.find((t) => t.termNumber === input.termNumber)
        : null;
      if (!targetTerm) {
        targetTerm = terms.find((t) => t.isCurrent) || terms[0];
      }
      if (!targetTerm) {
        throw new Error(
          'Academic term not found for specified year and term number',
        );
      }

      // 2. Fetch student and class details
      const [studentInfo] = await tx
        .select({
          student: students,
          class: classes,
        })
        .from(students)
        .innerJoin(classes, eq(students.classId, classes.id))
        .where(eq(students.id, input.studentId));

      if (!studentInfo) {
        throw new Error('Student not found');
      }

      // 3. Find or auto-create student bill for this term
      let targetBill: any = null;
      if (input.billId) {
        const [b] = await tx
          .select()
          .from(studentBills)
          .where(eq(studentBills.id, input.billId));
        if (
          !b ||
          b.studentId !== input.studentId ||
          b.termId !== targetTerm.id ||
          b.deletedAt
        )
          throw new Error('Bill does not belong to this learner and term');
        targetBill = b;
      }

      if (!targetBill) {
        // Look for existing bill for this student & term
        const [existingBill] = await tx
          .select()
          .from(studentBills)
          .where(
            and(
              eq(studentBills.studentId, input.studentId),
              eq(studentBills.termId, targetTerm.id),
              isNull(studentBills.deletedAt),
            ),
          );

        if (existingBill) {
          targetBill = existingBill;
        } else {
          // Resolve fee structure for this class's level category
          const [feeStruct] = await tx
            .select()
            .from(feeStructures)
            .where(
              and(
                eq(feeStructures.termId, targetTerm.id),
                eq(
                  feeStructures.levelCategory,
                  studentInfo.class.levelCategory,
                ),
              ),
            );

          const feeAmount = feeStruct
            ? Number(feeStruct.totalAmount)
            : DEFAULT_TERM_FEES[studentInfo.class.levelCategory] || 7000;

          const [createdBill] = await tx
            .insert(studentBills)
            .values({
              studentId: input.studentId,
              termId: targetTerm.id,
              title: `Term ${targetTerm.termNumber} ${year} Tuition & School Fees`,
              billedAmount: feeAmount.toFixed(2),
              waiverAmount: '0.00',
              netAmount: feeAmount.toFixed(2),
              paidAmount: '0.00',
              balance: feeAmount.toFixed(2),
            })
            .returning();

          targetBill = createdBill;
        }
      }

      const reference = (input.mpesaRefCode || input.bankRefNumber || '')
        .trim()
        .toUpperCase();
      if (reference) {
        const mpesa = Boolean(input.mpesaRefCode);
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtextextended(${`payment-ref:${mpesa ? 'mpesa' : 'bank'}:${reference}`}, 0))`,
        );
        const column = mpesa
          ? feePayments.mpesaRefCode
          : feePayments.bankRefNumber;
        const [existing] = await tx
          .select()
          .from(feePayments)
          .where(sql`upper(trim(${column})) = ${reference}`);
        if (existing) {
          if (
            existing.studentId !== input.studentId ||
            existing.billId !== targetBill.id ||
            Number(existing.amountPaid) !== numAmount ||
            existing.isReversed
          )
            throw new Error(
              'Payment reference has already been recorded with different details or reversed',
            );
          return {
            ...existing,
            studentName: `${studentInfo.student.firstName} ${studentInfo.student.lastName}`,
            assessmentNumber: studentInfo.student.assessmentNumber,
            className: studentInfo.class.name,
            billTitle: targetBill.title,
          };
        }
        input = {
          ...input,
          ...(mpesa
            ? { mpesaRefCode: reference }
            : { bankRefNumber: reference }),
        };
      }

      // 4. Generate receipt number
      const receiptNumber = await this.generateReceiptNumber(year, tx);

      // 5. Transaction: record payment & update student bill
      const payment = await tx.transaction(async (tx) => {
        const [lockedBill] = await tx
          .select()
          .from(studentBills)
          .where(eq(studentBills.id, targetBill.id))
          .for('update');
        targetBill = lockedBill;
        const [newPayment] = await tx
          .insert(feePayments)
          .values({
            receiptNumber,
            studentId: input.studentId,
            billId: targetBill.id,
            amountPaid: numAmount.toFixed(2),
            paymentMethod: input.paymentMethod,
            mpesaRefCode: input.mpesaRefCode || null,
            bankRefNumber: input.bankRefNumber || null,
            paidBy: input.paidBy,
            academicYear: year,
            termNumber: targetTerm!.termNumber,
            notes: input.notes || null,
            isReversed: false,
            recordedById,
            paymentDate: input.paymentDate
              ? new Date(input.paymentDate)
              : new Date(),
          })
          .returning();

        const newPaidAmount = Number(targetBill.paidAmount) + numAmount;
        const newBalance = Number(targetBill.netAmount) - newPaidAmount;

        await tx
          .update(studentBills)
          .set({
            paidAmount: newPaidAmount.toFixed(2),
            balance: newBalance.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(studentBills.id, targetBill.id));

        return newPayment;
      });

      return {
        ...payment,
        studentName: `${studentInfo.student.firstName} ${studentInfo.student.lastName}`,
        assessmentNumber: studentInfo.student.assessmentNumber,
        className: studentInfo.class.name,
        billTitle: targetBill.title,
      };
    });
  }

  /**
   * Get payments with student and recorder details
   */
  static async getPayments(
    filters: {
      studentId?: string;
      academicYear?: number;
      termNumber?: number;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const year = filters.academicYear || 2026;
    const limit = Math.min(filters.limit || 50, 100);
    const offset = filters.offset || 0;

    const query = db
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
      .where(
        filters.studentId
          ? eq(feePayments.studentId, filters.studentId)
          : eq(feePayments.academicYear, year),
      )
      .orderBy(desc(feePayments.paymentDate))
      .limit(limit)
      .offset(offset);

    return await query;
  }

  /**
   * Financial Summary overview for Head Teacher and Bursar
   */
  static async getFinancialSummary(year: number = 2026, termNumber?: number) {
    const paymentTotals = await db
      .select({
        method: feePayments.paymentMethod,
        total: sql<string>`coalesce(sum(${feePayments.amountPaid}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(feePayments)
      .where(
        and(
          eq(feePayments.academicYear, year),
          eq(feePayments.isReversed, false),
          isNull(feePayments.deletedAt),
          termNumber ? eq(feePayments.termNumber, termNumber) : undefined,
        ),
      )
      .groupBy(feePayments.paymentMethod);
    let totalCollected = 0;
    let totalTransactions = 0;
    const methodCounts: Record<string, { count: number; total: number }> = {
      CASH: { count: 0, total: 0 },
      MANUAL_MPESA: { count: 0, total: 0 },
    };
    for (const row of paymentTotals) {
      const total = Number(row.total);
      methodCounts[row.method] = { count: Number(row.count), total };
      totalCollected += total;
      totalTransactions += Number(row.count);
    }
    const [billTotals] = await db
      .select({
        billed: sql<string>`coalesce(sum(${studentBills.billedAmount}), 0)`,
        paid: sql<string>`coalesce(sum(${studentBills.paidAmount}), 0)`,
        outstanding: sql<string>`coalesce(sum(${studentBills.balance}), 0)`,
        waivers: sql<string>`coalesce(sum(${studentBills.waiverAmount}), 0)`,
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
    const totalBilled = Number(billTotals.billed),
      totalPaidFromBills = Number(billTotals.paid),
      totalOutstanding = Number(billTotals.outstanding),
      totalWaivers = Number(billTotals.waivers);

    // 3. Count pending reversals
    const [{ pendingCount }] = await db
      .select({ pendingCount: sql<number>`count(*)` })
      .from(paymentReversals)
      .where(isNull(paymentReversals.approvedById));

    // 4. Recent payments
    const recentPayments = await this.getPayments({
      academicYear: year,
      termNumber,
      limit: 10,
    });

    return {
      academicYear: year,
      termNumber: termNumber || 'All Terms',
      totalCollected,
      totalBilled,
      totalPaidFromBills,
      totalOutstanding,
      totalWaivers,
      totalTransactions,
      methodBreakdown: methodCounts,
      pendingReversalsCount: Number(pendingCount),
      recentPayments,
    };
  }

  /**
   * Request a payment reversal
   */
  static async requestReversal(
    originalPaymentId: string,
    reason: string,
    reversedById: string,
  ) {
    return db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(feePayments)
        .where(eq(feePayments.id, originalPaymentId))
        .for('update');

      if (!payment) {
        throw new Error('Original payment record not found');
      }
      if (payment.isReversed) {
        throw new Error('Payment is already reversed');
      }

      const [existingRequest] = await tx
        .select()
        .from(paymentReversals)
        .where(
          and(
            eq(paymentReversals.originalPaymentId, originalPaymentId),
            isNull(paymentReversals.approvedById),
          ),
        );

      if (existingRequest) {
        throw new Error(
          'A pending reversal request already exists for this payment',
        );
      }

      const [reversal] = await tx
        .insert(paymentReversals)
        .values({
          originalPaymentId,
          reason,
          reversedById,
        })
        .returning();

      return reversal;
    });
  }

  /**
   * Get pending payment reversals queue
   */
  static async getPendingReversals() {
    return await db
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
      .where(isNull(paymentReversals.approvedById))
      .orderBy(desc(paymentReversals.createdAt));
  }

  /**
   * Approve payment reversal (Head Teacher approval)
   */
  static async approveReversal(reversalId: string, approvedById: string) {
    return await db.transaction(async (tx) => {
      const [reversal] = await tx
        .select()
        .from(paymentReversals)
        .where(eq(paymentReversals.id, reversalId))
        .for('update');

      if (!reversal) {
        throw new Error('Reversal request not found');
      }
      if (reversal.approvedById) {
        throw new Error('Reversal request has already been processed');
      }

      const [payment] = await tx
        .select()
        .from(feePayments)
        .where(eq(feePayments.id, reversal.originalPaymentId))
        .for('update');

      if (!payment) {
        throw new Error('Original payment not found');
      }
      if (payment.isReversed) {
        throw new Error('Payment has already been reversed');
      }

      // 1. Mark reversal approved
      const [updatedReversal] = await tx
        .update(paymentReversals)
        .set({
          approvedById,
          updatedAt: new Date(),
        })
        .where(eq(paymentReversals.id, reversalId))
        .returning();

      // 2. Mark payment reversed
      await tx
        .update(feePayments)
        .set({
          isReversed: true,
          updatedAt: new Date(),
        })
        .where(eq(feePayments.id, payment.id));

      // 3. Rollback student bill paidAmount & balance
      if (payment.billId) {
        const [bill] = await tx
          .select()
          .from(studentBills)
          .where(eq(studentBills.id, payment.billId))
          .for('update');

        if (bill) {
          const reversedAmt = Number(payment.amountPaid);
          const currentPaid = Number(bill.paidAmount);
          const newPaid = Math.max(0, currentPaid - reversedAmt);
          const newBalance = Number(bill.netAmount) - newPaid;

          await tx
            .update(studentBills)
            .set({
              paidAmount: newPaid.toFixed(2),
              balance: newBalance.toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(studentBills.id, bill.id));
        }
      }

      return updatedReversal;
    });
  }

  /**
   * Reject payment reversal request
   */
  static async rejectReversal(reversalId: string, rejectedById: string) {
    const [reversal] = await db
      .select()
      .from(paymentReversals)
      .where(eq(paymentReversals.id, reversalId));

    if (!reversal) {
      throw new Error('Reversal request not found');
    }

    // Delete pending reversal request so payment stays valid
    const deleted = await db
      .delete(paymentReversals)
      .where(
        and(
          eq(paymentReversals.id, reversalId),
          isNull(paymentReversals.approvedById),
        ),
      )
      .returning();
    if (!deleted.length)
      throw new Error('Reversal request has already been processed');
    return { success: true, message: 'Reversal request dismissed' };
  }

  /**
   * Get student fee statement
   */
  static async getStudentStatement(studentId: string) {
    const [student] = await db
      .select({
        student: students,
        class: classes,
      })
      .from(students)
      .innerJoin(classes, eq(students.classId, classes.id))
      .where(eq(students.id, studentId));

    if (!student) {
      throw new Error('Student not found');
    }

    const bills = await db
      .select()
      .from(studentBills)
      .where(
        and(
          eq(studentBills.studentId, studentId),
          isNull(studentBills.deletedAt),
        ),
      )
      .orderBy(desc(studentBills.createdAt));

    const payments = await db
      .select()
      .from(feePayments)
      .where(eq(feePayments.studentId, studentId))
      .orderBy(desc(feePayments.paymentDate));

    let totalBilled = 0;
    let totalPaid = 0;
    let totalBalance = 0;

    bills.forEach((b) => {
      totalBilled += Number(b.billedAmount) || 0;
      totalPaid += Number(b.paidAmount) || 0;
      totalBalance += Number(b.balance) || 0;
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
        totalBilled,
        totalPaid,
        totalBalance,
      },
      bills,
      payments,
    };
  }
}
