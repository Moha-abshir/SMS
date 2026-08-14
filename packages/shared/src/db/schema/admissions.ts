import { pgTable, uuid, varchar, text, timestamp, date, integer, pgEnum, unique, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const levelCategoryEnum = pgEnum('level_category', ['PPE', 'PRIMARY', 'LOWER_PRIMARY', 'UPPER_PRIMARY', 'JUNIOR']);
export const studentStatusEnum = pgEnum('student_status', ['PENDING', 'ACTIVE', 'TRANSFERRED', 'EXPELLED', 'GRADUATED']);
export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE']);

export const guardians = pgTable('guardians', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  idNumber: varchar('id_number', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  emergencyContact: varchar('emergency_contact', { length: 20 }),
  relationship: varchar('relationship', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('guardians_phone_number_idx').on(table.phoneNumber),
  index('guardians_created_at_idx').on(table.createdAt),
]);

export const classes = pgTable('classes', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(), // e.g. Grade 1, Grade 7, PPE 1
  levelCategory: levelCategoryEnum('level_category').notNull(),
  numericOrder: integer('numeric_order').notNull(),
  classTeacherId: uuid('class_teacher_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('classes_class_teacher_id_idx').on(table.classTeacherId),
  index('classes_numeric_order_idx').on(table.numericOrder),
]);

export const students = pgTable('students', {
  id: uuid('id').defaultRandom().primaryKey(),
  assessmentNumber: varchar('assessment_number', { length: 50 }).notNull().unique(),
  admissionNumber: varchar('admission_number', { length: 50 }), // Optional fallback
  firstName: varchar('first_name', { length: 100 }).notNull(),
  middleName: varchar('middle_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  gender: genderEnum('gender').notNull(),
  previousGrade: varchar('previous_grade', { length: 50 }),
  classId: uuid('class_id').notNull().references(() => classes.id),
  primaryGuardianId: uuid('primary_guardian_id').notNull().references(() => guardians.id),
  admissionDate: date('admission_date').notNull(),
  approvedById: uuid('approved_by_id').references(() => users.id),
  status: studentStatusEnum('status').default('PENDING').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('students_class_id_idx').on(table.classId),
  index('students_primary_guardian_id_idx').on(table.primaryGuardianId),
  index('students_assessment_number_idx').on(table.assessmentNumber),
  index('students_status_idx').on(table.status),
  index('students_first_name_last_name_idx').on(table.firstName, table.lastName),
]);

export const secondaryGuardians = pgTable('secondary_guardians', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  guardianId: uuid('guardian_id').notNull().references(() => guardians.id, { onDelete: 'cascade' }),
  relationship: varchar('relationship', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  unique('student_guardian_uq').on(table.studentId, table.guardianId),
  index('secondary_guardians_student_id_idx').on(table.studentId),
  index('secondary_guardians_guardian_id_idx').on(table.guardianId),
]);

export const subjects = pgTable('subjects', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  levelCategory: levelCategoryEnum('level_category').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('subjects_code_idx').on(table.code),
  index('subjects_level_category_idx').on(table.levelCategory),
]);

export const teacherSubjectAllocations = pgTable('teacher_subject_allocations', {
  id: uuid('id').defaultRandom().primaryKey(),
  teacherId: uuid('teacher_id').notNull().references(() => users.id),
  classId: uuid('class_id').notNull().references(() => classes.id),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id),
  academicYear: integer('academic_year').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  unique('teacher_alloc_uq').on(table.teacherId, table.classId, table.subjectId, table.academicYear),
  index('teacher_alloc_teacher_id_idx').on(table.teacherId),
  index('teacher_alloc_class_id_idx').on(table.classId),
  index('teacher_alloc_subject_id_idx').on(table.subjectId),
]);
