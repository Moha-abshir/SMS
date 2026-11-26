import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, timestamp, date, decimal, boolean, integer, pgEnum, unique, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { classes, students, levelCategoryEnum } from './admissions.js';
import { academicTerms } from './academics.js';

export const paymentMethodEnum = pgEnum('payment_method', ['CASH', 'MANUAL_MPESA', 'MPESA_STK_PUSH', 'BANK_DEPOSIT', 'CHEQUE', 'OTHER']);

export const expenseCategories = pgTable('expense_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});

export const feeStructures = pgTable('fee_structures', {
  id: uuid('id').defaultRandom().primaryKey(),
  termId: uuid('term_id').notNull().references(() => academicTerms.id),
  levelCategory: levelCategoryEnum('level_category').notNull(),
  classId: uuid('class_id').references(() => classes.id),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  approvedById: uuid('approved_by_id').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  uniqueIndex('fee_structures_active_level_uq').on(table.termId, table.levelCategory).where(sql`${table.deletedAt} IS NULL AND ${table.classId} IS NULL`),
  uniqueIndex('fee_structures_active_class_uq').on(table.termId, table.classId).where(sql`${table.deletedAt} IS NULL AND ${table.classId} IS NOT NULL`),
  index('fee_structures_term_level_idx').on(table.termId, table.levelCategory),
]);

export const feeStructureItems = pgTable('fee_structure_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  feeStructureId: uuid('fee_structure_id').notNull().references(() => feeStructures.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 100 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('fee_structure_items_fee_structure_id_idx').on(table.feeStructureId),
]);

export const studentBills = pgTable('student_bills', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').notNull().references(() => students.id),
  termId: uuid('term_id').notNull().references(() => academicTerms.id),
  title: varchar('title', { length: 150 }).notNull(),
  billedAmount: decimal('billed_amount', { precision: 10, scale: 2 }).notNull(),
  waiverAmount: decimal('waiver_amount', { precision: 10, scale: 2 }).default('0.00').notNull(),
  netAmount: decimal('net_amount', { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 10, scale: 2 }).default('0.00').notNull(),
  balance: decimal('balance', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  uniqueIndex('student_bills_active_student_term_uq').on(table.studentId, table.termId).where(sql`${table.deletedAt} IS NULL`),
  index('student_bills_student_id_idx').on(table.studentId),
  index('student_bills_term_id_idx').on(table.termId),
]);

export const feePayments = pgTable('fee_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  receiptNumber: varchar('receipt_number', { length: 50 }).notNull().unique(),
  requestKey: uuid('request_key'),
  requestFingerprint: varchar('request_fingerprint', { length: 64 }),
  studentId: uuid('student_id').notNull().references(() => students.id),
  billId: uuid('bill_id').references(() => studentBills.id),
  amountPaid: decimal('amount_paid', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  mpesaRefCode: varchar('mpesa_ref_code', { length: 50 }),
  bankRefNumber: varchar('bank_ref_number', { length: 50 }),
  paidBy: varchar('paid_by', { length: 100 }).notNull(),
  academicYear: integer('academic_year').default(2026).notNull(),
  termNumber: integer('term_number').default(1).notNull(),
  notes: text('notes'),
  isReversed: boolean('is_reversed').default(false).notNull(),
  recordedById: uuid('recorded_by_id').notNull().references(() => users.id),
  paymentDate: timestamp('payment_date', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  uniqueIndex('fee_payments_request_key_uq').on(table.requestKey),
  index('fee_payments_student_id_idx').on(table.studentId),
  index('fee_payments_bill_id_idx').on(table.billId),
  index('fee_payments_payment_date_idx').on(table.paymentDate),
]);

export const paymentRequestKeys = pgTable('payment_request_keys', {
  requestKey: uuid('request_key').primaryKey(),
  paymentId: uuid('payment_id').notNull().references(() => feePayments.id),
  actorId: uuid('actor_id').notNull().references(() => users.id),
  fingerprint: varchar('fingerprint', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const paymentReversals = pgTable('payment_reversals', {
  id: uuid('id').defaultRandom().primaryKey(),
  originalPaymentId: uuid('original_payment_id').notNull().references(() => feePayments.id),
  reason: text('reason').notNull(),
  reversedById: uuid('reversed_by_id').notNull().references(() => users.id),
  approvedById: uuid('approved_by_id').references(() => users.id),
  rejectedById: uuid('rejected_by_id').references(() => users.id),
  decisionReason: text('decision_reason'),
  decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
}, (table) => [
  index('payment_reversals_payment_id_idx').on(table.originalPaymentId),
]);

export const expenses = pgTable('expenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  voucherNumber: varchar('voucher_number', { length: 50 }).notNull().unique(),
  categoryId: uuid('category_id').notNull().references(() => expenseCategories.id),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  vendorName: varchar('vendor_name', { length: 100 }),
  receiptUrl: text('receipt_url'),
  attachmentUrl: text('attachment_url'),
  approvedById: uuid('approved_by_id').references(() => users.id),
  recordedById: uuid('recorded_by_id').notNull().references(() => users.id),
  paymentMethod: paymentMethodEnum('payment_method'),
  reference: varchar('reference', { length: 100 }),
  academicYear: integer('academic_year'),
  termNumber: integer('term_number'),
  requestKey: uuid('request_key'),
  requestFingerprint: varchar('request_fingerprint', { length: 64 }),
  attachmentData: text('attachment_data'),
  attachmentType: varchar('attachment_type', { length: 50 }),
  attachmentName: varchar('attachment_name', { length: 150 }),
  voidedAt: timestamp('voided_at', { withTimezone: true, mode: 'date' }),
  voidedById: uuid('voided_by_id').references(() => users.id),
  voidReason: text('void_reason'),
  expenseDate: date('expense_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  uniqueIndex('expenses_request_key_uq').on(table.requestKey),
  index('expenses_period_idx').on(table.academicYear, table.termNumber, table.expenseDate),
  index('expenses_category_id_idx').on(table.categoryId),
  index('expenses_expense_date_idx').on(table.expenseDate),
]);

export const otherIncome = pgTable('other_income', {
  id: uuid('id').defaultRandom().primaryKey(),
  receiptNumber: varchar('receipt_number', { length: 50 }).notNull().unique(),
  requestKey: uuid('request_key').notNull().unique(),
  requestFingerprint: varchar('request_fingerprint', { length: 64 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  reference: varchar('reference', { length: 100 }),
  party: varchar('party', { length: 100 }).notNull(),
  entryDate: date('entry_date').notNull(),
  academicYear: integer('academic_year').notNull(),
  termNumber: integer('term_number').notNull(),
  notes: text('notes'),
  recordedById: uuid('recorded_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  voidedAt: timestamp('voided_at', { withTimezone: true, mode: 'date' }),
  voidedById: uuid('voided_by_id').references(() => users.id),
  voidReason: text('void_reason'),
}, table => [index('other_income_period_idx').on(table.academicYear, table.termNumber, table.entryDate)]);
