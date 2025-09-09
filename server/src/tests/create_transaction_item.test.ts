import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionItemsTable, productsTable, customersTable, transactionsTable, usersTable } from '../db/schema';
import { type CreateTransactionItemInput } from '../schema';
import { createTransactionItem } from '../handlers/create_transaction_item';
import { eq } from 'drizzle-orm';

describe('createTransactionItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testCustomerId: number;
  let testUserId: number;
  let testProductId: number;
  let testTransactionId: number;

  beforeEach(async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();
    testUserId = user[0].id;

    // Create test customer
    const customer = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '123-456-7890',
        email: 'customer@example.com',
        address: '123 Test Street'
      })
      .returning()
      .execute();
    testCustomerId = customer[0].id;

    // Create test product with stock
    const product = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        type: 'sparepart',
        price: '25.99',
        stock_quantity: 10,
        minimum_stock: 2
      })
      .returning()
      .execute();
    testProductId = product[0].id;

    // Create test transaction
    const transaction = await db.insert(transactionsTable)
      .values({
        customer_id: testCustomerId,
        type: 'sale',
        service_id: null,
        total_amount: '0.00', // Will be updated when items are added
        paid_amount: '0.00',
        payment_method: 'cash',
        notes: 'Test transaction',
        created_by: testUserId
      })
      .returning()
      .execute();
    testTransactionId = transaction[0].id;
  });

  const createValidInput = (overrides = {}): CreateTransactionItemInput => ({
    transaction_id: testTransactionId,
    product_id: testProductId,
    quantity: 2,
    unit_price: 25.99,
    ...overrides
  });

  it('should create a transaction item successfully', async () => {
    const input = createValidInput();
    const result = await createTransactionItem(input);

    // Verify basic fields
    expect(result.transaction_id).toEqual(testTransactionId);
    expect(result.product_id).toEqual(testProductId);
    expect(result.quantity).toEqual(2);
    expect(result.unit_price).toEqual(25.99);
    expect(result.total_price).toEqual(51.98); // 2 * 25.99
    expect(result.id).toBeDefined();
    expect(typeof result.unit_price).toBe('number');
    expect(typeof result.total_price).toBe('number');
  });

  it('should save transaction item to database', async () => {
    const input = createValidInput();
    const result = await createTransactionItem(input);

    // Query the database to verify the item was saved
    const items = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.id, result.id))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].transaction_id).toEqual(testTransactionId);
    expect(items[0].product_id).toEqual(testProductId);
    expect(items[0].quantity).toEqual(2);
    expect(parseFloat(items[0].unit_price)).toEqual(25.99);
    expect(parseFloat(items[0].total_price)).toEqual(51.98);
  });

  it('should reduce product stock quantity', async () => {
    const input = createValidInput({ quantity: 3 });
    
    // Verify initial stock
    const initialProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();
    expect(initialProduct[0].stock_quantity).toEqual(10);

    await createTransactionItem(input);

    // Verify stock was reduced
    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();
    expect(updatedProduct[0].stock_quantity).toEqual(7); // 10 - 3
  });

  it('should update product updated_at timestamp', async () => {
    const input = createValidInput();
    
    // Get initial timestamp
    const initialProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();
    const initialUpdatedAt = initialProduct[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    await createTransactionItem(input);

    // Verify timestamp was updated
    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();
    expect(updatedProduct[0].updated_at.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
  });

  it('should calculate total price correctly', async () => {
    const input = createValidInput({
      quantity: 5,
      unit_price: 12.50
    });
    
    const result = await createTransactionItem(input);
    expect(result.total_price).toEqual(62.50); // 5 * 12.50
  });

  it('should handle decimal calculations correctly', async () => {
    const input = createValidInput({
      quantity: 3,
      unit_price: 19.99
    });
    
    const result = await createTransactionItem(input);
    expect(result.total_price).toEqual(59.97); // 3 * 19.99
  });

  it('should throw error when transaction does not exist', async () => {
    const input = createValidInput({
      transaction_id: 99999 // Non-existent transaction ID
    });

    await expect(createTransactionItem(input)).rejects.toThrow(/Transaction with id 99999 not found/i);
  });

  it('should throw error when product does not exist', async () => {
    const input = createValidInput({
      product_id: 99999 // Non-existent product ID
    });

    await expect(createTransactionItem(input)).rejects.toThrow(/Product with id 99999 not found/i);
  });

  it('should throw error when insufficient stock', async () => {
    const input = createValidInput({
      quantity: 15 // More than the available stock of 10
    });

    await expect(createTransactionItem(input)).rejects.toThrow(/Insufficient stock. Available: 10, Requested: 15/i);
  });

  it('should allow using all available stock', async () => {
    const input = createValidInput({
      quantity: 10 // Exactly the available stock
    });

    const result = await createTransactionItem(input);
    expect(result.quantity).toEqual(10);

    // Verify stock is now 0
    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();
    expect(updatedProduct[0].stock_quantity).toEqual(0);
  });

  it('should handle multiple transaction items for same transaction', async () => {
    // Create first item
    const input1 = createValidInput({
      quantity: 2,
      unit_price: 10.00
    });
    const result1 = await createTransactionItem(input1);

    // Create second item (remaining stock should be 8)
    const input2 = createValidInput({
      quantity: 3,
      unit_price: 15.00
    });
    const result2 = await createTransactionItem(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.total_price).toEqual(20.00);
    expect(result2.total_price).toEqual(45.00);

    // Verify final stock is 5 (10 - 2 - 3)
    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();
    expect(updatedProduct[0].stock_quantity).toEqual(5);
  });
});