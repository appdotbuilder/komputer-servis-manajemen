import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type CreateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

// Helper function to create a test product
const createTestProduct = async (): Promise<number> => {
  const testProduct: CreateProductInput = {
    name: 'Original Product',
    description: 'Original description',
    type: 'sparepart',
    price: 10.99,
    stock_quantity: 50,
    minimum_stock: 10
  };

  const result = await db.insert(productsTable)
    .values({
      name: testProduct.name,
      description: testProduct.description,
      type: testProduct.type,
      price: testProduct.price.toString(),
      stock_quantity: testProduct.stock_quantity,
      minimum_stock: testProduct.minimum_stock
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all product fields', async () => {
    const productId = await createTestProduct();
    
    const updateInput: UpdateProductInput = {
      id: productId,
      name: 'Updated Product',
      description: 'Updated description',
      type: 'accessory',
      price: 25.99,
      stock_quantity: 75,
      minimum_stock: 15
    };

    const result = await updateProduct(updateInput);

    // Verify all fields are updated correctly
    expect(result.id).toEqual(productId);
    expect(result.name).toEqual('Updated Product');
    expect(result.description).toEqual('Updated description');
    expect(result.type).toEqual('accessory');
    expect(result.price).toEqual(25.99);
    expect(typeof result.price).toEqual('number');
    expect(result.stock_quantity).toEqual(75);
    expect(result.minimum_stock).toEqual(15);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    const productId = await createTestProduct();
    
    const updateInput: UpdateProductInput = {
      id: productId,
      name: 'Partially Updated Product',
      price: 19.99
    };

    const result = await updateProduct(updateInput);

    // Verify only specified fields are updated
    expect(result.name).toEqual('Partially Updated Product');
    expect(result.price).toEqual(19.99);
    
    // Verify other fields remain unchanged
    expect(result.description).toEqual('Original description');
    expect(result.type).toEqual('sparepart');
    expect(result.stock_quantity).toEqual(50);
    expect(result.minimum_stock).toEqual(10);
  });

  it('should handle nullable fields correctly', async () => {
    const productId = await createTestProduct();
    
    const updateInput: UpdateProductInput = {
      id: productId,
      description: null
    };

    const result = await updateProduct(updateInput);

    // Verify nullable field can be set to null
    expect(result.description).toBeNull();
    
    // Verify other fields remain unchanged
    expect(result.name).toEqual('Original Product');
    expect(result.type).toEqual('sparepart');
    expect(result.price).toEqual(10.99);
  });

  it('should update product in database', async () => {
    const productId = await createTestProduct();
    
    const updateInput: UpdateProductInput = {
      id: productId,
      name: 'Database Test Product',
      price: 99.99,
      stock_quantity: 200
    };

    await updateProduct(updateInput);

    // Query database directly to verify changes were persisted
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(products).toHaveLength(1);
    const product = products[0];
    expect(product.name).toEqual('Database Test Product');
    expect(parseFloat(product.price)).toEqual(99.99);
    expect(product.stock_quantity).toEqual(200);
    expect(product.updated_at).toBeInstanceOf(Date);
  });

  it('should update timestamp correctly', async () => {
    const productId = await createTestProduct();
    
    // Get original timestamp
    const originalProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();
    
    const originalTimestamp = originalProduct[0].updated_at;
    
    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const updateInput: UpdateProductInput = {
      id: productId,
      name: 'Timestamp Test Product'
    };

    const result = await updateProduct(updateInput);

    // Verify updated_at timestamp was changed
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });

  it('should handle stock quantity edge cases', async () => {
    const productId = await createTestProduct();
    
    const updateInput: UpdateProductInput = {
      id: productId,
      stock_quantity: 0,
      minimum_stock: 0
    };

    const result = await updateProduct(updateInput);

    expect(result.stock_quantity).toEqual(0);
    expect(result.minimum_stock).toEqual(0);
  });

  it('should throw error for non-existent product', async () => {
    const updateInput: UpdateProductInput = {
      id: 999999, // Non-existent ID
      name: 'This should fail'
    };

    await expect(updateProduct(updateInput)).rejects.toThrow(/Product with id 999999 not found/i);
  });

  it('should handle large stock quantities', async () => {
    const productId = await createTestProduct();
    
    const updateInput: UpdateProductInput = {
      id: productId,
      stock_quantity: 1000000,
      minimum_stock: 50000
    };

    const result = await updateProduct(updateInput);

    expect(result.stock_quantity).toEqual(1000000);
    expect(result.minimum_stock).toEqual(50000);
  });
});