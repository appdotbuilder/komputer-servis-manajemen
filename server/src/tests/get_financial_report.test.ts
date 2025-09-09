import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, transactionsTable, usersTable } from '../db/schema';
import { type GetFinancialReportInput } from '../schema';
import { getFinancialReport } from '../handlers/get_financial_report';

// Test input data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashed',
  full_name: 'Test User',
  role: 'admin' as const
};

const testCustomer = {
  name: 'Test Customer',
  phone: '123-456-7890',
  email: 'customer@example.com',
  address: '123 Main St'
};

describe('getFinancialReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate report with no transactions', async () => {
    const input: GetFinancialReportInput = {
      period: 'daily',
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getFinancialReport(input);

    expect(result.period).toEqual('daily');
    expect(result.total_revenue).toEqual(0);
    expect(result.service_revenue).toEqual(0);
    expect(result.sales_revenue).toEqual(0);
    expect(result.total_transactions).toEqual(0);
    expect(result.period_start).toBeInstanceOf(Date);
    expect(result.period_end).toBeInstanceOf(Date);
  });

  it('should calculate service revenue correctly', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [customer] = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();

    // Create service transactions
    await db.insert(transactionsTable).values([
      {
        customer_id: customer.id,
        type: 'service',
        service_id: null,
        total_amount: '150.00',
        paid_amount: '150.00',
        payment_method: 'cash',
        notes: 'Service transaction 1',
        created_by: user.id
      },
      {
        customer_id: customer.id,
        type: 'service',
        service_id: null,
        total_amount: '250.00',
        paid_amount: '250.00',
        payment_method: 'card',
        notes: 'Service transaction 2',
        created_by: user.id
      }
    ]).execute();

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const input: GetFinancialReportInput = {
      period: 'daily',
      start_date: today.toISOString().split('T')[0],
      end_date: tomorrow.toISOString().split('T')[0]
    };

    const result = await getFinancialReport(input);

    expect(result.total_revenue).toEqual(400);
    expect(result.service_revenue).toEqual(400);
    expect(result.sales_revenue).toEqual(0);
    expect(result.total_transactions).toEqual(2);
    expect(typeof result.total_revenue).toBe('number');
  });

  it('should calculate sales revenue correctly', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [customer] = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();

    // Create sale transactions
    await db.insert(transactionsTable).values([
      {
        customer_id: customer.id,
        type: 'sale',
        service_id: null,
        total_amount: '75.50',
        paid_amount: '75.50',
        payment_method: 'cash',
        notes: 'Sale transaction 1',
        created_by: user.id
      },
      {
        customer_id: customer.id,
        type: 'sale',
        service_id: null,
        total_amount: '124.50',
        paid_amount: '124.50',
        payment_method: 'card',
        notes: 'Sale transaction 2',
        created_by: user.id
      }
    ]).execute();

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const input: GetFinancialReportInput = {
      period: 'weekly',
      start_date: today.toISOString().split('T')[0],
      end_date: tomorrow.toISOString().split('T')[0]
    };

    const result = await getFinancialReport(input);

    expect(result.total_revenue).toEqual(200);
    expect(result.service_revenue).toEqual(0);
    expect(result.sales_revenue).toEqual(200);
    expect(result.total_transactions).toEqual(2);
    expect(result.period).toEqual('weekly');
  });

  it('should calculate mixed revenue types correctly', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [customer] = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();

    // Create mixed transactions
    await db.insert(transactionsTable).values([
      {
        customer_id: customer.id,
        type: 'service',
        service_id: null,
        total_amount: '300.00',
        paid_amount: '300.00',
        payment_method: 'cash',
        notes: 'Service transaction',
        created_by: user.id
      },
      {
        customer_id: customer.id,
        type: 'sale',
        service_id: null,
        total_amount: '100.00',
        paid_amount: '100.00',
        payment_method: 'card',
        notes: 'Sale transaction',
        created_by: user.id
      },
      {
        customer_id: customer.id,
        type: 'service',
        service_id: null,
        total_amount: '200.00',
        paid_amount: '200.00',
        payment_method: 'cash',
        notes: 'Another service transaction',
        created_by: user.id
      }
    ]).execute();

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const input: GetFinancialReportInput = {
      period: 'monthly',
      start_date: today.toISOString().split('T')[0],
      end_date: tomorrow.toISOString().split('T')[0]
    };

    const result = await getFinancialReport(input);

    expect(result.total_revenue).toEqual(600);
    expect(result.service_revenue).toEqual(500);
    expect(result.sales_revenue).toEqual(100);
    expect(result.total_transactions).toEqual(3);
    expect(result.period).toEqual('monthly');
  });

  it('should filter transactions by date range correctly', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [customer] = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();

    // Create transactions with different dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Transaction within range
    await db.insert(transactionsTable).values({
      customer_id: customer.id,
      type: 'service',
      service_id: null,
      total_amount: '100.00',
      paid_amount: '100.00',
      payment_method: 'cash',
      notes: 'Transaction within range',
      created_by: user.id
    }).execute();

    const input: GetFinancialReportInput = {
      period: 'daily',
      start_date: today.toISOString().split('T')[0],
      end_date: tomorrow.toISOString().split('T')[0]
    };

    const result = await getFinancialReport(input);

    expect(result.total_revenue).toEqual(100);
    expect(result.total_transactions).toEqual(1);
    expect(result.period_start.getTime()).toBeLessThanOrEqual(today.getTime());
    expect(result.period_end.getTime()).toBeGreaterThanOrEqual(today.getTime());
  });

  it('should handle decimal amounts correctly', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [customer] = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();

    // Create transaction with decimal amounts
    await db.insert(transactionsTable).values({
      customer_id: customer.id,
      type: 'service',
      service_id: null,
      total_amount: '99.99',
      paid_amount: '99.99',
      payment_method: 'cash',
      notes: 'Decimal amount test',
      created_by: user.id
    }).execute();

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const input: GetFinancialReportInput = {
      period: 'daily',
      start_date: today.toISOString().split('T')[0],
      end_date: tomorrow.toISOString().split('T')[0]
    };

    const result = await getFinancialReport(input);

    expect(result.total_revenue).toEqual(99.99);
    expect(result.service_revenue).toEqual(99.99);
    expect(typeof result.total_revenue).toBe('number');
  });
});