import { db } from '../../config/db.js';
import {
  feePayments,
  studentBills,
  paymentReversals,
  students,
  classes,
  users,
  academicTerms,
  feeStructures,
  eq,
  and,
  desc,
  sql,
  isNull,
} from '@school/shared';
import { AcademicTermsService } from '../academic-terms/academicTerms.service.js';

const DEFAULT_TERM_FEES: Record<string, number> = {
  PPE: 6000,
  LOWER_PRIMARY: 7000,
  UPPER_PRIMARY: 7500,
  JUNIOR: 11000,
};

export interface RecordPaymentInput {
  studentId: string;
  amountPaid: number | string;
  paymentMethod: 'CASH' | 'MANUAL_MPESA' | 'MPESA_STK_PUSH' | 'BANK_DEPOSIT' | 'CHEQUE' | 'OTHER';
  mpesaRefCode?: string;
  bankRefNumber?: string;
  paidBy: string;
  academicYear?: number;
  termNumber?: number;
  notes?: string;
  paymentDate?: string | Date;
  billId?: string;
}

export class FinanceService {
  /**
   * Helper to format receipt number e.g. REC-2026-0001
   */
  private static async generateReceiptNumber(year: number): Promise<string> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(feePayments)
      .where(eq(feePayments.academicYear, year));

    const nextSeq = Number(count) + 1;
    const padded = String(nextSeq).padStart(4, '0');
    let candidate = `REC-${year}-${padded}`;

    // Verify uniqueness
    const [existing] = await db
      .select({ id: feePayments.id })
      .from(feePayments)
      .where(eq(feePayments.receiptNumber, candidate));

    if (existing) {
      candidate = `REC-${year}-${padded}-${Math.floor(100 + Math.random() * 900)}`;
    }

    return candidate;
  }

  /**
   * Record fee payment and update student bill balance
   */
  static async recordPayment(input: RecordPaymentInput, recordedById: string) {
    const year = input.academicYear || 2026;
    const numAmount = Number(input.amountPaid);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Payment amount must be a positive number');
    }

    // 1. Ensure academic terms exist
    const terms = await AcademicTermsService.ensureThreeTerms(year);
    let targetTerm = input.termNumber ? terms.find((t) => t.termNumber === input.termNumber) : null;
    if (!targetTerm) {
      targetTerm = terms.find((t) => t.isCurrent) || terms[0];
    }
    if (!targetTerm) {
      throw new Error('Academic term not found for specified year and term number');
    }

    // 2. Fetch student and class details
    const [studentInfo] = await db
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
      const [b] = await db
        .select()
        .from(studentBills)
        .where(eq(studentBills.id, input.billId));
      targetBill = b;
    }

    if (!targetBill) {
      // Look for existing bill for this student & term
      const [existingBill] = await db
        .select()
        .from(studentBills)
        .where(
          and(
            eq(studentBills.studentId, input.studentId),
            eq(studentBills.termId, targetTerm.id),
            isNull(studentBills.deletedAt)
          )
        );

      if (existingBill) {
        targetBill = existingBill;
      } else {
        // Resolve fee structure for this class's level category
        const [feeStruct] = await db
          .select()
          .from(feeStructures)
          .where(
            and(
              eq(feeStructures.termId, targetTerm.id),
              eq(feeStructures.levelCategory, studentInfo.class.levelCategory)
            )
          );

        const feeAmount = feeStruct
          ? Number(feeStruct.totalAmount)
          : (DEFAULT_TERM_FEES[studentInfo.class.levelCategory] || 7000);

        const [createdBill] = await db
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

    // 4. Generate receipt number
    const receiptNumber = await this.generateReceiptNumber(year);

    // 5. Transaction: record payment & update student bill
    const payment = await db.transaction(async (tx) => {
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
          paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
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
  }

  /**
   * Get payments with student and recorder details
   */
  static async getPayments(filters: {
    studentId?: string;
    academicYear?: number;
    termNumber?: number;
    limit?: number;
    offset?: number;
  } = {}) {
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
          : eq(feePayments.academicYear, year)
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
    // 1. Total collections and breakdown
    const paymentsList = await db
      .select()
      .from(feePayments)
      .where(
        and(
          eq(feePayments.academicYear, year),
          eq(feePayments.isReversed, false),
          termNumber ? eq(feePayments.termNumber, termNumber) : sql`1=1`
        )
      );

    let totalCollected = 0;
    const methodCounts: Record<string, { count: number; total: number }> = {
      CASH: { count: 0, total: 0 },
      MANUAL_MPESA: { count: 0, total: 0 },
    };

    paymentsList.forEach((p) => {
      const amt = Number(p.amountPaid) || 0;
      totalCollected += amt;
      const method = p.paymentMethod || 'OTHER';
      if (!methodCounts[method]) {
        methodCounts[method] = { count: 0, total: 0 };
      }
      methodCounts[method].count += 1;
      methodCounts[method].total += amt;
    });

    // 2. Total bills
    const billsList = await db
      .select()
      .from(studentBills)
      .where(isNull(studentBills.deletedAt));

    let totalBilled = 0;
    let totalPaidFromBills = 0;
    let totalOutstanding = 0;
    let totalWaivers = 0;

    billsList.forEach((b) => {
      totalBilled += Number(b.billedAmount) || 0;
      totalPaidFromBills += Number(b.paidAmount) || 0;
      totalOutstanding += Number(b.balance) || 0;
      totalWaivers += Number(b.waiverAmount) || 0;
    });

    // 3. Count pending reversals
    const [{ pendingCount }] = await db
      .select({ pendingCount: sql<number>`count(*)` })
      .from(paymentReversals)
      .where(isNull(paymentReversals.approvedById));

    // 4. Recent payments
    const recentPayments = await this.getPayments({ academicYear: year, limit: 10 });

    return {
      academicYear: year,
      termNumber: termNumber || 'All Terms',
      totalCollected,
      totalBilled,
      totalPaidFromBills,
      totalOutstanding,
      totalWaivers,
      totalTransactions: paymentsList.length,
      methodBreakdown: methodCounts,
      pendingReversalsCount: Number(pendingCount),
      recentPayments,
    };
  }

  /**
   * Request a payment reversal
   */
  static async requestReversal(originalPaymentId: string, reason: string, reversedById: string) {
    const [payment] = await db
      .select()
      .from(feePayments)
      .where(eq(feePayments.id, originalPaymentId));

    if (!payment) {
      throw new Error('Original payment record not found');
    }
    if (payment.isReversed) {
      throw new Error('Payment is already reversed');
    }

    const [existingRequest] = await db
      .select()
      .from(paymentReversals)
      .where(
        and(
          eq(paymentReversals.originalPaymentId, originalPaymentId),
          isNull(paymentReversals.approvedById)
        )
      );

    if (existingRequest) {
      throw new Error('A pending reversal request already exists for this payment');
    }

    const [reversal] = await db
      .insert(paymentReversals)
      .values({
        originalPaymentId,
        reason,
        reversedById,
      })
      .returning();

    return reversal;
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
      .innerJoin(feePayments, eq(paymentReversals.originalPaymentId, feePayments.id))
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
        .where(eq(paymentReversals.id, reversalId));

      if (!reversal) {
        throw new Error('Reversal request not found');
      }
      if (reversal.approvedById) {
        throw new Error('Reversal request has already been processed');
      }

      const [payment] = await tx
        .select()
        .from(feePayments)
        .where(eq(feePayments.id, reversal.originalPaymentId));

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
          .where(eq(studentBills.id, payment.billId));

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
    await db.delete(paymentReversals).where(eq(paymentReversals.id, reversalId));
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
          isNull(studentBills.deletedAt)
        )
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
        fullName: `${student.student.firstName} ${student.student.middleName || ''} ${student.student.lastName}`.replace(/\s+/g, ' ').trim(),
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
