import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, servicesTable, productsTable, transactionsTable, usersTable } from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats for empty database', async () => {
    const stats = await getDashboardStats();

    expect(stats.total_customers).toEqual(0);
    expect(stats.pending_services).toEqual(0);
    expect(stats.completed_services_today).toEqual(0);
    expect(stats.low_stock_items).toEqual(0);
    expect(stats.today_revenue).toEqual(0);
    expect(stats.this_month_revenue).toEqual(0);
  });

  it('should count total customers correctly', async () => {
    // Create test customers
    await db.insert(customersTable)
      .values([
        { name: 'Customer 1', phone: '123456789', email: 'test1@example.com', address: 'Address 1' },
        { name: 'Customer 2', phone: '987654321', email: 'test2@example.com', address: 'Address 2' },
        { name: 'Customer 3', phone: null, email: null, address: null }
      ])
      .execute();

    const stats = await getDashboardStats();

    expect(stats.total_customers).toEqual(3);
  });

  it('should count pending services correctly', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({ name: 'Test Customer', phone: '123456789', email: 'test@example.com', address: 'Test Address' })
      .returning()
      .execute();

    // Create services with different statuses
    await db.insert(servicesTable)
      .values([
        {
          customer_id: customerResult[0].id,
          device_type: 'Phone',
          problem_description: 'Screen broken',
          status: 'pending'
        },
        {
          customer_id: customerResult[0].id,
          device_type: 'Laptop',
          problem_description: 'Battery issue',
          status: 'pending'
        },
        {
          customer_id: customerResult[0].id,
          device_type: 'Tablet',
          problem_description: 'Won\'t turn on',
          status: 'in_progress'
        },
        {
          customer_id: customerResult[0].id,
          device_type: 'Phone',
          problem_description: 'Camera issue',
          status: 'completed'
        }
      ])
      .execute();

    const stats = await getDashboardStats();

    expect(stats.pending_services).toEqual(2);
  });

  it('should count completed services today correctly', async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({ name: 'Test Customer', phone: '123456789', email: 'test@example.com', address: 'Test Address' })
      .returning()
      .execute();

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Create services completed at different times
    await db.insert(servicesTable)
      .values([
        {
          customer_id: customerResult[0].id,
          device_type: 'Phone',
          problem_description: 'Screen broken',
          status: 'completed',
          completed_at: today
        },
        {
          customer_id: customerResult[0].id,
          device_type: 'Laptop',
          problem_description: 'Battery issue',
          status: 'completed',
          completed_at: today
        },
        {
          customer_id: customerResult[0].id,
          device_type: 'Tablet',
          problem_description: 'Won\'t turn on',
          status: 'completed',
          completed_at: yesterday
        },
        {
          customer_id: customerResult[0].id,
          device_type: 'Phone',
          problem_description: 'Camera issue',
          status: 'pending'
        }
      ])
      .execute();

    const stats = await getDashboardStats();

    expect(stats.completed_services_today).toEqual(2);
  });

  it('should count low stock items correctly', async () => {
    // Create products with different stock levels
    await db.insert(productsTable)
      .values([
        {
          name: 'Product 1',
          description: 'Low stock product',
          type: 'sparepart',
          price: '10.00',
          stock_quantity: 5,
          minimum_stock: 10
        },
        {
          name: 'Product 2',
          description: 'At minimum stock',
          type: 'accessory',
          price: '20.00',
          stock_quantity: 15,
          minimum_stock: 15
        },
        {
          name: 'Product 3',
          description: 'Good stock level',
          type: 'sparepart',
          price: '30.00',
          stock_quantity: 50,
          minimum_stock: 20
        },
        {
          name: 'Product 4',
          description: 'Zero stock',
          type: 'accessory',
          price: '40.00',
          stock_quantity: 0,
          minimum_stock: 5
        }
      ])
      .execute();

    const stats = await getDashboardStats();

    expect(stats.low_stock_items).toEqual(3); // Products 1, 2, and 4
  });

  it('should calculate today revenue correctly', async () => {
    // Create test customer and user
    const customerResult = await db.insert(customersTable)
      .values({ name: 'Test Customer', phone: '123456789', email: 'test@example.com', address: 'Test Address' })
      .returning()
      .execute();

    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'user@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Create transactions for different dates
    await db.insert(transactionsTable)
      .values([
        {
          customer_id: customerResult[0].id,
          type: 'sale',
          service_id: null,
          total_amount: '100.00',
          paid_amount: '100.00',
          payment_method: 'cash',
          notes: null,
          created_by: userResult[0].id,
          created_at: today
        },
        {
          customer_id: customerResult[0].id,
          type: 'service',
          service_id: null,
          total_amount: '50.00',
          paid_amount: '45.00',
          payment_method: 'card',
          notes: null,
          created_by: userResult[0].id,
          created_at: today
        },
        {
          customer_id: customerResult[0].id,
          type: 'sale',
          service_id: null,
          total_amount: '200.00',
          paid_amount: '200.00',
          payment_method: 'cash',
          notes: null,
          created_by: userResult[0].id,
          created_at: yesterday
        }
      ])
      .execute();

    const stats = await getDashboardStats();

    expect(stats.today_revenue).toEqual(145); // 100 + 45
    expect(typeof stats.today_revenue).toBe('number');
  });

  it('should calculate this month revenue correctly', async () => {
    // Create test customer and user
    const customerResult = await db.insert(customersTable)
      .values({ name: 'Test Customer', phone: '123456789', email: 'test@example.com', address: 'Test Address' })
      .returning()
      .execute();

    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'user@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15);

    // Create transactions for different months
    await db.insert(transactionsTable)
      .values([
        {
          customer_id: customerResult[0].id,
          type: 'sale',
          service_id: null,
          total_amount: '100.00',
          paid_amount: '100.00',
          payment_method: 'cash',
          notes: null,
          created_by: userResult[0].id,
          created_at: firstDayOfMonth
        },
        {
          customer_id: customerResult[0].id,
          type: 'service',
          service_id: null,
          total_amount: '50.00',
          paid_amount: '30.00',
          payment_method: 'card',
          notes: null,
          created_by: userResult[0].id,
          created_at: today
        },
        {
          customer_id: customerResult[0].id,
          type: 'sale',
          service_id: null,
          total_amount: '200.00',
          paid_amount: '200.00',
          payment_method: 'cash',
          notes: null,
          created_by: userResult[0].id,
          created_at: lastMonth
        }
      ])
      .execute();

    const stats = await getDashboardStats();

    expect(stats.this_month_revenue).toEqual(130); // 100 + 30 (this month only)
    expect(typeof stats.this_month_revenue).toBe('number');
  });

  it('should return all stats together correctly', async () => {
    // Create comprehensive test data
    const customerResult = await db.insert(customersTable)
      .values([
        { name: 'Customer 1', phone: '123456789', email: 'test1@example.com', address: 'Address 1' },
        { name: 'Customer 2', phone: '987654321', email: 'test2@example.com', address: 'Address 2' }
      ])
      .returning()
      .execute();

    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'user@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create services
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    await db.insert(servicesTable)
      .values([
        {
          customer_id: customerResult[0].id,
          device_type: 'Phone',
          problem_description: 'Screen broken',
          status: 'pending'
        },
        {
          customer_id: customerResult[1].id,
          device_type: 'Laptop',
          problem_description: 'Battery issue',
          status: 'completed',
          completed_at: today
        }
      ])
      .execute();

    // Create products
    await db.insert(productsTable)
      .values([
        {
          name: 'Product 1',
          description: 'Low stock product',
          type: 'sparepart',
          price: '10.00',
          stock_quantity: 2,
          minimum_stock: 5
        }
      ])
      .execute();

    // Create transaction
    await db.insert(transactionsTable)
      .values({
        customer_id: customerResult[0].id,
        type: 'sale',
        service_id: null,
        total_amount: '75.00',
        paid_amount: '75.00',
        payment_method: 'cash',
        notes: null,
        created_by: userResult[0].id,
        created_at: today
      })
      .execute();

    const stats = await getDashboardStats();

    expect(stats.total_customers).toEqual(2);
    expect(stats.pending_services).toEqual(1);
    expect(stats.completed_services_today).toEqual(1);
    expect(stats.low_stock_items).toEqual(1);
    expect(stats.today_revenue).toEqual(75);
    expect(stats.this_month_revenue).toEqual(75);
  });
});