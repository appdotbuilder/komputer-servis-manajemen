import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, servicesTable, usersTable } from '../db/schema';
import { getService } from '../handlers/get_service';
import { eq } from 'drizzle-orm';

describe('getService', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a service by id', async () => {
    // Create prerequisite customer
    const customers = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'test@example.com',
        address: '123 Test St'
      })
      .returning()
      .execute();

    // Create prerequisite user (technician)
    const users = await db.insert(usersTable)
      .values({
        username: 'technician1',
        email: 'tech@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Technician',
        role: 'technician'
      })
      .returning()
      .execute();

    // Create service record
    const services = await db.insert(servicesTable)
      .values({
        customer_id: customers[0].id,
        device_type: 'Smartphone',
        device_brand: 'iPhone',
        device_model: 'iPhone 12',
        problem_description: 'Screen cracked',
        diagnosis: 'Needs screen replacement',
        repair_actions: 'Replace screen assembly',
        status: 'in_progress',
        estimated_cost: '150.00',
        actual_cost: '145.50',
        technician_id: users[0].id
      })
      .returning()
      .execute();

    const result = await getService(services[0].id);

    // Basic field validation
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(services[0].id);
    expect(result!.customer_id).toEqual(customers[0].id);
    expect(result!.device_type).toEqual('Smartphone');
    expect(result!.device_brand).toEqual('iPhone');
    expect(result!.device_model).toEqual('iPhone 12');
    expect(result!.problem_description).toEqual('Screen cracked');
    expect(result!.diagnosis).toEqual('Needs screen replacement');
    expect(result!.repair_actions).toEqual('Replace screen assembly');
    expect(result!.status).toEqual('in_progress');
    expect(result!.technician_id).toEqual(users[0].id);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Test numeric conversions
    expect(typeof result!.estimated_cost).toBe('number');
    expect(result!.estimated_cost).toEqual(150.00);
    expect(typeof result!.actual_cost).toBe('number');
    expect(result!.actual_cost).toEqual(145.50);
  });

  it('should return null when service does not exist', async () => {
    const result = await getService(999);
    expect(result).toBeNull();
  });

  it('should handle services with null numeric values', async () => {
    // Create prerequisite customer
    const customers = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'test@example.com',
        address: '123 Test St'
      })
      .returning()
      .execute();

    // Create service with null costs
    const services = await db.insert(servicesTable)
      .values({
        customer_id: customers[0].id,
        device_type: 'Laptop',
        device_brand: 'Dell',
        device_model: null,
        problem_description: 'Won\'t turn on',
        diagnosis: null,
        repair_actions: null,
        status: 'pending',
        estimated_cost: null,
        actual_cost: null,
        technician_id: null
      })
      .returning()
      .execute();

    const result = await getService(services[0].id);

    expect(result).not.toBeNull();
    expect(result!.estimated_cost).toBeNull();
    expect(result!.actual_cost).toBeNull();
    expect(result!.device_model).toBeNull();
    expect(result!.diagnosis).toBeNull();
    expect(result!.repair_actions).toBeNull();
    expect(result!.technician_id).toBeNull();
  });

  it('should verify service exists in database after retrieval', async () => {
    // Create prerequisite customer
    const customers = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'test@example.com',
        address: '123 Test St'
      })
      .returning()
      .execute();

    // Create service record
    const services = await db.insert(servicesTable)
      .values({
        customer_id: customers[0].id,
        device_type: 'Tablet',
        device_brand: 'iPad',
        device_model: 'Air 4',
        problem_description: 'Battery drains quickly',
        status: 'pending',
        estimated_cost: '89.99'
      })
      .returning()
      .execute();

    const result = await getService(services[0].id);

    // Verify the service exists in database
    const dbServices = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, services[0].id))
      .execute();

    expect(dbServices).toHaveLength(1);
    expect(dbServices[0].device_type).toEqual('Tablet');
    expect(dbServices[0].device_brand).toEqual('iPad');
    expect(parseFloat(dbServices[0].estimated_cost!)).toEqual(89.99);

    // Verify handler returned correct data
    expect(result!.device_type).toEqual('Tablet');
    expect(result!.estimated_cost).toEqual(89.99);
  });

  it('should handle services with completed status and completion date', async () => {
    // Create prerequisite customer
    const customers = await db.insert(customersTable)
      .values({
        name: 'Test Customer',
        phone: '1234567890',
        email: 'test@example.com',
        address: '123 Test St'
      })
      .returning()
      .execute();

    const completionDate = new Date('2024-01-15T10:30:00Z');

    // Create completed service
    const services = await db.insert(servicesTable)
      .values({
        customer_id: customers[0].id,
        device_type: 'Gaming Console',
        device_brand: 'PlayStation',
        device_model: 'PS5',
        problem_description: 'Overheating issue',
        diagnosis: 'Thermal paste needs replacement',
        repair_actions: 'Applied new thermal paste and cleaned fans',
        status: 'completed',
        estimated_cost: '75.00',
        actual_cost: '70.00',
        completed_at: completionDate
      })
      .returning()
      .execute();

    const result = await getService(services[0].id);

    expect(result).not.toBeNull();
    expect(result!.status).toEqual('completed');
    expect(result!.completed_at).toEqual(completionDate);
    expect(result!.diagnosis).toEqual('Thermal paste needs replacement');
    expect(result!.repair_actions).toEqual('Applied new thermal paste and cleaned fans');
    expect(result!.estimated_cost).toEqual(75.00);
    expect(result!.actual_cost).toEqual(70.00);
  });
});