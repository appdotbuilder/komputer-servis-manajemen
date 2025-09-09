import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, stockMovementsTable, usersTable } from '../db/schema';
import { getStockReport } from '../handlers/get_stock_report';

describe('getStockReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getStockReport();
    expect(result).toEqual([]);
  });

  it('should generate basic stock report for products without movements', async () => {
    // Create test products
    await db.insert(productsTable).values([
      {
        name: 'Product A',
        description: 'Test product A',
        type: 'sparepart',
        price: '25.50',
        stock_quantity: 100,
        minimum_stock: 20
      },
      {
        name: 'Product B',
        description: 'Test product B',
        type: 'accessory',
        price: '15.00',
        stock_quantity: 5,
        minimum_stock: 10
      }
    ]).execute();

    const result = await getStockReport();

    expect(result).toHaveLength(2);
    
    // Check Product A
    const productA = result.find(r => r.product_name === 'Product A');
    expect(productA).toBeDefined();
    expect(productA!.product_id).toBeDefined();
    expect(productA!.current_stock).toBe(100);
    expect(productA!.minimum_stock).toBe(20);
    expect(productA!.stock_in).toBe(0);
    expect(productA!.stock_out).toBe(0);
    expect(productA!.stock_value).toBe(2550); // 100 * 25.50
    expect(productA!.is_low_stock).toBe(false);

    // Check Product B (low stock)
    const productB = result.find(r => r.product_name === 'Product B');
    expect(productB).toBeDefined();
    expect(productB!.current_stock).toBe(5);
    expect(productB!.minimum_stock).toBe(10);
    expect(productB!.stock_value).toBe(75); // 5 * 15.00
    expect(productB!.is_low_stock).toBe(true);
  });

  it('should include stock movements in the report', async () => {
    // Create test user for stock movements
    const userResult = await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hash',
      full_name: 'Test User',
      role: 'admin'
    }).returning().execute();

    const userId = userResult[0].id;

    // Create test product
    const productResult = await db.insert(productsTable).values({
      name: 'Test Product',
      description: 'Product with movements',
      type: 'sparepart',
      price: '10.00',
      stock_quantity: 50,
      minimum_stock: 15
    }).returning().execute();

    const productId = productResult[0].id;

    // Create stock movements
    await db.insert(stockMovementsTable).values([
      {
        product_id: productId,
        type: 'in',
        quantity: 30,
        price_per_unit: '10.00',
        notes: 'Stock in',
        created_by: userId
      },
      {
        product_id: productId,
        type: 'in',
        quantity: 20,
        price_per_unit: '10.00',
        notes: 'More stock in',
        created_by: userId
      },
      {
        product_id: productId,
        type: 'out',
        quantity: 15,
        notes: 'Stock out',
        created_by: userId
      },
      {
        product_id: productId,
        type: 'out',
        quantity: 10,
        notes: 'More stock out',
        created_by: userId
      }
    ]).execute();

    const result = await getStockReport();

    expect(result).toHaveLength(1);
    const report = result[0];
    
    expect(report.product_name).toBe('Test Product');
    expect(report.current_stock).toBe(50);
    expect(report.minimum_stock).toBe(15);
    expect(report.stock_in).toBe(50); // 30 + 20
    expect(report.stock_out).toBe(25); // 15 + 10
    expect(report.stock_value).toBe(500); // 50 * 10.00
    expect(report.is_low_stock).toBe(false);
  });

  it('should correctly identify low stock products', async () => {
    await db.insert(productsTable).values([
      {
        name: 'Normal Stock',
        description: 'Product with normal stock',
        type: 'sparepart',
        price: '5.00',
        stock_quantity: 25,
        minimum_stock: 20
      },
      {
        name: 'At Minimum',
        description: 'Product at minimum stock',
        type: 'accessory',
        price: '8.00',
        stock_quantity: 10,
        minimum_stock: 10
      },
      {
        name: 'Below Minimum',
        description: 'Product below minimum stock',
        type: 'sparepart',
        price: '12.00',
        stock_quantity: 3,
        minimum_stock: 15
      },
      {
        name: 'Zero Stock',
        description: 'Product with zero stock',
        type: 'accessory',
        price: '20.00',
        stock_quantity: 0,
        minimum_stock: 5
      }
    ]).execute();

    const result = await getStockReport();

    expect(result).toHaveLength(4);

    const normalStock = result.find(r => r.product_name === 'Normal Stock');
    expect(normalStock!.is_low_stock).toBe(false);

    const atMinimum = result.find(r => r.product_name === 'At Minimum');
    expect(atMinimum!.is_low_stock).toBe(true); // At minimum is considered low stock

    const belowMinimum = result.find(r => r.product_name === 'Below Minimum');
    expect(belowMinimum!.is_low_stock).toBe(true);

    const zeroStock = result.find(r => r.product_name === 'Zero Stock');
    expect(zeroStock!.is_low_stock).toBe(true);
    expect(zeroStock!.stock_value).toBe(0);
  });

  it('should handle products with no stock movements correctly', async () => {
    // Create user for other products that might have movements
    const userResult = await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hash',
      full_name: 'Test User',
      role: 'admin'
    }).returning().execute();

    const userId = userResult[0].id;

    // Create multiple products
    const productResults = await db.insert(productsTable).values([
      {
        name: 'No Movements',
        description: 'Product without movements',
        type: 'sparepart',
        price: '7.50',
        stock_quantity: 40,
        minimum_stock: 10
      },
      {
        name: 'With Movements',
        description: 'Product with movements',
        type: 'accessory',
        price: '15.00',
        stock_quantity: 20,
        minimum_stock: 5
      }
    ]).returning().execute();

    // Add movements only to the second product
    await db.insert(stockMovementsTable).values({
      product_id: productResults[1].id,
      type: 'in',
      quantity: 25,
      price_per_unit: '15.00',
      created_by: userId
    }).execute();

    const result = await getStockReport();

    expect(result).toHaveLength(2);

    const noMovements = result.find(r => r.product_name === 'No Movements');
    expect(noMovements!.stock_in).toBe(0);
    expect(noMovements!.stock_out).toBe(0);
    expect(noMovements!.stock_value).toBe(300); // 40 * 7.50

    const withMovements = result.find(r => r.product_name === 'With Movements');
    expect(withMovements!.stock_in).toBe(25);
    expect(withMovements!.stock_out).toBe(0);
    expect(withMovements!.stock_value).toBe(300); // 20 * 15.00
  });

  it('should calculate stock values with decimal precision', async () => {
    await db.insert(productsTable).values({
      name: 'Decimal Product',
      description: 'Product with decimal price',
      type: 'sparepart',
      price: '12.99',
      stock_quantity: 7,
      minimum_stock: 5
    }).execute();

    const result = await getStockReport();

    expect(result).toHaveLength(1);
    expect(result[0].stock_value).toBe(90.93); // 7 * 12.99
    expect(typeof result[0].stock_value).toBe('number');
    expect(result[0].is_low_stock).toBe(false);
  });
});