import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stockMovementsTable, productsTable } from '../db/schema';
import { type CreateStockMovementInput } from '../schema';
import { createStockMovement } from '../handlers/create_stock_movement';
import { eq } from 'drizzle-orm';

// Test product data
const testProduct = {
  name: 'Test Product',
  description: 'A product for testing',
  type: 'sparepart' as const,
  price: '29.99',
  stock_quantity: 50,
  minimum_stock: 10
};

// Test stock movement inputs
const stockInInput: CreateStockMovementInput = {
  product_id: 1,
  type: 'in',
  quantity: 20,
  price_per_unit: 25.50,
  notes: 'Restocking inventory'
};

const stockOutInput: CreateStockMovementInput = {
  product_id: 1,
  type: 'out',
  quantity: 15,
  price_per_unit: null,
  notes: 'Sold to customer'
};

describe('createStockMovement', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create a test product for stock movements
    await db.insert(productsTable)
      .values(testProduct)
      .execute();
  });

  it('should create stock in movement and increase product quantity', async () => {
    const result = await createStockMovement(stockInInput);

    // Validate stock movement record
    expect(result.product_id).toEqual(1);
    expect(result.type).toEqual('in');
    expect(result.quantity).toEqual(20);
    expect(result.price_per_unit).toEqual(25.50);
    expect(result.notes).toEqual('Restocking inventory');
    expect(result.created_by).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(typeof result.price_per_unit).toBe('number');

    // Verify product stock was increased
    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, 1))
      .execute();

    expect(product[0].stock_quantity).toEqual(70); // 50 + 20
  });

  it('should create stock out movement and decrease product quantity', async () => {
    const result = await createStockMovement(stockOutInput);

    // Validate stock movement record
    expect(result.product_id).toEqual(1);
    expect(result.type).toEqual('out');
    expect(result.quantity).toEqual(15);
    expect(result.price_per_unit).toBeNull();
    expect(result.notes).toEqual('Sold to customer');
    expect(result.created_by).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify product stock was decreased
    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, 1))
      .execute();

    expect(product[0].stock_quantity).toEqual(35); // 50 - 15
  });

  it('should save stock movement to database correctly', async () => {
    const result = await createStockMovement(stockInInput);

    // Query the stock movement from database
    const stockMovements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.id, result.id))
      .execute();

    expect(stockMovements).toHaveLength(1);
    const savedMovement = stockMovements[0];
    expect(savedMovement.product_id).toEqual(1);
    expect(savedMovement.type).toEqual('in');
    expect(savedMovement.quantity).toEqual(20);
    expect(parseFloat(savedMovement.price_per_unit!)).toEqual(25.50);
    expect(savedMovement.notes).toEqual('Restocking inventory');
    expect(savedMovement.created_by).toEqual(1);
    expect(savedMovement.created_at).toBeInstanceOf(Date);
  });

  it('should handle movement without price_per_unit', async () => {
    const inputWithoutPrice: CreateStockMovementInput = {
      product_id: 1,
      type: 'in',
      quantity: 10,
      price_per_unit: null,
      notes: 'Free sample received'
    };

    const result = await createStockMovement(inputWithoutPrice);

    expect(result.price_per_unit).toBeNull();
    expect(result.quantity).toEqual(10);
    expect(result.notes).toEqual('Free sample received');

    // Verify in database
    const savedMovements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.id, result.id))
      .execute();

    expect(savedMovements[0].price_per_unit).toBeNull();
  });

  it('should handle movement without notes', async () => {
    const inputWithoutNotes: CreateStockMovementInput = {
      product_id: 1,
      type: 'out',
      quantity: 5,
      price_per_unit: 30.00,
      notes: null
    };

    const result = await createStockMovement(inputWithoutNotes);

    expect(result.notes).toBeNull();
    expect(result.quantity).toEqual(5);
    expect(result.price_per_unit).toEqual(30.00);

    // Verify product stock was decreased
    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, 1))
      .execute();

    expect(product[0].stock_quantity).toEqual(45); // 50 - 5
  });

  it('should throw error for non-existent product', async () => {
    const invalidInput: CreateStockMovementInput = {
      product_id: 999,
      type: 'in',
      quantity: 10,
      price_per_unit: 20.00,
      notes: 'This should fail'
    };

    await expect(createStockMovement(invalidInput)).rejects.toThrow(/product with id 999 not found/i);
  });

  it('should handle multiple consecutive movements correctly', async () => {
    // First movement: stock in
    await createStockMovement({
      product_id: 1,
      type: 'in',
      quantity: 30,
      price_per_unit: 20.00,
      notes: 'First restock'
    });

    // Second movement: stock out
    await createStockMovement({
      product_id: 1,
      type: 'out',
      quantity: 25,
      price_per_unit: null,
      notes: 'Sale'
    });

    // Third movement: stock in again
    await createStockMovement({
      product_id: 1,
      type: 'in',
      quantity: 10,
      price_per_unit: 22.00,
      notes: 'Second restock'
    });

    // Verify final stock quantity: 50 + 30 - 25 + 10 = 65
    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, 1))
      .execute();

    expect(product[0].stock_quantity).toEqual(65);

    // Verify all movements were recorded
    const movements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.product_id, 1))
      .execute();

    expect(movements).toHaveLength(3);
  });

  it('should allow stock to go below zero for out movements', async () => {
    const largeOutInput: CreateStockMovementInput = {
      product_id: 1,
      type: 'out',
      quantity: 100, // More than current stock of 50
      price_per_unit: null,
      notes: 'Large order - oversold'
    };

    const result = await createStockMovement(largeOutInput);

    expect(result.quantity).toEqual(100);
    expect(result.type).toEqual('out');

    // Verify product stock went negative
    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, 1))
      .execute();

    expect(product[0].stock_quantity).toEqual(-50); // 50 - 100
  });
});