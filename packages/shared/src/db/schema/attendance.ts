import { pgTable, uuid, varchar, text, timestamp, date, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { classes, students, guardians } from './admissions';

export const attendanceStatusEnum = pgEnum('attendance_status', ['PRESENT', 'ABSENT', 'EXCUSED', 'LATE']);
export const smsStatusEnum = pgEnum('sms_status', ['SENT', 'FAILED', 'PENDING']);

export const attendanceRegisters = pgTable('attendance_registers', {
  id: uuid('id').defaultRandom().primaryKey(),
  classId: uuid('class_id').notNull().references(() => classes.id),
  date: date('date').notNull(),
  takenById: uuid('taken_by_id').notNull().references(() => users.id),
  isSubmitted: boolean('is_submitted').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const attendanceRecords = pgTable('attendance_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  registerId: uuid('register_id').notNull().references(() => attendanceRegisters.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id),
  status: attendanceStatusEnum('status').notNull(),
  remarks: text('remarks'),
});

export const absenceSmsLogs = pgTable('absence_sms_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').notNull().references(() => students.id),
  guardianId: uuid('guardian_id').notNull().references(() => guardians.id),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  consecutiveAbsences: integer('consecutive_absences').notNull(),
  smsMessage: text('sms_message').notNull(),
  status: smsStatusEnum('status').default('PENDING').notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
});
