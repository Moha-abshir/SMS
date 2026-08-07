import { pgTable, uuid, varchar, text, boolean, timestamp, decimal, primaryKey, integer, index } from 'drizzle-orm/pg-core';

export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(), // HEAD_TEACHER, DEPUTY_HEAD, DOS, BURSAR, SECRETARY, CLASS_TEACHER, SUBJECT_TEACHER
  description: text('description'),
  isSystemDefault: boolean('is_system_default').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});

export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(), // e.g. students:create, reports:lock
  category: varchar('category', { length: 50 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.roleId, table.permissionId] }),
  index('role_permissions_role_id_idx').on(table.roleId),
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  middleName: varchar('middle_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  nationalId: varchar('national_id', { length: 50 }).notNull().unique(),
  address: text('address'),
  tscNumber: varchar('tsc_number', { length: 50 }).unique(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull().unique(),
  dateOfEmployment: timestamp('date_of_employment', { withTimezone: true, mode: 'date' }),
  salaryAmount: decimal('salary_amount', { precision: 10, scale: 2 }),
  salaryPaymentDay: integer('salary_payment_day'),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  isActive: boolean('is_active').default(true).notNull(),
  twoFactorOtp: varchar('two_factor_otp', { length: 10 }),
  twoFactorExpiresAt: timestamp('two_factor_expires_at', { withTimezone: true, mode: 'date' }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  createdBy: uuid('created_by'), // Will manually link to avoid circular reference issues if any, but Drizzle supports self-referencing. Wait, let me add it.
  updatedBy: uuid('updated_by'),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('users_role_id_idx').on(table.roleId),
  index('users_is_active_idx').on(table.isActive),
  index('users_created_at_idx').on(table.createdAt),
]);

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('refresh_tokens_user_id_idx').on(table.userId),
  index('refresh_tokens_expires_at_idx').on(table.expiresAt),
]);

export const invitations = pgTable('invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  middleName: varchar('middle_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  nationalId: varchar('national_id', { length: 50 }).notNull(),
  address: text('address'),
  tscNumber: varchar('tsc_number', { length: 50 }),
  salaryAmount: decimal('salary_amount', { precision: 10, scale: 2 }),
  salaryPaymentDay: integer('salary_payment_day'),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  invitedBy: uuid('invited_by').notNull().references(() => users.id),
  invitationTokenHash: text('invitation_token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true, mode: 'date' }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true, mode: 'date' }),
  status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, ACCEPTED, EXPIRED, CANCELLED
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().$onUpdateFn(() => new Date()).notNull(),
}, (table) => [
  index('invitations_role_id_idx').on(table.roleId),
  index('invitations_invited_by_idx').on(table.invitedBy),
  index('invitations_status_idx').on(table.status),
  index('invitations_created_at_idx').on(table.createdAt),
  index('invitations_email_idx').on(table.email),
  index('invitations_token_hash_idx').on(table.invitationTokenHash),
]);
