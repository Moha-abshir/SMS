import { pgTable, uuid, varchar, text, timestamp, integer, boolean, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { classes, subjects } from './admissions.js';

export interface TimetableBreak {
  id: string;
  name: string;
  startTime: string; // "10:00"
  endTime: string;   // "10:30"
  days: string[];    // ["ALL"] or ["MONDAY", "TUESDAY", ...]
}

export interface FridaySpecialSchedule {
  isSpecial: boolean;
  jummahBreakStart: string;     // e.g. "12:30"
  afternoonReturnTime: string;  // e.g. "14:00"
  afternoonDismissalTime: string;// e.g. "15:30"
}

export interface TimetableCoCurricular {
  id: string;
  name: string;      // e.g. "Games & Sports"
  day: string;       // "THURSDAY"
  periodIndex: number;
  classIds: string[];
}

export interface SubjectLessonRequirement {
  lessonsPerWeek: number;
  doubleLessonsCount: number;
}

export interface TimetableTeacherConstraints {
  maxConsecutiveLessons?: number; // e.g. 3
  minFreePeriodsPerWeek?: number; // e.g. 5
  specialStaffLimits?: Record<string, number>; // userId -> maxLessonsPerWeek (or undefined/empty if unrestricted)
}

export const timetableSettings = pgTable('timetable_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  academicYear: integer('academic_year').notNull(),
  term: integer('term').notNull(),
  schoolDays: jsonb('school_days').$type<string[]>().notNull(),
  startTime: varchar('start_time', { length: 10 }).notNull(), // "08:00"
  endTime: varchar('end_time', { length: 10 }).notNull(),     // "15:40"
  lessonDurationMinutes: integer('lesson_duration_minutes').notNull(), // 40
  breaks: jsonb('breaks').$type<TimetableBreak[]>().notNull(),
  fridaySchedule: jsonb('friday_schedule').$type<FridaySpecialSchedule>(),
  coCurriculars: jsonb('co_curriculars').$type<TimetableCoCurricular[]>(),
  subjectRequirements: jsonb('subject_requirements').$type<Record<string, Record<string, SubjectLessonRequirement>>>(),
  teacherConstraints: jsonb('teacher_constraints').$type<TimetableTeacherConstraints>(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  unique('timetable_settings_year_term_uq').on(table.academicYear, table.term),
  index('timetable_settings_active_idx').on(table.isActive),
]);

export const timetableSlots = pgTable('timetable_slots', {
  id: uuid('id').defaultRandom().primaryKey(),
  academicYear: integer('academic_year').notNull(),
  term: integer('term').notNull(),
  classId: uuid('class_id').notNull().references(() => classes.id),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id),
  teacherId: uuid('teacher_id').notNull().references(() => users.id),
  dayOfWeek: varchar('day_of_week', { length: 15 }).notNull(), // 'MONDAY', 'TUESDAY', ...
  periodIndex: integer('period_index').notNull(),               // 1, 2, 3...
  startTime: varchar('start_time', { length: 10 }).notNull(),   // "08:00"
  endTime: varchar('end_time', { length: 10 }).notNull(),       // "08:40"
  isDoubleLesson: boolean('is_double_lesson').default(false).notNull(),
  doubleLessonPart: integer('double_lesson_part'),              // 1 or 2
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('timetable_slots_class_lookup_idx').on(table.academicYear, table.term, table.classId),
  index('timetable_slots_teacher_lookup_idx').on(table.academicYear, table.term, table.teacherId),
  unique('timetable_slots_class_day_period_uq').on(table.academicYear, table.term, table.classId, table.dayOfWeek, table.periodIndex),
]);
