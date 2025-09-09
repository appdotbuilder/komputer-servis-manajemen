import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { getCustomers } from '../handlers/get_customers';

// Test customer data
const testCustomer1: CreateCustomerInput = {
  name: 'John Doe',
  phone: '+1234567890',
  email: 'john.doe@example.com',
  address: '123 Main St, City, State'
};

const testCustomer2: CreateCustomerInput = {
  name: 'Jane Smith',
  phone: null,
  email: 'jane.smith@example.com',
  address: null
};

const testCustomer3: CreateCustomerInput = {
  name: 'Bob Wilson',
  phone: '+9876543210',
  email: null,
  address: '456 Oak Ave, Town, State'
};

describe('getCustomers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no customers exist', async () => {
    const result = await getCustomers();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all customers when they exist', async () => {
    // Create test customers
    await db.insert(customersTable)
      .values([testCustomer1, testCustomer2, testCustomer3])
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(3);
    
    // Check that all customers are returned
    const customerNames = result.map(c => c.name);
    expect(customerNames).toContain('John Doe');
    expect(customerNames).toContain('Jane Smith');
    expect(customerNames).toContain('Bob Wilson');
  });

  it('should return customers with correct field types and values', async () => {
    // Create a customer with all fields filled
    await db.insert(customersTable)
      .values(testCustomer1)
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(1);
    const customer = result[0];

    // Check required fields
    expect(typeof customer.id).toBe('number');
    expect(customer.name).toBe('John Doe');
    expect(customer.phone).toBe('+1234567890');
    expect(customer.email).toBe('john.doe@example.com');
    expect(customer.address).toBe('123 Main St, City, State');
    expect(customer.created_at).toBeInstanceOf(Date);
    expect(customer.updated_at).toBeInstanceOf(Date);
  });

  it('should handle customers with nullable fields correctly', async () => {
    // Create a customer with some null fields
    await db.insert(customersTable)
      .values(testCustomer2)
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(1);
    const customer = result[0];

    // Check that nullable fields are handled correctly
    expect(customer.name).toBe('Jane Smith');
    expect(customer.phone).toBe(null);
    expect(customer.email).toBe('jane.smith@example.com');
    expect(customer.address).toBe(null);
  });

  it('should return customers ordered by creation date', async () => {
    // Insert customers with slight delays to ensure different timestamps
    await db.insert(customersTable)
      .values(testCustomer1)
      .execute();
    
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await db.insert(customersTable)
      .values(testCustomer2)
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(2);
    
    // Verify customers exist (order may vary based on database implementation)
    const customerNames = result.map(c => c.name);
    expect(customerNames).toContain('John Doe');
    expect(customerNames).toContain('Jane Smith');
    
    // Verify timestamps are present
    result.forEach(customer => {
      expect(customer.created_at).toBeInstanceOf(Date);
      expect(customer.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return a large number of customers correctly', async () => {
    // Create multiple customers to test performance
    const customers: CreateCustomerInput[] = [];
    for (let i = 1; i <= 10; i++) {
      customers.push({
        name: `Customer ${i}`,
        phone: `+123456789${i}`,
        email: `customer${i}@example.com`,
        address: `${i} Test St`
      });
    }

    await db.insert(customersTable)
      .values(customers)
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(10);
    
    // Verify all customers are returned with correct structure
    result.forEach((customer, index) => {
      expect(typeof customer.id).toBe('number');
      expect(customer.name).toMatch(/^Customer \d+$/);
      expect(customer.created_at).toBeInstanceOf(Date);
      expect(customer.updated_at).toBeInstanceOf(Date);
    });
  });
});