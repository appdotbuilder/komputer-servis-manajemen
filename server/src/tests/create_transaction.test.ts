import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, customersTable, servicesTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

// Test customer data
const testCustomer = {
  name: 'Test Customer',
  phone: '123-456-7890',
  email: 'test@example.com',
  address: '123 Test Street'
};

// Test service data
const testService = {
  customer_id: 0, // Will be set after customer creation
  device_type: 'Smartphone',
  device_brand: 'Samsung',
  device_model: 'Galaxy S21',
  problem_description: 'Screen broken',
  estimated_cost: 150.00
};

// Test transaction inputs
const saleTransactionInput: CreateTransactionInput = {
  customer_id: 0, // Will be set after customer creation
  type: 'sale',
  service_id: null,
  total_amount: 299.99,
  paid_amount: 299.99,
  payment_method: 'cash',
  notes: 'Product sale transaction'
};

const serviceTransactionInput: CreateTransactionInput = {
  customer_id: 0, // Will be set after customer creation
  type: 'service',
  service_id: 0, // Will be set after service creation
  total_amount: 150.00,
  paid_amount: 100.00,
  payment_method: 'card',
  notes: 'Service payment - partial'
};

describe('createTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a sale transaction successfully', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    // Update transaction input with real customer ID
    const input = { ...saleTransactionInput, customer_id: customerId };

    const result = await createTransaction(input);

    // Verify transaction fields
    expect(result.customer_id).toEqual(customerId);
    expect(result.type).toEqual('sale');
    expect(result.service_id).toBeNull();
    expect(result.total_amount).toEqual(299.99);
    expect(result.paid_amount).toEqual(299.99);
    expect(result.payment_method).toEqual('cash');
    expect(result.notes).toEqual('Product sale transaction');
    expect(result.created_by).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify numeric types
    expect(typeof result.total_amount).toBe('number');
    expect(typeof result.paid_amount).toBe('number');
  });

  it('should create a service transaction successfully', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    // Create prerequisite service
    const serviceData = { ...testService, customer_id: customerId };
    const serviceResult = await db.insert(servicesTable)
      .values({
        ...serviceData,
        estimated_cost: serviceData.estimated_cost.toString()
      })
      .returning()
      .execute();
    const serviceId = serviceResult[0].id;

    // Update transaction input with real IDs
    const input = {
      ...serviceTransactionInput,
      customer_id: customerId,
      service_id: serviceId
    };

    const result = await createTransaction(input);

    // Verify transaction fields
    expect(result.customer_id).toEqual(customerId);
    expect(result.type).toEqual('service');
    expect(result.service_id).toEqual(serviceId);
    expect(result.total_amount).toEqual(150.00);
    expect(result.paid_amount).toEqual(100.00);
    expect(result.payment_method).toEqual('card');
    expect(result.notes).toEqual('Service payment - partial');
    expect(result.created_by).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify numeric types
    expect(typeof result.total_amount).toBe('number');
    expect(typeof result.paid_amount).toBe('number');
  });

  it('should save transaction to database correctly', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    const input = { ...saleTransactionInput, customer_id: customerId };
    const result = await createTransaction(input);

    // Query database to verify transaction was saved
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    const savedTransaction = transactions[0];
    expect(savedTransaction.customer_id).toEqual(customerId);
    expect(savedTransaction.type).toEqual('sale');
    expect(savedTransaction.service_id).toBeNull();
    expect(parseFloat(savedTransaction.total_amount)).toEqual(299.99);
    expect(parseFloat(savedTransaction.paid_amount)).toEqual(299.99);
    expect(savedTransaction.payment_method).toEqual('cash');
    expect(savedTransaction.notes).toEqual('Product sale transaction');
    expect(savedTransaction.created_by).toEqual(1);
    expect(savedTransaction.created_at).toBeInstanceOf(Date);
  });

  it('should throw error when customer does not exist', async () => {
    const input = { ...saleTransactionInput, customer_id: 99999 };

    await expect(createTransaction(input)).rejects.toThrow(/customer with id 99999 not found/i);
  });

  it('should throw error when service does not exist', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    const input = {
      ...serviceTransactionInput,
      customer_id: customerId,
      service_id: 99999
    };

    await expect(createTransaction(input)).rejects.toThrow(/service with id 99999 not found/i);
  });

  it('should handle null service_id for sale transactions', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    const input = {
      customer_id: customerId,
      type: 'sale' as const,
      service_id: null,
      total_amount: 49.99,
      paid_amount: 49.99,
      payment_method: 'cash',
      notes: null
    };

    const result = await createTransaction(input);

    expect(result.service_id).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.type).toEqual('sale');
    expect(result.total_amount).toEqual(49.99);
  });

  it('should handle partial payments correctly', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    const input = {
      customer_id: customerId,
      type: 'sale' as const,
      service_id: null,
      total_amount: 100.00,
      paid_amount: 25.50,
      payment_method: 'card',
      notes: 'Partial payment - customer will pay remainder later'
    };

    const result = await createTransaction(input);

    expect(result.total_amount).toEqual(100.00);
    expect(result.paid_amount).toEqual(25.50);
    expect(result.total_amount > result.paid_amount).toBe(true);
  });
});