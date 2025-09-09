import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

// Test input for sparepart
const testSparePartInput: CreateProductInput = {
  name: 'iPhone Screen',
  description: 'Replacement screen for iPhone 12',
  type: 'sparepart',
  price: 89.99,
  stock_quantity: 50,
  minimum_stock: 10
};

// Test input for accessory
const testAccessoryInput: CreateProductInput = {
  name: 'Phone Case',
  description: 'Protective case for smartphones',
  type: 'accessory',
  price: 15.50,
  stock_quantity: 100,
  minimum_stock: 20
};

// Test input with nullable fields
const minimalInput: CreateProductInput = {
  name: 'Basic Part',
  description: null,
  type: 'sparepart',
  price: 5.00,
  stock_quantity: 0,
  minimum_stock: 0
};

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a sparepart product', async () => {
    const result = await createProduct(testSparePartInput);

    // Basic field validation
    expect(result.name).toEqual('iPhone Screen');
    expect(result.description).toEqual('Replacement screen for iPhone 12');
    expect(result.type).toEqual('sparepart');
    expect(result.price).toEqual(89.99);
    expect(typeof result.price).toBe('number');
    expect(result.stock_quantity).toEqual(50);
    expect(result.minimum_stock).toEqual(10);
    expect(result.id).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an accessory product', async () => {
    const result = await createProduct(testAccessoryInput);

    expect(result.name).toEqual('Phone Case');
    expect(result.description).toEqual('Protective case for smartphones');
    expect(result.type).toEqual('accessory');
    expect(result.price).toEqual(15.50);
    expect(typeof result.price).toBe('number');
    expect(result.stock_quantity).toEqual(100);
    expect(result.minimum_stock).toEqual(20);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create product with null description', async () => {
    const result = await createProduct(minimalInput);

    expect(result.name).toEqual('Basic Part');
    expect(result.description).toBeNull();
    expect(result.type).toEqual('sparepart');
    expect(result.price).toEqual(5.00);
    expect(result.stock_quantity).toEqual(0);
    expect(result.minimum_stock).toEqual(0);
  });

  it('should save product to database', async () => {
    const result = await createProduct(testSparePartInput);

    // Query using proper drizzle syntax
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    const savedProduct = products[0];
    expect(savedProduct.name).toEqual('iPhone Screen');
    expect(savedProduct.description).toEqual('Replacement screen for iPhone 12');
    expect(savedProduct.type).toEqual('sparepart');
    expect(parseFloat(savedProduct.price)).toEqual(89.99);
    expect(savedProduct.stock_quantity).toEqual(50);
    expect(savedProduct.minimum_stock).toEqual(10);
    expect(savedProduct.created_at).toBeInstanceOf(Date);
    expect(savedProduct.updated_at).toBeInstanceOf(Date);
  });

  it('should handle decimal prices correctly', async () => {
    const decimalInput: CreateProductInput = {
      name: 'Precision Part',
      description: 'Part with precise pricing',
      type: 'sparepart',
      price: 123.45, // Two decimal places (matching schema precision)
      stock_quantity: 25,
      minimum_stock: 5
    };

    const result = await createProduct(decimalInput);

    expect(result.price).toEqual(123.45);
    expect(typeof result.price).toBe('number');

    // Verify in database
    const savedProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(parseFloat(savedProducts[0].price)).toEqual(123.45);
  });

  it('should create multiple products with unique IDs', async () => {
    const result1 = await createProduct(testSparePartInput);
    const result2 = await createProduct(testAccessoryInput);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.id).toBeGreaterThan(0);
    expect(result2.id).toBeGreaterThan(0);

    // Verify both exist in database
    const allProducts = await db.select()
      .from(productsTable)
      .execute();

    expect(allProducts).toHaveLength(2);
    
    const ids = allProducts.map(p => p.id);
    expect(ids).toContain(result1.id);
    expect(ids).toContain(result2.id);
  });

  it('should set timestamps correctly', async () => {
    const beforeCreate = new Date();
    const result = await createProduct(testSparePartInput);
    const afterCreate = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });
});