import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, customersTable, usersTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { getTransaction } from '../handlers/get_transaction';
import { eq } from 'drizzle-orm';

// Test data
const testCustomer = {
  name: 'Test Customer',
  phone: '+1234567890',
  email: 'test@example.com',
  address: '123 Test Street'
};

const testUser = {
  username: 'testuser',
  email: 'user@example.com',
  password_hash: 'hashedpassword',
  full_name: 'Test User',
  role: 'admin' as const,
  is_active: true
};

const testTransactionInput: CreateTransactionInput = {
  customer_id: 0, // Will be set after customer creation
  type: 'sale',
  service_id: null,
  total_amount: 150.75,
  paid_amount: 100.50,
  payment_method: 'cash',
  notes: 'Test transaction'
};

describe('getTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a transaction when it exists', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransactionInput,
        customer_id: customerId,
        total_amount: testTransactionInput.total_amount.toString(),
        paid_amount: testTransactionInput.paid_amount.toString(),
        created_by: userId
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Test the handler
    const result = await getTransaction(transactionId);

    // Verify result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(transactionId);
    expect(result!.customer_id).toEqual(customerId);
    expect(result!.type).toEqual('sale');
    expect(result!.service_id).toBeNull();
    expect(result!.total_amount).toEqual(150.75);
    expect(result!.paid_amount).toEqual(100.50);
    expect(result!.payment_method).toEqual('cash');
    expect(result!.notes).toEqual('Test transaction');
    expect(result!.created_by).toEqual(userId);
    expect(result!.created_at).toBeInstanceOf(Date);

    // Verify numeric field types
    expect(typeof result!.total_amount).toBe('number');
    expect(typeof result!.paid_amount).toBe('number');
  });

  it('should return null when transaction does not exist', async () => {
    const result = await getTransaction(99999);
    expect(result).toBeNull();
  });

  it('should handle service-type transactions', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create service transaction
    const serviceTransactionInput = {
      ...testTransactionInput,
      type: 'service' as const,
      service_id: 123,
      customer_id: customerId,
      total_amount: 200.00,
      paid_amount: 200.00,
      payment_method: 'card',
      notes: 'Service payment'
    };

    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...serviceTransactionInput,
        total_amount: serviceTransactionInput.total_amount.toString(),
        paid_amount: serviceTransactionInput.paid_amount.toString(),
        created_by: userId
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Test the handler
    const result = await getTransaction(transactionId);

    // Verify service-specific fields
    expect(result).not.toBeNull();
    expect(result!.type).toEqual('service');
    expect(result!.service_id).toEqual(123);
    expect(result!.total_amount).toEqual(200.00);
    expect(result!.paid_amount).toEqual(200.00);
    expect(result!.payment_method).toEqual('card');
    expect(result!.notes).toEqual('Service payment');
  });

  it('should verify transaction is saved correctly in database', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransactionInput,
        customer_id: customerId,
        total_amount: testTransactionInput.total_amount.toString(),
        paid_amount: testTransactionInput.paid_amount.toString(),
        created_by: userId
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Get transaction using handler
    const handlerResult = await getTransaction(transactionId);

    // Verify against direct database query
    const directQuery = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(directQuery).toHaveLength(1);
    const dbTransaction = directQuery[0];

    // Compare handler result with database data
    expect(handlerResult!.id).toEqual(dbTransaction.id);
    expect(handlerResult!.customer_id).toEqual(dbTransaction.customer_id);
    expect(handlerResult!.type).toEqual(dbTransaction.type);
    expect(handlerResult!.total_amount).toEqual(parseFloat(dbTransaction.total_amount));
    expect(handlerResult!.paid_amount).toEqual(parseFloat(dbTransaction.paid_amount));
    expect(handlerResult!.created_at).toEqual(dbTransaction.created_at);
  });

  it('should handle transactions with null optional fields', async () => {
    // Create prerequisite data
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    const customerId = customerResult[0].id;

    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create transaction with null optional fields
    const minimalTransactionInput = {
      customer_id: customerId,
      type: 'sale' as const,
      service_id: null,
      total_amount: '75.25',
      paid_amount: '75.25',
      payment_method: null,
      notes: null,
      created_by: userId
    };

    const transactionResult = await db.insert(transactionsTable)
      .values(minimalTransactionInput)
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Test the handler
    const result = await getTransaction(transactionId);

    // Verify null fields are handled correctly
    expect(result).not.toBeNull();
    expect(result!.service_id).toBeNull();
    expect(result!.payment_method).toBeNull();
    expect(result!.notes).toBeNull();
    expect(result!.total_amount).toEqual(75.25);
    expect(result!.paid_amount).toEqual(75.25);
  });
});