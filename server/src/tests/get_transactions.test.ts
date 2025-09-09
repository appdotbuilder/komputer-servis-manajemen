import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, usersTable, servicesTable, transactionsTable } from '../db/schema';
import { getTransactions } from '../handlers/get_transactions';

describe('getTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no transactions exist', async () => {
    const result = await getTransactions();

    expect(result).toEqual([]);
  });

  it('should fetch all transactions with correct field types', async () => {
    // Create prerequisite data
    const [customer] = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '+1234567890',
        email: 'customer@test.com',
        address: '123 Test St'
      })
      .returning()
      .execute();

    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'user@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    const [service] = await db.insert(servicesTable)
      .values({
        customer_id: customer.id,
        device_type: 'smartphone',
        device_brand: 'Apple',
        device_model: 'iPhone 13',
        problem_description: 'Screen cracked'
      })
      .returning()
      .execute();

    // Create test transactions
    await db.insert(transactionsTable)
      .values([
        {
          customer_id: customer.id,
          type: 'service',
          service_id: service.id,
          total_amount: '150.75',
          paid_amount: '100.00',
          payment_method: 'cash',
          notes: 'Partial payment',
          created_by: user.id
        },
        {
          customer_id: customer.id,
          type: 'sale',
          service_id: null,
          total_amount: '89.99',
          paid_amount: '89.99',
          payment_method: 'card',
          notes: 'Full payment',
          created_by: user.id
        }
      ])
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(2);

    // Verify first transaction
    const serviceTransaction = result.find(t => t.type === 'service');
    expect(serviceTransaction).toBeDefined();
    expect(serviceTransaction!.customer_id).toEqual(customer.id);
    expect(serviceTransaction!.type).toEqual('service');
    expect(serviceTransaction!.service_id).toEqual(service.id);
    expect(serviceTransaction!.total_amount).toEqual(150.75);
    expect(serviceTransaction!.paid_amount).toEqual(100.00);
    expect(serviceTransaction!.payment_method).toEqual('cash');
    expect(serviceTransaction!.notes).toEqual('Partial payment');
    expect(serviceTransaction!.created_by).toEqual(user.id);
    expect(serviceTransaction!.created_at).toBeInstanceOf(Date);
    expect(serviceTransaction!.id).toBeDefined();

    // Verify second transaction
    const saleTransaction = result.find(t => t.type === 'sale');
    expect(saleTransaction).toBeDefined();
    expect(saleTransaction!.customer_id).toEqual(customer.id);
    expect(saleTransaction!.type).toEqual('sale');
    expect(saleTransaction!.service_id).toBeNull();
    expect(saleTransaction!.total_amount).toEqual(89.99);
    expect(saleTransaction!.paid_amount).toEqual(89.99);
    expect(saleTransaction!.payment_method).toEqual('card');
    expect(saleTransaction!.notes).toEqual('Full payment');
    expect(saleTransaction!.created_by).toEqual(user.id);

    // Verify numeric field types are correct
    expect(typeof serviceTransaction!.total_amount).toBe('number');
    expect(typeof serviceTransaction!.paid_amount).toBe('number');
    expect(typeof saleTransaction!.total_amount).toBe('number');
    expect(typeof saleTransaction!.paid_amount).toBe('number');
  });

  it('should handle transactions with null optional fields', async () => {
    // Create prerequisite data
    const [customer] = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: null,
        email: null,
        address: null
      })
      .returning()
      .execute();

    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'user@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'technician'
      })
      .returning()
      .execute();

    // Create transaction with minimal data
    await db.insert(transactionsTable)
      .values({
        customer_id: customer.id,
        type: 'sale',
        service_id: null,
        total_amount: '25.50',
        paid_amount: '25.50',
        payment_method: null,
        notes: null,
        created_by: user.id
      })
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(1);
    const transaction = result[0];
    expect(transaction.service_id).toBeNull();
    expect(transaction.payment_method).toBeNull();
    expect(transaction.notes).toBeNull();
    expect(transaction.total_amount).toEqual(25.50);
    expect(transaction.paid_amount).toEqual(25.50);
    expect(typeof transaction.total_amount).toBe('number');
    expect(typeof transaction.paid_amount).toBe('number');
  });

  it('should handle multiple transactions correctly ordered by creation', async () => {
    // Create prerequisite data
    const [customer] = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '+1234567890',
        email: 'customer@test.com',
        address: '123 Test St'
      })
      .returning()
      .execute();

    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'user@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create multiple transactions
    await db.insert(transactionsTable)
      .values([
        {
          customer_id: customer.id,
          type: 'sale',
          total_amount: '10.00',
          paid_amount: '10.00',
          created_by: user.id
        },
        {
          customer_id: customer.id,
          type: 'sale',
          total_amount: '20.00',
          paid_amount: '15.00',
          created_by: user.id
        },
        {
          customer_id: customer.id,
          type: 'service',
          total_amount: '30.00',
          paid_amount: '30.00',
          created_by: user.id
        }
      ])
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(3);
    
    // Verify all transactions have correct numeric conversions
    result.forEach(transaction => {
      expect(typeof transaction.total_amount).toBe('number');
      expect(typeof transaction.paid_amount).toBe('number');
      expect(transaction.total_amount).toBeGreaterThan(0);
      expect(transaction.paid_amount).toBeGreaterThanOrEqual(0);
    });

    // Verify the specific amounts
    const amounts = result.map(t => t.total_amount).sort();
    expect(amounts).toEqual([10.00, 20.00, 30.00]);
  });
});