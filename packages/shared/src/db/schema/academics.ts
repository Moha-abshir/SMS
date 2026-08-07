import { pgTable, uuid, varchar, text, timestamp, date, integer, decimal, boolean, pgEnum, unique, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { classes, students, subjects } from './admissions.js';

export const examStatusEnum = pgEnum('exam_status', ['DRAFT', 'MARKS_ENTRY', 'PENDING_DEPUTY_APPROVAL', 'LOCKED']);
export const unlockRequestStatusEnum = pgEnum('unlock_request_status', ['PENDING', 'APPROVED', 'REJECTED']);

export const academicTerms = pgTable('academic_terms', {
  id: uuid('id').defaultRandom().primaryKey(),
  year: integer('year').notNull(),
  termNumber: integer('term_number').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isCurrent: boolean('is_current').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  unique('year_term_uq').on(table.year, table.termNumber),
  index('academic_terms_is_current_idx').on(table.isCurrent),
]);

export const catAssessments = pgTable('cat_assessments', {
  id: uuid('id').defaultRandom().primaryKey(),
  termId: uuid('term_id').notNull().references(() => academicTerms.id),
  classId: uuid('class_id').notNull().references(() => classes.id),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id),
  catNumber: integer('cat_number').notNull(), // 1, 2, 3
  maxMarks: integer('max_marks').default(100).notNull(),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('cat_assessments_term_class_subject_idx').on(table.termId, table.classId, table.subjectId),
]);

export const catScores = pgTable('cat_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  catId: uuid('cat_id').notNull().references(() => catAssessments.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id),
  marksObtained: decimal('marks_obtained', { precision: 5, scale: 2 }).notNull(),
  remarks: text('remarks'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  unique('cat_student_uq').on(table.catId, table.studentId),
  index('cat_scores_cat_id_idx').on(table.catId),
  index('cat_scores_student_id_idx').on(table.studentId),
]);

export const examinations = pgTable('examinations', {
  id: uuid('id').defaultRandom().primaryKey(),
  termId: uuid('term_id').notNull().references(() => academicTerms.id),
  title: varchar('title', { length: 100 }).notNull(),
  status: examStatusEnum('status').default('DRAFT').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('examinations_term_id_idx').on(table.termId),
  index('examinations_status_idx').on(table.status),
]);

export const examScores = pgTable('exam_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  examId: uuid('exam_id').notNull().references(() => examinations.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id),
  marksObtained: decimal('marks_obtained', { precision: 5, scale: 2 }).notNull(),
  maxMarks: integer('max_marks').default(100).notNull(),
  cbcRubricLevel: varchar('cbc_rubric_level', { length: 10 }), // EE (4), ME (3), AE (2), BE (1)
  juniorPoints: integer('junior_points'), // 8 to 1 points
  teacherRemarks: text('teacher_remarks'),
  enteredById: uuid('entered_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  unique('exam_student_subject_uq').on(table.examId, table.studentId, table.subjectId),
  index('exam_scores_exam_id_idx').on(table.examId),
  index('exam_scores_student_id_idx').on(table.studentId),
  index('exam_scores_subject_id_idx').on(table.subjectId),
]);

export const reportCardLocks = pgTable('report_card_locks', {
  id: uuid('id').defaultRandom().primaryKey(),
  termId: uuid('term_id').notNull().references(() => academicTerms.id),
  classId: uuid('class_id').notNull().references(() => classes.id),
  isLocked: boolean('is_locked').default(false).notNull(),
  lockedById: uuid('locked_by_id').references(() => users.id),
  lockedAt: timestamp('locked_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  unique('term_class_lock_uq').on(table.termId, table.classId),
  index('report_card_locks_term_class_idx').on(table.termId, table.classId),
]);

export const reportUnlockRequests = pgTable('report_unlock_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  classId: uuid('class_id').notNull().references(() => classes.id),
  termId: uuid('term_id').notNull().references(() => academicTerms.id),
  requestedById: uuid('requested_by_id').notNull().references(() => users.id),
  reason: text('reason').notNull(),
  approvedById: uuid('approved_by_id').references(() => users.id),
  status: unlockRequestStatusEnum('status').default('PENDING').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('report_unlock_requests_class_term_idx').on(table.classId, table.termId),
  index('report_unlock_requests_status_idx').on(table.status),
]);
