import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: uuid('actor_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  entityName: varchar('entity_name', { length: 50 }).notNull(),
  entityId: uuid('entity_id'),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  userIdentifier: varchar('user_identifier', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('audit_logs_actor_id_idx').on(table.actorId),
  index('audit_logs_entity_name_entity_id_idx').on(table.entityName, table.entityId),
  index('audit_logs_created_at_idx').on(table.createdAt),
]);

export const systemSettings = pgTable('system_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolName: varchar('school_name', { length: 250 }).default('Eldoret Muslim Academy').notNull(),
  schoolMotto: varchar('school_motto', { length: 250 }).default('Excellence in Knowledge & Virtue'),
  contactPhone: varchar('contact_phone', { length: 50 }),
  contactEmail: varchar('contact_email', { length: 100 }),
  address: text('address'),
  poBox: varchar('po_box', { length: 100 }),
  county: varchar('county', { length: 100 }).default('Uasin Gishu'),
  logoUrl: text('logo_url'),
  absenceSmsThreshold: integer('absence_sms_threshold').default(3).notNull(),
  currentAcademicYear: integer('current_academic_year').default(2026).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});

export const officialLetters = pgTable('official_letters', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  recipientName: varchar('recipient_name', { length: 150 }),
  recipientAddress: text('recipient_address'),
  body: text('body').notNull(),
  letterDate: timestamp('letter_date', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  status: varchar('status', { length: 50 }).default('DRAFT').notNull(), // DRAFT, FINALIZED
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('official_letters_created_by_idx').on(table.createdById),
  index('official_letters_letter_date_idx').on(table.letterDate),
]);
