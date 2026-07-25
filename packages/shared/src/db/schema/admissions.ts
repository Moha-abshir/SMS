import { pgTable, uuid, varchar, text, timestamp, date, integer, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const levelCategoryEnum = pgEnum('level_category', ['PRIMARY', 'JUNIOR', 'PPE']);
export const studentStatusEnum = pgEnum('student_status', ['ACTIVE', 'TRANSFERRED', 'EXPELLED', 'GRADUATED']);

export const guardians = pgTable('guardians', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullName: varchar('full_name', { length: 150 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  idNumber: varchar('id_number', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  deletedAt: timestamp('deleted_at'),
});

export const classes = pgTable('classes', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(), // e.g. Grade 1, Grade 7, PPE 1
  levelCategory: levelCategoryEnum('level_category').notNull(),
  numericOrder: integer('numeric_order').notNull(),
  classTeacherId: uuid('class_teacher_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const students = pgTable('students', {
  id: uuid('id').defaultRandom().primaryKey(),
  admissionNumber: varchar('admission_number', { length: 50 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  middleName: varchar('middle_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  gender: varchar('gender', { length: 10 }).notNull(), // MALE, FEMALE
  assessmentNumber: varchar('assessment_number', { length: 50 }),
  previousGrade: varchar('previous_grade', { length: 50 }),
  classId: uuid('class_id').notNull().references(() => classes.id),
  primaryGuardianId: uuid('primary_guardian_id').notNull().references(() => guardians.id),
  admissionDate: date('admission_date').notNull(),
  status: studentStatusEnum('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  deletedAt: timestamp('deleted_at'),
});

export const secondaryGuardians = pgTable('secondary_guardians', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  guardianId: uuid('guardian_id').notNull().references(() => guardians.id, { onDelete: 'cascade' }),
  relationship: varchar('relationship', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const subjects = pgTable('subjects', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  levelCategory: levelCategoryEnum('level_category').notNull(),
});

export const teacherSubjectAllocations = pgTable('teacher_subject_allocations', {
  id: uuid('id').defaultRandom().primaryKey(),
  teacherId: uuid('teacher_id').notNull().references(() => users.id),
  classId: uuid('class_id').notNull().references(() => classes.id),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id),
  academicYear: integer('academic_year').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
