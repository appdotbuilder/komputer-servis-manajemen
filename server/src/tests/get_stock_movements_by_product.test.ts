import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, stockMovementsTable } from '../db/schema';
import { getStockMovementsByProduct } from '../handlers/get_stock_movements_by_product';
import { eq } from 'drizzle-orm';

describe('getStockMovementsByProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return stock movements for a specific product', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'Test description',
        type: 'sparepart',
        price: '99.99',
        stock_quantity: 100,
        minimum_stock: 10
      })
      .returning()
      .execute();

    const productId = productResult[0].id;
    const userId = userResult[0].id;

    // Create stock movements for the product (insert separately to ensure different timestamps)
    await db.insert(stockMovementsTable)
      .values({
        product_id: productId,
        type: 'in',
        quantity: 50,
        price_per_unit: '19.99',
        notes: 'Initial stock',
        created_by: userId
      })
      .execute();

    await db.insert(stockMovementsTable)
      .values({
        product_id: productId,
        type: 'out',
        quantity: 10,
        price_per_unit: null,
        notes: 'Sale',
        created_by: userId
      })
      .execute();

    await db.insert(stockMovementsTable)
      .values({
        product_id: productId,
        type: 'in',
        quantity: 25,
        price_per_unit: '18.50',
        notes: 'Restock',
        created_by: userId
      })
      .execute();

    const result = await getStockMovementsByProduct(productId);

    // Should return all 3 movements for this product
    expect(result).toHaveLength(3);
    
    // Verify all movements belong to the correct product
    result.forEach(movement => {
      expect(movement.product_id).toEqual(productId);
    });

    // Check that movements are ordered by created_at desc (newest first)
    expect(result[0].notes).toEqual('Restock');
    expect(result[1].notes).toEqual('Sale');
    expect(result[2].notes).toEqual('Initial stock');

    // Verify numeric conversion
    expect(typeof result[0].price_per_unit).toEqual('number');
    expect(result[0].price_per_unit).toEqual(18.50);
    expect(result[1].price_per_unit).toBeNull();
    expect(result[2].price_per_unit).toEqual(19.99);
  });

  it('should return empty array for product with no stock movements', async () => {
    // Create test user and product
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'Test description',
        type: 'sparepart',
        price: '99.99',
        stock_quantity: 100,
        minimum_stock: 10
      })
      .returning()
      .execute();

    const result = await getStockMovementsByProduct(productResult[0].id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return movements for the specified product', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create two test products
    const productResults = await db.insert(productsTable)
      .values([
        {
          name: 'Product A',
          description: 'Product A description',
          type: 'sparepart',
          price: '99.99',
          stock_quantity: 100,
          minimum_stock: 10
        },
        {
          name: 'Product B',
          description: 'Product B description',
          type: 'accessory',
          price: '49.99',
          stock_quantity: 50,
          minimum_stock: 5
        }
      ])
      .returning()
      .execute();

    const productAId = productResults[0].id;
    const productBId = productResults[1].id;
    const userId = userResult[0].id;

    // Create stock movements for both products
    await db.insert(stockMovementsTable)
      .values([
        {
          product_id: productAId,
          type: 'in',
          quantity: 30,
          price_per_unit: '15.00',
          notes: 'Product A movement',
          created_by: userId
        },
        {
          product_id: productBId,
          type: 'out',
          quantity: 5,
          price_per_unit: null,
          notes: 'Product B movement',
          created_by: userId
        },
        {
          product_id: productAId,
          type: 'out',
          quantity: 10,
          price_per_unit: null,
          notes: 'Another Product A movement',
          created_by: userId
        }
      ])
      .execute();

    const resultA = await getStockMovementsByProduct(productAId);
    const resultB = await getStockMovementsByProduct(productBId);

    // Product A should have 2 movements
    expect(resultA).toHaveLength(2);
    resultA.forEach(movement => {
      expect(movement.product_id).toEqual(productAId);
    });

    // Product B should have 1 movement
    expect(resultB).toHaveLength(1);
    expect(resultB[0].product_id).toEqual(productBId);
    expect(resultB[0].notes).toEqual('Product B movement');
  });

  it('should handle all stock movement types correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        role: 'technician'
      })
      .returning()
      .execute();

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'Test description',
        type: 'accessory',
        price: '25.00',
        stock_quantity: 75,
        minimum_stock: 15
      })
      .returning()
      .execute();

    const productId = productResult[0].id;
    const userId = userResult[0].id;

    // Create movements with different types
    await db.insert(stockMovementsTable)
      .values([
        {
          product_id: productId,
          type: 'in',
          quantity: 100,
          price_per_unit: '22.50',
          notes: 'Stock in movement',
          created_by: userId
        },
        {
          product_id: productId,
          type: 'out',
          quantity: 25,
          price_per_unit: null,
          notes: 'Stock out movement',
          created_by: userId
        }
      ])
      .execute();

    const result = await getStockMovementsByProduct(productId);

    expect(result).toHaveLength(2);
    
    // Find movements by type
    const inMovement = result.find(m => m.type === 'in');
    const outMovement = result.find(m => m.type === 'out');

    expect(inMovement).toBeDefined();
    expect(outMovement).toBeDefined();
    
    expect(inMovement?.quantity).toEqual(100);
    expect(inMovement?.price_per_unit).toEqual(22.50);
    expect(inMovement?.notes).toEqual('Stock in movement');
    
    expect(outMovement?.quantity).toEqual(25);
    expect(outMovement?.price_per_unit).toBeNull();
    expect(outMovement?.notes).toEqual('Stock out movement');
  });
});