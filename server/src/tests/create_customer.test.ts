import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { createCustomer } from '../handlers/create_customer';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInputComplete: CreateCustomerInput = {
  name: 'John Doe',
  phone: '+1234567890',
  email: 'john.doe@example.com',
  address: '123 Main St, City, State'
};

// Test input with nullable fields as null
const testInputMinimal: CreateCustomerInput = {
  name: 'Jane Smith',
  phone: null,
  email: null,
  address: null
};

describe('createCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer with all fields', async () => {
    const result = await createCustomer(testInputComplete);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.phone).toEqual('+1234567890');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.address).toEqual('123 Main St, City, State');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a customer with nullable fields as null', async () => {
    const result = await createCustomer(testInputMinimal);

    // Basic field validation
    expect(result.name).toEqual('Jane Smith');
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.address).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save customer to database', async () => {
    const result = await createCustomer(testInputComplete);

    // Query using proper drizzle syntax
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('John Doe');
    expect(customers[0].phone).toEqual('+1234567890');
    expect(customers[0].email).toEqual('john.doe@example.com');
    expect(customers[0].address).toEqual('123 Main St, City, State');
    expect(customers[0].created_at).toBeInstanceOf(Date);
    expect(customers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should save customer with null fields to database', async () => {
    const result = await createCustomer(testInputMinimal);

    // Query using proper drizzle syntax
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('Jane Smith');
    expect(customers[0].phone).toBeNull();
    expect(customers[0].email).toBeNull();
    expect(customers[0].address).toBeNull();
    expect(customers[0].created_at).toBeInstanceOf(Date);
    expect(customers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle email validation properly', async () => {
    const validEmailInput: CreateCustomerInput = {
      name: 'Valid Email User',
      phone: null,
      email: 'valid.email@domain.co.uk',
      address: null
    };

    const result = await createCustomer(validEmailInput);
    
    expect(result.email).toEqual('valid.email@domain.co.uk');
    expect(result.name).toEqual('Valid Email User');
    expect(result.id).toBeDefined();
  });

  it('should create multiple customers with unique IDs', async () => {
    const customer1 = await createCustomer({
      name: 'Customer One',
      phone: null,
      email: null,
      address: null
    });

    const customer2 = await createCustomer({
      name: 'Customer Two',
      phone: null,
      email: null,
      address: null
    });

    expect(customer1.id).not.toEqual(customer2.id);
    expect(customer1.name).toEqual('Customer One');
    expect(customer2.name).toEqual('Customer Two');
  });
});