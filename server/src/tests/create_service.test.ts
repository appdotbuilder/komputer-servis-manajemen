import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { servicesTable, customersTable } from '../db/schema';
import { type CreateServiceInput } from '../schema';
import { createService } from '../handlers/create_service';
import { eq } from 'drizzle-orm';

// Test customer data
const testCustomer = {
  name: 'John Doe',
  phone: '123-456-7890',
  email: 'john@example.com',
  address: '123 Main St'
};

// Simple test input
const testInput: CreateServiceInput = {
  customer_id: 1, // Will be set after creating customer
  device_type: 'Laptop',
  device_brand: 'Dell',
  device_model: 'Inspiron 15',
  problem_description: 'Screen flickering and won\'t boot',
  estimated_cost: 150.00
};

// Test input with nullable fields
const minimalTestInput: CreateServiceInput = {
  customer_id: 1,
  device_type: 'Desktop Computer',
  device_brand: null,
  device_model: null,
  problem_description: 'Computer won\'t start',
  estimated_cost: null
};

describe('createService', () => {
  let customerId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test customer first (required foreign key)
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    
    customerId = customerResult[0].id;
    testInput.customer_id = customerId;
    minimalTestInput.customer_id = customerId;
  });

  afterEach(resetDB);

  it('should create a service with all fields', async () => {
    const result = await createService(testInput);

    // Basic field validation
    expect(result.customer_id).toEqual(customerId);
    expect(result.device_type).toEqual('Laptop');
    expect(result.device_brand).toEqual('Dell');
    expect(result.device_model).toEqual('Inspiron 15');
    expect(result.problem_description).toEqual('Screen flickering and won\'t boot');
    expect(result.estimated_cost).toEqual(150.00);
    expect(typeof result.estimated_cost).toBe('number');

    // Default values
    expect(result.status).toEqual('pending');
    expect(result.diagnosis).toBeNull();
    expect(result.repair_actions).toBeNull();
    expect(result.actual_cost).toBeNull();
    expect(result.technician_id).toBeNull();
    expect(result.completed_at).toBeNull();

    // Auto-generated fields
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a service with minimal fields (nullable)', async () => {
    const result = await createService(minimalTestInput);

    // Basic field validation
    expect(result.customer_id).toEqual(customerId);
    expect(result.device_type).toEqual('Desktop Computer');
    expect(result.device_brand).toBeNull();
    expect(result.device_model).toBeNull();
    expect(result.problem_description).toEqual('Computer won\'t start');
    expect(result.estimated_cost).toBeNull();

    // Default values
    expect(result.status).toEqual('pending');
    expect(result.diagnosis).toBeNull();
    expect(result.repair_actions).toBeNull();
    expect(result.actual_cost).toBeNull();
    expect(result.technician_id).toBeNull();
    expect(result.completed_at).toBeNull();

    // Auto-generated fields
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save service to database', async () => {
    const result = await createService(testInput);

    // Query using proper drizzle syntax
    const services = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, result.id))
      .execute();

    expect(services).toHaveLength(1);
    const savedService = services[0];
    expect(savedService.customer_id).toEqual(customerId);
    expect(savedService.device_type).toEqual('Laptop');
    expect(savedService.device_brand).toEqual('Dell');
    expect(savedService.device_model).toEqual('Inspiron 15');
    expect(savedService.problem_description).toEqual('Screen flickering and won\'t boot');
    expect(parseFloat(savedService.estimated_cost!)).toEqual(150.00);
    expect(savedService.status).toEqual('pending');
    expect(savedService.created_at).toBeInstanceOf(Date);
    expect(savedService.updated_at).toBeInstanceOf(Date);
  });

  it('should handle numeric conversion correctly', async () => {
    const result = await createService(testInput);
    
    // Verify estimated_cost is returned as number
    expect(typeof result.estimated_cost).toBe('number');
    expect(result.estimated_cost).toEqual(150.00);
    
    // Verify actual_cost is null (not converted)
    expect(result.actual_cost).toBeNull();
  });

  it('should reject service creation with non-existent customer', async () => {
    const invalidInput = {
      ...testInput,
      customer_id: 99999 // Non-existent customer ID
    };

    await expect(createService(invalidInput)).rejects.toThrow(/Customer with id 99999 not found/i);
  });

  it('should handle zero estimated cost', async () => {
    const zeroEstimateInput = {
      ...testInput,
      estimated_cost: 0
    };

    const result = await createService(zeroEstimateInput);
    expect(result.estimated_cost).toEqual(0);
    expect(typeof result.estimated_cost).toBe('number');
  });

  it('should preserve null values for optional fields', async () => {
    const result = await createService(minimalTestInput);
    
    expect(result.device_brand).toBeNull();
    expect(result.device_model).toBeNull();
    expect(result.estimated_cost).toBeNull();
    expect(result.diagnosis).toBeNull();
    expect(result.repair_actions).toBeNull();
    expect(result.actual_cost).toBeNull();
    expect(result.technician_id).toBeNull();
    expect(result.completed_at).toBeNull();
  });
});