import { z } from 'zod';

// User management schemas
export const userRoleSchema = z.enum(['admin', 'technician']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string(),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Customer management schemas
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  address: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Customer = z.infer<typeof customerSchema>;

export const createCustomerInputSchema = z.object({
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  address: z.string().nullable()
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

export const updateCustomerInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional()
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;

// Product/Stock management schemas
export const productTypeSchema = z.enum(['sparepart', 'accessory']);
export type ProductType = z.infer<typeof productTypeSchema>;

export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  type: productTypeSchema,
  price: z.number(),
  stock_quantity: z.number().int(),
  minimum_stock: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

export const createProductInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  type: productTypeSchema,
  price: z.number().positive(),
  stock_quantity: z.number().int().nonnegative(),
  minimum_stock: z.number().int().nonnegative()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  type: productTypeSchema.optional(),
  price: z.number().positive().optional(),
  stock_quantity: z.number().int().nonnegative().optional(),
  minimum_stock: z.number().int().nonnegative().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Stock movement schemas
export const stockMovementTypeSchema = z.enum(['in', 'out']);
export type StockMovementType = z.infer<typeof stockMovementTypeSchema>;

export const stockMovementSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  type: stockMovementTypeSchema,
  quantity: z.number().int(),
  price_per_unit: z.number().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  created_by: z.number()
});

export type StockMovement = z.infer<typeof stockMovementSchema>;

export const createStockMovementInputSchema = z.object({
  product_id: z.number(),
  type: stockMovementTypeSchema,
  quantity: z.number().int().positive(),
  price_per_unit: z.number().nullable(),
  notes: z.string().nullable()
});

export type CreateStockMovementInput = z.infer<typeof createStockMovementInputSchema>;

// Service management schemas
export const serviceStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
export type ServiceStatus = z.infer<typeof serviceStatusSchema>;

export const serviceSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  device_type: z.string(),
  device_brand: z.string().nullable(),
  device_model: z.string().nullable(),
  problem_description: z.string(),
  diagnosis: z.string().nullable(),
  repair_actions: z.string().nullable(),
  status: serviceStatusSchema,
  estimated_cost: z.number().nullable(),
  actual_cost: z.number().nullable(),
  technician_id: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable()
});

export type Service = z.infer<typeof serviceSchema>;

export const createServiceInputSchema = z.object({
  customer_id: z.number(),
  device_type: z.string(),
  device_brand: z.string().nullable(),
  device_model: z.string().nullable(),
  problem_description: z.string(),
  estimated_cost: z.number().nullable()
});

export type CreateServiceInput = z.infer<typeof createServiceInputSchema>;

export const updateServiceInputSchema = z.object({
  id: z.number(),
  diagnosis: z.string().optional(),
  repair_actions: z.string().optional(),
  status: serviceStatusSchema.optional(),
  actual_cost: z.number().optional(),
  technician_id: z.number().optional()
});

export type UpdateServiceInput = z.infer<typeof updateServiceInputSchema>;

// Transaction schemas
export const transactionTypeSchema = z.enum(['sale', 'service']);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const transactionSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  type: transactionTypeSchema,
  service_id: z.number().nullable(),
  total_amount: z.number(),
  paid_amount: z.number(),
  payment_method: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  created_by: z.number()
});

export type Transaction = z.infer<typeof transactionSchema>;

export const createTransactionInputSchema = z.object({
  customer_id: z.number(),
  type: transactionTypeSchema,
  service_id: z.number().nullable(),
  total_amount: z.number().positive(),
  paid_amount: z.number().nonnegative(),
  payment_method: z.string().nullable(),
  notes: z.string().nullable()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Transaction items schemas
export const transactionItemSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int(),
  unit_price: z.number(),
  total_price: z.number()
});

export type TransactionItem = z.infer<typeof transactionItemSchema>;

export const createTransactionItemInputSchema = z.object({
  transaction_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive()
});

export type CreateTransactionItemInput = z.infer<typeof createTransactionItemInputSchema>;

// Report schemas
export const financialReportSchema = z.object({
  period: z.string(),
  total_revenue: z.number(),
  service_revenue: z.number(),
  sales_revenue: z.number(),
  total_transactions: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date()
});

export type FinancialReport = z.infer<typeof financialReportSchema>;

export const stockReportSchema = z.object({
  product_id: z.number(),
  product_name: z.string(),
  current_stock: z.number(),
  minimum_stock: z.number(),
  stock_in: z.number(),
  stock_out: z.number(),
  stock_value: z.number(),
  is_low_stock: z.boolean()
});

export type StockReport = z.infer<typeof stockReportSchema>;

export const reportPeriodSchema = z.enum(['daily', 'weekly', 'monthly']);
export type ReportPeriod = z.infer<typeof reportPeriodSchema>;

export const getFinancialReportInputSchema = z.object({
  period: reportPeriodSchema,
  start_date: z.string(),
  end_date: z.string()
});

export type GetFinancialReportInput = z.infer<typeof getFinancialReportInputSchema>;