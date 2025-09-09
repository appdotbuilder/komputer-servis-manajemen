import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { getCustomer } from '../handlers/get_customer';

const testCustomer: CreateCustomerInput = {
  name: 'John Doe',
  phone: '+1234567890',
  email: 'john.doe@example.com',
  address: '123 Main St, Anytown, USA'
};

const testCustomerMinimal: CreateCustomerInput = {
  name: 'Jane Smith',
  phone: null,
  email: null,
  address: null
};

describe('getCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve an existing customer by id', async () => {
    // Create test customer
    const insertResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();

    const createdCustomer = insertResult[0];

    // Retrieve the customer
    const result = await getCustomer(createdCustomer.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdCustomer.id);
    expect(result!.name).toEqual('John Doe');
    expect(result!.phone).toEqual('+1234567890');
    expect(result!.email).toEqual('john.doe@example.com');
    expect(result!.address).toEqual('123 Main St, Anytown, USA');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should retrieve a customer with null optional fields', async () => {
    // Create test customer with minimal data
    const insertResult = await db.insert(customersTable)
      .values(testCustomerMinimal)
      .returning()
      .execute();

    const createdCustomer = insertResult[0];

    // Retrieve the customer
    const result = await getCustomer(createdCustomer.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdCustomer.id);
    expect(result!.name).toEqual('Jane Smith');
    expect(result!.phone).toBeNull();
    expect(result!.email).toBeNull();
    expect(result!.address).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent customer id', async () => {
    const result = await getCustomer(999);
    expect(result).toBeNull();
  });

  it('should handle negative customer id', async () => {
    const result = await getCustomer(-1);
    expect(result).toBeNull();
  });

  it('should handle zero customer id', async () => {
    const result = await getCustomer(0);
    expect(result).toBeNull();
  });

  it('should retrieve the correct customer when multiple customers exist', async () => {
    // Create multiple customers
    const customer1 = await db.insert(customersTable)
      .values({ ...testCustomer, name: 'Customer 1' })
      .returning()
      .execute();

    const customer2 = await db.insert(customersTable)
      .values({ ...testCustomer, name: 'Customer 2' })
      .returning()
      .execute();

    const customer3 = await db.insert(customersTable)
      .values({ ...testCustomer, name: 'Customer 3' })
      .returning()
      .execute();

    // Retrieve the middle customer
    const result = await getCustomer(customer2[0].id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(customer2[0].id);
    expect(result!.name).toEqual('Customer 2');
  });
});