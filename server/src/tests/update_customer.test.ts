import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type UpdateCustomerInput, type CreateCustomerInput } from '../schema';
import { updateCustomer } from '../handlers/update_customer';
import { eq } from 'drizzle-orm';

describe('updateCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create a customer for testing
  const createTestCustomer = async (): Promise<number> => {
    const customerData: CreateCustomerInput = {
      name: 'Original Customer',
      phone: '+1234567890',
      email: 'original@example.com',
      address: '123 Original St'
    };

    const result = await db.insert(customersTable)
      .values(customerData)
      .returning()
      .execute();

    return result[0].id;
  };

  it('should update all customer fields', async () => {
    const customerId = await createTestCustomer();
    
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Updated Customer',
      phone: '+9876543210',
      email: 'updated@example.com',
      address: '456 Updated Ave'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('Updated Customer');
    expect(result.phone).toEqual('+9876543210');
    expect(result.email).toEqual('updated@example.com');
    expect(result.address).toEqual('456 Updated Ave');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    const customerId = await createTestCustomer();
    
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Partially Updated Customer'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('Partially Updated Customer');
    expect(result.phone).toEqual('+1234567890'); // Should remain unchanged
    expect(result.email).toEqual('original@example.com'); // Should remain unchanged
    expect(result.address).toEqual('123 Original St'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update nullable fields to null', async () => {
    const customerId = await createTestCustomer();
    
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      phone: null,
      email: null,
      address: null
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('Original Customer'); // Should remain unchanged
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.address).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated customer to database', async () => {
    const customerId = await createTestCustomer();
    
    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Database Updated Customer',
      email: 'database@example.com'
    };

    await updateCustomer(updateInput);

    // Verify the changes were persisted in the database
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('Database Updated Customer');
    expect(customers[0].email).toEqual('database@example.com');
    expect(customers[0].phone).toEqual('+1234567890'); // Should remain unchanged
    expect(customers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    const customerId = await createTestCustomer();
    
    // Get the original updated_at timestamp
    const original = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();
    
    const originalUpdatedAt = original[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateCustomerInput = {
      id: customerId,
      name: 'Timestamp Test Customer'
    };

    const result = await updateCustomer(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error when customer does not exist', async () => {
    const updateInput: UpdateCustomerInput = {
      id: 99999, // Non-existent ID
      name: 'Non-existent Customer'
    };

    expect(updateCustomer(updateInput)).rejects.toThrow(/customer.*not found/i);
  });

  it('should handle empty update gracefully', async () => {
    const customerId = await createTestCustomer();
    
    const updateInput: UpdateCustomerInput = {
      id: customerId
      // No fields to update
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(customerId);
    expect(result.name).toEqual('Original Customer'); // Should remain unchanged
    expect(result.phone).toEqual('+1234567890'); // Should remain unchanged
    expect(result.email).toEqual('original@example.com'); // Should remain unchanged
    expect(result.address).toEqual('123 Original St'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});