import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { servicesTable, customersTable, usersTable } from '../db/schema';
import { getServices } from '../handlers/get_services';
import { type CreateServiceInput } from '../schema';

describe('getServices', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no services exist', async () => {
    const result = await getServices();
    expect(result).toEqual([]);
  });

  it('should fetch all services from database', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'customer@test.com',
        address: '123 Test St'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create test services
    await db.insert(servicesTable)
      .values([
        {
          customer_id: customerId,
          device_type: 'Laptop',
          device_brand: 'Dell',
          device_model: 'XPS 13',
          problem_description: 'Won\'t boot',
          estimated_cost: '150.50',
          status: 'pending'
        },
        {
          customer_id: customerId,
          device_type: 'Desktop',
          device_brand: 'HP',
          device_model: 'Pavilion',
          problem_description: 'Blue screen error',
          estimated_cost: '200.75',
          actual_cost: '180.25',
          status: 'completed'
        }
      ])
      .execute();

    const result = await getServices();

    // Should return 2 services
    expect(result).toHaveLength(2);

    // Verify first service
    const service1 = result.find(s => s.device_type === 'Laptop');
    expect(service1).toBeDefined();
    expect(service1?.customer_id).toEqual(customerId);
    expect(service1?.device_brand).toEqual('Dell');
    expect(service1?.device_model).toEqual('XPS 13');
    expect(service1?.problem_description).toEqual('Won\'t boot');
    expect(service1?.estimated_cost).toEqual(150.50);
    expect(typeof service1?.estimated_cost).toBe('number');
    expect(service1?.actual_cost).toBeNull();
    expect(service1?.status).toEqual('pending');
    expect(service1?.id).toBeDefined();
    expect(service1?.created_at).toBeInstanceOf(Date);
    expect(service1?.updated_at).toBeInstanceOf(Date);

    // Verify second service
    const service2 = result.find(s => s.device_type === 'Desktop');
    expect(service2).toBeDefined();
    expect(service2?.customer_id).toEqual(customerId);
    expect(service2?.device_brand).toEqual('HP');
    expect(service2?.device_model).toEqual('Pavilion');
    expect(service2?.problem_description).toEqual('Blue screen error');
    expect(service2?.estimated_cost).toEqual(200.75);
    expect(typeof service2?.estimated_cost).toBe('number');
    expect(service2?.actual_cost).toEqual(180.25);
    expect(typeof service2?.actual_cost).toBe('number');
    expect(service2?.status).toEqual('completed');
    expect(service2?.id).toBeDefined();
    expect(service2?.created_at).toBeInstanceOf(Date);
    expect(service2?.updated_at).toBeInstanceOf(Date);
  });

  it('should handle services with null values correctly', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: null,
        email: null,
        address: null
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create service with minimal data (nulls)
    await db.insert(servicesTable)
      .values({
        customer_id: customerId,
        device_type: 'Phone',
        device_brand: null,
        device_model: null,
        problem_description: 'Screen cracked',
        diagnosis: null,
        repair_actions: null,
        estimated_cost: null,
        actual_cost: null,
        technician_id: null,
        completed_at: null,
        status: 'pending'
      })
      .execute();

    const result = await getServices();

    expect(result).toHaveLength(1);
    const service = result[0];
    expect(service.customer_id).toEqual(customerId);
    expect(service.device_type).toEqual('Phone');
    expect(service.device_brand).toBeNull();
    expect(service.device_model).toBeNull();
    expect(service.problem_description).toEqual('Screen cracked');
    expect(service.diagnosis).toBeNull();
    expect(service.repair_actions).toBeNull();
    expect(service.estimated_cost).toBeNull();
    expect(service.actual_cost).toBeNull();
    expect(service.technician_id).toBeNull();
    expect(service.completed_at).toBeNull();
    expect(service.status).toEqual('pending');
  });

  it('should handle services with technician assignment', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'customer@test.com',
        address: '123 Test St'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create prerequisite technician
    const technicianResult = await db.insert(usersTable)
      .values({
        username: 'tech1',
        email: 'tech1@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Tech One',
        role: 'technician',
        is_active: true
      })
      .returning()
      .execute();

    const technicianId = technicianResult[0].id;

    // Create service with technician assigned
    await db.insert(servicesTable)
      .values({
        customer_id: customerId,
        device_type: 'Tablet',
        device_brand: 'iPad',
        device_model: 'Air',
        problem_description: 'Battery issues',
        diagnosis: 'Battery needs replacement',
        repair_actions: 'Replaced battery',
        estimated_cost: '120.00',
        actual_cost: '115.00',
        technician_id: technicianId,
        status: 'in_progress'
      })
      .execute();

    const result = await getServices();

    expect(result).toHaveLength(1);
    const service = result[0];
    expect(service.customer_id).toEqual(customerId);
    expect(service.technician_id).toEqual(technicianId);
    expect(service.device_type).toEqual('Tablet');
    expect(service.device_brand).toEqual('iPad');
    expect(service.device_model).toEqual('Air');
    expect(service.diagnosis).toEqual('Battery needs replacement');
    expect(service.repair_actions).toEqual('Replaced battery');
    expect(service.estimated_cost).toEqual(120.00);
    expect(typeof service.estimated_cost).toBe('number');
    expect(service.actual_cost).toEqual(115.00);
    expect(typeof service.actual_cost).toBe('number');
    expect(service.status).toEqual('in_progress');
  });

  it('should handle all service statuses correctly', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'customer@test.com',
        address: '123 Test St'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create services with different statuses
    await db.insert(servicesTable)
      .values([
        {
          customer_id: customerId,
          device_type: 'Laptop',
          problem_description: 'Issue 1',
          status: 'pending'
        },
        {
          customer_id: customerId,
          device_type: 'Desktop',
          problem_description: 'Issue 2',
          status: 'in_progress'
        },
        {
          customer_id: customerId,
          device_type: 'Phone',
          problem_description: 'Issue 3',
          status: 'completed',
          completed_at: new Date()
        },
        {
          customer_id: customerId,
          device_type: 'Tablet',
          problem_description: 'Issue 4',
          status: 'cancelled'
        }
      ])
      .execute();

    const result = await getServices();

    expect(result).toHaveLength(4);
    
    const statuses = result.map(s => s.status);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('in_progress');
    expect(statuses).toContain('completed');
    expect(statuses).toContain('cancelled');

    // Check completed service has completed_at date
    const completedService = result.find(s => s.status === 'completed');
    expect(completedService?.completed_at).toBeInstanceOf(Date);
  });

  it('should maintain correct data types for all fields', async () => {
    // Create prerequisite customer
    const customerResult = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'customer@test.com',
        address: '123 Test St'
      })
      .returning()
      .execute();

    const customerId = customerResult[0].id;

    // Create service with all fields populated
    await db.insert(servicesTable)
      .values({
        customer_id: customerId,
        device_type: 'Laptop',
        device_brand: 'Apple',
        device_model: 'MacBook Pro',
        problem_description: 'Keyboard not working',
        diagnosis: 'Spilled liquid damage',
        repair_actions: 'Replaced keyboard',
        estimated_cost: '299.99',
        actual_cost: '275.50',
        status: 'completed',
        completed_at: new Date()
      })
      .execute();

    const result = await getServices();

    expect(result).toHaveLength(1);
    const service = result[0];

    // Verify all field types
    expect(typeof service.id).toBe('number');
    expect(typeof service.customer_id).toBe('number');
    expect(typeof service.device_type).toBe('string');
    expect(typeof service.device_brand).toBe('string');
    expect(typeof service.device_model).toBe('string');
    expect(typeof service.problem_description).toBe('string');
    expect(typeof service.diagnosis).toBe('string');
    expect(typeof service.repair_actions).toBe('string');
    expect(typeof service.estimated_cost).toBe('number');
    expect(typeof service.actual_cost).toBe('number');
    expect(typeof service.status).toBe('string');
    expect(service.created_at).toBeInstanceOf(Date);
    expect(service.updated_at).toBeInstanceOf(Date);
    expect(service.completed_at).toBeInstanceOf(Date);
  });
});