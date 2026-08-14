import { pgTable, uuid, varchar, text, timestamp, date, integer, boolean, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const checkoutStatusEnum = pgEnum('checkout_status', ['CHECKED_OUT', 'RETURNED', 'OVERDUE', 'LOST']);
export const leaveStatusEnum = pgEnum('leave_status', ['PENDING', 'APPROVED', 'REJECTED']);

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(), // Textbooks, Brooms, Dustbins, Classroom Accessories, Equipment
  description: text('description'),
  totalQuantity: integer('total_quantity').default(1).notNull(),
  availableQuantity: integer('available_quantity').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('inventory_items_category_idx').on(table.category),
]);

export const inventoryCheckouts = pgTable('inventory_checkouts', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemId: uuid('item_id').notNull().references(() => inventoryItems.id, { onDelete: 'cascade' }),
  checkedOutTo: varchar('checked_out_to', { length: 150 }).notNull(), // Teacher name, class, or department
  quantity: integer('quantity').default(1).notNull(),
  checkoutDate: date('checkout_date').notNull(),
  expectedReturnDate: date('expected_return_date'),
  actualReturnDate: date('actual_return_date'),
  status: checkoutStatusEnum('status').default('CHECKED_OUT').notNull(),
  notes: text('notes'),
  checkedOutById: uuid('checked_out_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('inventory_checkouts_item_id_idx').on(table.itemId),
  index('inventory_checkouts_status_idx').on(table.status),
]);

export const teacherLeaveRequests = pgTable('teacher_leave_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  teacherId: uuid('teacher_id').notNull().references(() => users.id),
  leaveType: varchar('leave_type', { length: 50 }).notNull(), // PERSONAL, MEDICAL, OFFICIAL, OTHER
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  reason: text('reason').notNull(),
  status: leaveStatusEnum('status').default('PENDING').notNull(),
  approvedById: uuid('approved_by_id').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true, mode: 'date' }),
  documentUrl: text('document_url'), // Generated printable leave-out document
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('teacher_leave_requests_teacher_id_idx').on(table.teacherId),
  index('teacher_leave_requests_status_idx').on(table.status),
]);

export const schoolEvents = pgTable('school_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  eventType: varchar('event_type', { length: 50 }).notNull(), // PARENT_MEETING, STAFF_MEETING, ACADEMIC_MEETING, SCHOOL_EVENT, DEADLINE
  eventDate: date('event_date').notNull(),
  startTime: varchar('start_time', { length: 20 }),
  endTime: varchar('end_time', { length: 20 }),
  location: varchar('location', { length: 150 }),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('school_events_event_date_idx').on(table.eventDate),
]);

export const meetingRecords = pgTable('meeting_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').references(() => schoolEvents.id),
  title: varchar('title', { length: 200 }).notNull(),
  meetingDate: date('meeting_date').notNull(),
  agenda: text('agenda'),
  minutes: text('minutes'),
  decisions: text('decisions'),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});

export const meetingAttendees = pgTable('meeting_attendees', {
  id: uuid('id').defaultRandom().primaryKey(),
  meetingId: uuid('meeting_id').notNull().references(() => meetingRecords.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  attended: boolean('attended').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const meetingActionItems = pgTable('meeting_action_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  meetingId: uuid('meeting_id').notNull().references(() => meetingRecords.id, { onDelete: 'cascade' }),
  assignedToId: uuid('assigned_to_id').references(() => users.id),
  description: text('description').notNull(),
  dueDate: date('due_date'),
  isCompleted: boolean('is_completed').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
});
