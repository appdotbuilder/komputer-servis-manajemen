import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { servicesTable, customersTable, usersTable } from '../db/schema';
import { type UpdateServiceInput, type CreateCustomerInput, type CreateUserInput } from '../schema';
import { updateService } from '../handlers/update_service';
import { eq } from 'drizzle-orm';

// Test input for creating prerequisite customer
const testCustomer: CreateCustomerInput = {
  name: 'Test Customer',
  phone: '1234567890',
  email: 'test@example.com',
  address: '123 Test St'
};

// Test input for creating prerequisite user (technician)
const testTechnician: CreateUserInput = {
  username: 'tech1',
  email: 'tech@example.com',
  password: 'password123',
  full_name: 'Test Technician',
  role: 'technician'
};

describe('updateService', () => {
  let customerId: number;
  let technicianId: number;
  let serviceId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    customerId = customerResult[0].id;

    // Create prerequisite technician
    const technicianResult = await db.insert(usersTable)
      .values({
        ...testTechnician,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    technicianId = technicianResult[0].id;

    // Create a test service to update
    const serviceResult = await db.insert(servicesTable)
      .values({
        customer_id: customerId,
        device_type: 'Laptop',
        device_brand: 'Dell',
        device_model: 'Inspiron',
        problem_description: 'Screen flickering',
        estimated_cost: '150.00'
      })
      .returning()
      .execute();
    serviceId = serviceResult[0].id;
  });

  afterEach(resetDB);

  it('should update service diagnosis', async () => {
    const input: UpdateServiceInput = {
      id: serviceId,
      diagnosis: 'Faulty display cable'
    };

    const result = await updateService(input);

    expect(result.id).toEqual(serviceId);
    expect(result.diagnosis).toEqual('Faulty display cable');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.status).toEqual('pending'); // Should remain unchanged
    expect(result.completed_at).toBeNull(); // Should remain unchanged
  });

  it('should update service repair actions', async () => {
    const input: UpdateServiceInput = {
      id: serviceId,
      repair_actions: 'Replaced display cable and tested functionality'
    };

    const result = await updateService(input);

    expect(result.id).toEqual(serviceId);
    expect(result.repair_actions).toEqual('Replaced display cable and tested functionality');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update service status and set completed_at when completed', async () => {
    const input: UpdateServiceInput = {
      id: serviceId,
      status: 'completed'
    };

    const result = await updateService(input);

    expect(result.id).toEqual(serviceId);
    expect(result.status).toEqual('completed');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update actual cost with numeric conversion', async () => {
    const input: UpdateServiceInput = {
      id: serviceId,
      actual_cost: 175.50
    };

    const result = await updateService(input);

    expect(result.id).toEqual(serviceId);
    expect(result.actual_cost).toEqual(175.50);
    expect(typeof result.actual_cost).toEqual('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should assign technician to service', async () => {
    const input: UpdateServiceInput = {
      id: serviceId,
      technician_id: technicianId
    };

    const result = await updateService(input);

    expect(result.id).toEqual(serviceId);
    expect(result.technician_id).toEqual(technicianId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateServiceInput = {
      id: serviceId,
      diagnosis: 'Hardware failure',
      repair_actions: 'Component replacement',
      status: 'in_progress',
      actual_cost: 200.00,
      technician_id: technicianId
    };

    const result = await updateService(input);

    expect(result.id).toEqual(serviceId);
    expect(result.diagnosis).toEqual('Hardware failure');
    expect(result.repair_actions).toEqual('Component replacement');
    expect(result.status).toEqual('in_progress');
    expect(result.actual_cost).toEqual(200.00);
    expect(result.technician_id).toEqual(technicianId);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull(); // Should not be set for in_progress
  });

  it('should save updates to database', async () => {
    const input: UpdateServiceInput = {
      id: serviceId,
      diagnosis: 'Database test diagnosis',
      status: 'completed'
    };

    await updateService(input);

    // Query the database directly to verify changes
    const services = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, serviceId))
      .execute();

    expect(services).toHaveLength(1);
    const service = services[0];
    expect(service.diagnosis).toEqual('Database test diagnosis');
    expect(service.status).toEqual('completed');
    expect(service.completed_at).toBeInstanceOf(Date);
    expect(service.updated_at).toBeInstanceOf(Date);
  });

  it('should preserve unchanged fields', async () => {
    const input: UpdateServiceInput = {
      id: serviceId,
      diagnosis: 'Only diagnosis updated'
    };

    const result = await updateService(input);

    expect(result.id).toEqual(serviceId);
    expect(result.customer_id).toEqual(customerId);
    expect(result.device_type).toEqual('Laptop');
    expect(result.device_brand).toEqual('Dell');
    expect(result.device_model).toEqual('Inspiron');
    expect(result.problem_description).toEqual('Screen flickering');
    expect(result.estimated_cost).toEqual(150); // Should be converted to number
    expect(result.diagnosis).toEqual('Only diagnosis updated');
    expect(result.repair_actions).toBeNull(); // Should remain unchanged
  });

  it('should throw error when service not found', async () => {
    const input: UpdateServiceInput = {
      id: 99999,
      diagnosis: 'Non-existent service'
    };

    await expect(updateService(input)).rejects.toThrow(/Service with id 99999 not found/i);
  });

  it('should handle null values correctly', async () => {
    // First add some values
    await updateService({
      id: serviceId,
      diagnosis: 'Initial diagnosis',
      repair_actions: 'Initial actions'
    });

    // Then update with optional undefined values (should not change existing values)
    const input: UpdateServiceInput = {
      id: serviceId,
      status: 'in_progress'
    };

    const result = await updateService(input);

    expect(result.diagnosis).toEqual('Initial diagnosis'); // Should be preserved
    expect(result.repair_actions).toEqual('Initial actions'); // Should be preserved
    expect(result.status).toEqual('in_progress');
  });
});