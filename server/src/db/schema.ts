import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'technician', 'staff']);
export const productTypeEnum = pgEnum('product_type', ['sparepart', 'accessory', 'other']);
export const stockMovementTypeEnum = pgEnum('stock_movement_type', ['in', 'out']);
export const serviceStatusEnum = pgEnum('service_status', ['pending', 'in_progress', 'completed', 'cancelled']);
export const transactionTypeEnum = pgEnum('transaction_type', ['sale', 'service']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Customers table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Products table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: productTypeEnum('type').notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  stock_quantity: integer('stock_quantity').notNull().default(0),
  minimum_stock: integer('minimum_stock').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Stock movements table
export const stockMovementsTable = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').notNull(),
  type: stockMovementTypeEnum('type').notNull(),
  quantity: integer('quantity').notNull(),
  price_per_unit: numeric('price_per_unit', { precision: 12, scale: 2 }),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  created_by: integer('created_by').notNull(),
});

// Services table
export const servicesTable = pgTable('services', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').notNull(),
  device_type: text('device_type').notNull(),
  device_brand: text('device_brand'),
  device_model: text('device_model'),
  problem_description: text('problem_description').notNull(),
  diagnosis: text('diagnosis'),
  repair_actions: text('repair_actions'),
  status: serviceStatusEnum('status').notNull().default('pending'),
  estimated_cost: numeric('estimated_cost', { precision: 12, scale: 2 }),
  actual_cost: numeric('actual_cost', { precision: 12, scale: 2 }),
  technician_id: integer('technician_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id').notNull(),
  type: transactionTypeEnum('type').notNull(),
  service_id: integer('service_id'),
  total_amount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  paid_amount: numeric('paid_amount', { precision: 12, scale: 2 }).notNull(),
  payment_method: text('payment_method'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  created_by: integer('created_by').notNull(),
});

// Transaction items table
export const transactionItemsTable = pgTable('transaction_items', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').notNull(),
  product_id: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 12, scale: 2 }).notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  stockMovements: many(stockMovementsTable),
  services: many(servicesTable),
  transactions: many(transactionsTable),
}));

export const customersRelations = relations(customersTable, ({ many }) => ({
  services: many(servicesTable),
  transactions: many(transactionsTable),
}));

export const productsRelations = relations(productsTable, ({ many }) => ({
  stockMovements: many(stockMovementsTable),
  transactionItems: many(transactionItemsTable),
}));

export const stockMovementsRelations = relations(stockMovementsTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [stockMovementsTable.product_id],
    references: [productsTable.id],
  }),
  user: one(usersTable, {
    fields: [stockMovementsTable.created_by],
    references: [usersTable.id],
  }),
}));

export const servicesRelations = relations(servicesTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [servicesTable.customer_id],
    references: [customersTable.id],
  }),
  technician: one(usersTable, {
    fields: [servicesTable.technician_id],
    references: [usersTable.id],
  }),
  transactions: many(transactionsTable),
}));

export const transactionsRelations = relations(transactionsTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [transactionsTable.customer_id],
    references: [customersTable.id],
  }),
  service: one(servicesTable, {
    fields: [transactionsTable.service_id],
    references: [servicesTable.id],
  }),
  createdBy: one(usersTable, {
    fields: [transactionsTable.created_by],
    references: [usersTable.id],
  }),
  items: many(transactionItemsTable),
}));

export const transactionItemsRelations = relations(transactionItemsTable, ({ one }) => ({
  transaction: one(transactionsTable, {
    fields: [transactionItemsTable.transaction_id],
    references: [transactionsTable.id],
  }),
  product: one(productsTable, {
    fields: [transactionItemsTable.product_id],
    references: [productsTable.id],
  }),
}));

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  customers: customersTable,
  products: productsTable,
  stockMovements: stockMovementsTable,
  services: servicesTable,
  transactions: transactionsTable,
  transactionItems: transactionItemsTable,
};