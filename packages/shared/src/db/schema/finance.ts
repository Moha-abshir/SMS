import { pgTable, uuid, varchar, text, timestamp, date, decimal, boolean, integer, pgEnum, unique, index } from 'drizzle-orm/pg-core';
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
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
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
  index('student_bills_student_id_idx').on(table.studentId),
  index('student_bills_term_id_idx').on(table.termId),
]);

export const feePayments = pgTable('fee_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  receiptNumber: varchar('receipt_number', { length: 50 }).notNull().unique(),
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
  index('fee_payments_student_id_idx').on(table.studentId),
  index('fee_payments_bill_id_idx').on(table.billId),
  index('fee_payments_payment_date_idx').on(table.paymentDate),
]);

export const paymentReversals = pgTable('payment_reversals', {
  id: uuid('id').defaultRandom().primaryKey(),
  originalPaymentId: uuid('original_payment_id').notNull().references(() => feePayments.id),
  reason: text('reason').notNull(),
  reversedById: uuid('reversed_by_id').notNull().references(() => users.id),
  approvedById: uuid('approved_by_id').references(() => users.id),
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
  expenseDate: date('expense_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('expenses_category_id_idx').on(table.categoryId),
  index('expenses_expense_date_idx').on(table.expenseDate),
]);
