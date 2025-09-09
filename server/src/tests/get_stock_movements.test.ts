import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stockMovementsTable, productsTable, usersTable } from '../db/schema';
import { getStockMovements } from '../handlers/get_stock_movements';

describe('getStockMovements', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no stock movements exist', async () => {
    const result = await getStockMovements();
    
    expect(result).toEqual([]);
  });

  it('should fetch all stock movements with correct field types', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'technician'
      })
      .returning()
      .execute();

    const [product] = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        type: 'sparepart',
        price: '25.99',
        stock_quantity: 100,
        minimum_stock: 10
      })
      .returning()
      .execute();

    // Create stock movements with different types and prices
    await db.insert(stockMovementsTable)
      .values([
        {
          product_id: product.id,
          type: 'in',
          quantity: 50,
          price_per_unit: '12.50',
          notes: 'Initial stock',
          created_by: user.id
        },
        {
          product_id: product.id,
          type: 'out',
          quantity: 10,
          price_per_unit: '25.99',
          notes: 'Sale to customer',
          created_by: user.id
        },
        {
          product_id: product.id,
          type: 'in',
          quantity: 25,
          price_per_unit: null, // Test null price
          notes: 'Return from customer',
          created_by: user.id
        }
      ])
      .execute();

    const result = await getStockMovements();

    expect(result).toHaveLength(3);

    // Verify field types and values
    result.forEach(movement => {
      expect(movement.id).toBeDefined();
      expect(movement.product_id).toEqual(product.id);
      expect(['in', 'out']).toContain(movement.type);
      expect(typeof movement.quantity).toBe('number');
      expect(movement.created_by).toEqual(user.id);
      expect(movement.created_at).toBeInstanceOf(Date);
      
      // Verify numeric conversion for price_per_unit
      if (movement.price_per_unit !== null) {
        expect(typeof movement.price_per_unit).toBe('number');
      }
    });

    // Verify specific values
    const inMovements = result.filter(m => m.type === 'in');
    const outMovements = result.filter(m => m.type === 'out');
    
    expect(inMovements).toHaveLength(2);
    expect(outMovements).toHaveLength(1);
    
    // Check price conversions
    const pricedMovements = result.filter(m => m.price_per_unit !== null);
    expect(pricedMovements).toHaveLength(2);
    expect(pricedMovements.some(m => m.price_per_unit === 12.50)).toBe(true);
    expect(pricedMovements.some(m => m.price_per_unit === 25.99)).toBe(true);
  });

  it('should return movements ordered by creation date descending', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'technician'
      })
      .returning()
      .execute();

    const [product] = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        type: 'sparepart',
        price: '25.99',
        stock_quantity: 100,
        minimum_stock: 10
      })
      .returning()
      .execute();

    // Create movements with slight time delays
    const [firstMovement] = await db.insert(stockMovementsTable)
      .values({
        product_id: product.id,
        type: 'in',
        quantity: 50,
        price_per_unit: '12.50',
        notes: 'First movement',
        created_by: user.id
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const [secondMovement] = await db.insert(stockMovementsTable)
      .values({
        product_id: product.id,
        type: 'out',
        quantity: 10,
        price_per_unit: '25.99',
        notes: 'Second movement',
        created_by: user.id
      })
      .returning()
      .execute();

    const result = await getStockMovements();

    expect(result).toHaveLength(2);
    // Newest first (descending order)
    expect(result[0].id).toEqual(secondMovement.id);
    expect(result[1].id).toEqual(firstMovement.id);
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should handle movements with null price_per_unit correctly', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'technician'
      })
      .returning()
      .execute();

    const [product] = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        type: 'sparepart',
        price: '25.99',
        stock_quantity: 100,
        minimum_stock: 10
      })
      .returning()
      .execute();

    // Create movement with null price
    await db.insert(stockMovementsTable)
      .values({
        product_id: product.id,
        type: 'in',
        quantity: 50,
        price_per_unit: null,
        notes: 'Movement without price',
        created_by: user.id
      })
      .execute();

    const result = await getStockMovements();

    expect(result).toHaveLength(1);
    expect(result[0].price_per_unit).toBeNull();
    expect(result[0].notes).toEqual('Movement without price');
  });

  it('should handle movements from multiple products and users', async () => {
    // Create multiple users
    const [user1] = await db.insert(usersTable)
      .values({
        username: 'user1',
        email: 'user1@example.com',
        password_hash: 'hashedpassword',
        full_name: 'User One',
        role: 'technician'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        username: 'user2',
        email: 'user2@example.com',
        password_hash: 'hashedpassword',
        full_name: 'User Two',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create multiple products
    const [product1] = await db.insert(productsTable)
      .values({
        name: 'Product 1',
        description: 'First product',
        type: 'sparepart',
        price: '15.00',
        stock_quantity: 50,
        minimum_stock: 5
      })
      .returning()
      .execute();

    const [product2] = await db.insert(productsTable)
      .values({
        name: 'Product 2',
        description: 'Second product',
        type: 'accessory',
        price: '30.00',
        stock_quantity: 25,
        minimum_stock: 3
      })
      .returning()
      .execute();

    // Create movements for different products and users
    await db.insert(stockMovementsTable)
      .values([
        {
          product_id: product1.id,
          type: 'in',
          quantity: 20,
          price_per_unit: '12.00',
          notes: 'Product 1 by User 1',
          created_by: user1.id
        },
        {
          product_id: product2.id,
          type: 'out',
          quantity: 5,
          price_per_unit: '28.50',
          notes: 'Product 2 by User 2',
          created_by: user2.id
        }
      ])
      .execute();

    const result = await getStockMovements();

    expect(result).toHaveLength(2);

    // Verify all movements are returned
    const product1Movements = result.filter(m => m.product_id === product1.id);
    const product2Movements = result.filter(m => m.product_id === product2.id);
    const user1Movements = result.filter(m => m.created_by === user1.id);
    const user2Movements = result.filter(m => m.created_by === user2.id);

    expect(product1Movements).toHaveLength(1);
    expect(product2Movements).toHaveLength(1);
    expect(user1Movements).toHaveLength(1);
    expect(user2Movements).toHaveLength(1);

    // Verify price conversions
    expect(product1Movements[0].price_per_unit).toEqual(12.00);
    expect(product2Movements[0].price_per_unit).toEqual(28.50);
  });
});