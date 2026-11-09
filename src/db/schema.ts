import { relations } from 'drizzle-orm';
import {
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// 1. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or generated system UID
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  accountNumber: text('account_number').notNull().unique(),
  routingNumber: text('routing_number').notNull().default('021000021'),
  avatarUrl: text('avatar_url'),
  role: text('role').notNull().default('customer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Bank Accounts Table (Checking, Savings, Investment)
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  accountType: text('account_type').notNull(), // 'checking' | 'savings' | 'investment'
  accountNumber: text('account_number').notNull().unique(),
  balance: numeric('balance', { precision: 14, scale: 2 }).notNull().default('0.00'),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull().default('active'), // 'active' | 'frozen' | 'closed'
  dailyLimit: numeric('daily_limit', { precision: 14, scale: 2 }).notNull().default('10000.00'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Transactions Ledger
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  referenceId: text('reference_id').notNull().unique(),
  fromAccountId: integer('from_account_id').references(() => accounts.id),
  toAccountId: integer('to_account_id').references(() => accounts.id),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  fee: numeric('fee', { precision: 14, scale: 2 }).notNull().default('0.00'),
  type: text('type').notNull(), // 'transfer' | 'deposit' | 'withdrawal' | 'bill_pay'
  category: text('category').notNull().default('Transfer'),
  description: text('description').notNull(),
  status: text('status').notNull().default('completed'), // 'pending' | 'completed' | 'failed'
  balanceAfterFrom: numeric('balance_after_from', { precision: 14, scale: 2 }),
  balanceAfterTo: numeric('balance_after_to', { precision: 14, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Audit & Security Logs (stored efficiently for compliance)
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(), // 'TRANSFER_COMPLETED', 'AUTH_LOGIN', etc.
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  status: text('status').notNull(), // 'SUCCESS' | 'WARNING' | 'FAILED'
  details: text('details').notNull(), // JSON string
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Saved Beneficiaries / Recipients
export const recipients = pgTable('recipients', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  accountNumber: text('account_number').notNull(),
  bankName: text('bank_name').notNull().default('ApexVault'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  auditLogs: many(auditLogs),
  recipients: many(recipients),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  outgoingTransactions: many(transactions, { relationName: 'fromAccount' }),
  incomingTransactions: many(transactions, { relationName: 'toAccount' }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  fromAccount: one(accounts, {
    fields: [transactions.fromAccountId],
    references: [accounts.id],
    relationName: 'fromAccount',
  }),
  toAccount: one(accounts, {
    fields: [transactions.toAccountId],
    references: [accounts.id],
    relationName: 'toAccount',
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const recipientsRelations = relations(recipients, ({ one }) => ({
  user: one(users, {
    fields: [recipients.userId],
    references: [users.id],
  }),
}));
