import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { getProduct } from '../handlers/get_product';

// Test product data
const testProduct: CreateProductInput = {
  name: 'Test Product',
  description: 'A product for testing',
  type: 'sparepart',
  price: 29.99,
  stock_quantity: 50,
  minimum_stock: 5
};

describe('getProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve a product by ID', async () => {
    // Create a test product first
    const insertResult = await db.insert(productsTable)
      .values({
        name: testProduct.name,
        description: testProduct.description,
        type: testProduct.type,
        price: testProduct.price.toString(), // Convert number to string for numeric column
        stock_quantity: testProduct.stock_quantity,
        minimum_stock: testProduct.minimum_stock
      })
      .returning()
      .execute();

    const createdProduct = insertResult[0];

    // Retrieve the product using the handler
    const result = await getProduct(createdProduct.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdProduct.id);
    expect(result!.name).toEqual('Test Product');
    expect(result!.description).toEqual('A product for testing');
    expect(result!.type).toEqual('sparepart');
    expect(result!.price).toEqual(29.99);
    expect(typeof result!.price).toBe('number');
    expect(result!.stock_quantity).toEqual(50);
    expect(result!.minimum_stock).toEqual(5);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent product', async () => {
    const result = await getProduct(999);
    expect(result).toBeNull();
  });

  it('should handle products with null description', async () => {
    // Create a product without description
    const productWithoutDesc = { ...testProduct };
    productWithoutDesc.description = null;

    const insertResult = await db.insert(productsTable)
      .values({
        name: productWithoutDesc.name,
        description: productWithoutDesc.description,
        type: productWithoutDesc.type,
        price: productWithoutDesc.price.toString(),
        stock_quantity: productWithoutDesc.stock_quantity,
        minimum_stock: productWithoutDesc.minimum_stock
      })
      .returning()
      .execute();

    const createdProduct = insertResult[0];

    // Retrieve the product
    const result = await getProduct(createdProduct.id);

    expect(result).not.toBeNull();
    expect(result!.description).toBeNull();
    expect(result!.name).toEqual('Test Product');
    expect(result!.price).toEqual(29.99);
    expect(typeof result!.price).toBe('number');
  });

  it('should handle accessories product type', async () => {
    const accessoryProduct = { ...testProduct };
    accessoryProduct.type = 'accessory';
    accessoryProduct.name = 'Test Accessory';

    const insertResult = await db.insert(productsTable)
      .values({
        name: accessoryProduct.name,
        description: accessoryProduct.description,
        type: accessoryProduct.type,
        price: accessoryProduct.price.toString(),
        stock_quantity: accessoryProduct.stock_quantity,
        minimum_stock: accessoryProduct.minimum_stock
      })
      .returning()
      .execute();

    const createdProduct = insertResult[0];

    // Retrieve the product
    const result = await getProduct(createdProduct.id);

    expect(result).not.toBeNull();
    expect(result!.type).toEqual('accessory');
    expect(result!.name).toEqual('Test Accessory');
    expect(result!.price).toEqual(29.99);
  });

  it('should handle zero stock quantities', async () => {
    const zeroStockProduct = { ...testProduct };
    zeroStockProduct.stock_quantity = 0;
    zeroStockProduct.minimum_stock = 0;

    const insertResult = await db.insert(productsTable)
      .values({
        name: zeroStockProduct.name,
        description: zeroStockProduct.description,
        type: zeroStockProduct.type,
        price: zeroStockProduct.price.toString(),
        stock_quantity: zeroStockProduct.stock_quantity,
        minimum_stock: zeroStockProduct.minimum_stock
      })
      .returning()
      .execute();

    const createdProduct = insertResult[0];

    // Retrieve the product
    const result = await getProduct(createdProduct.id);

    expect(result).not.toBeNull();
    expect(result!.stock_quantity).toEqual(0);
    expect(result!.minimum_stock).toEqual(0);
    expect(result!.price).toEqual(29.99);
  });
});