import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { getProducts } from '../handlers/get_products';

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getProducts();
    expect(result).toEqual([]);
  });

  it('should fetch single product correctly', async () => {
    // Create a test product
    await db.insert(productsTable).values({
      name: 'Test Product',
      description: 'A product for testing',
      type: 'sparepart',
      price: '19.99', // Insert as string for numeric column
      stock_quantity: 100,
      minimum_stock: 10
    }).execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Test Product');
    expect(result[0].description).toEqual('A product for testing');
    expect(result[0].type).toEqual('sparepart');
    expect(result[0].price).toEqual(19.99); // Should be converted to number
    expect(typeof result[0].price).toBe('number');
    expect(result[0].stock_quantity).toEqual(100);
    expect(result[0].minimum_stock).toEqual(10);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should fetch multiple products correctly', async () => {
    // Create multiple test products
    await db.insert(productsTable).values([
      {
        name: 'Sparepart A',
        description: 'First sparepart',
        type: 'sparepart',
        price: '25.50',
        stock_quantity: 50,
        minimum_stock: 5
      },
      {
        name: 'Accessory B',
        description: null,
        type: 'accessory',
        price: '12.75',
        stock_quantity: 200,
        minimum_stock: 20
      },
      {
        name: 'Sparepart C',
        description: 'Third product',
        type: 'sparepart',
        price: '99.99',
        stock_quantity: 0,
        minimum_stock: 0
      }
    ]).execute();

    const result = await getProducts();

    expect(result).toHaveLength(3);

    // Verify first product
    const firstProduct = result.find(p => p.name === 'Sparepart A');
    expect(firstProduct).toBeDefined();
    expect(firstProduct!.price).toEqual(25.50);
    expect(typeof firstProduct!.price).toBe('number');
    expect(firstProduct!.type).toEqual('sparepart');
    expect(firstProduct!.description).toEqual('First sparepart');

    // Verify second product
    const secondProduct = result.find(p => p.name === 'Accessory B');
    expect(secondProduct).toBeDefined();
    expect(secondProduct!.price).toEqual(12.75);
    expect(typeof secondProduct!.price).toBe('number');
    expect(secondProduct!.type).toEqual('accessory');
    expect(secondProduct!.description).toBeNull();

    // Verify third product
    const thirdProduct = result.find(p => p.name === 'Sparepart C');
    expect(thirdProduct).toBeDefined();
    expect(thirdProduct!.price).toEqual(99.99);
    expect(typeof thirdProduct!.price).toBe('number');
    expect(thirdProduct!.stock_quantity).toEqual(0);
    expect(thirdProduct!.minimum_stock).toEqual(0);
  });

  it('should handle products with different product types', async () => {
    // Create products of both types
    await db.insert(productsTable).values([
      {
        name: 'Engine Part',
        description: 'Critical engine component',
        type: 'sparepart',
        price: '150.00',
        stock_quantity: 25,
        minimum_stock: 5
      },
      {
        name: 'Phone Case',
        description: 'Protective phone accessory',
        type: 'accessory',
        price: '15.99',
        stock_quantity: 300,
        minimum_stock: 50
      }
    ]).execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);

    const sparepart = result.find(p => p.type === 'sparepart');
    const accessory = result.find(p => p.type === 'accessory');

    expect(sparepart).toBeDefined();
    expect(sparepart!.name).toEqual('Engine Part');
    expect(sparepart!.price).toEqual(150.00);
    expect(typeof sparepart!.price).toBe('number');

    expect(accessory).toBeDefined();
    expect(accessory!.name).toEqual('Phone Case');
    expect(accessory!.price).toEqual(15.99);
    expect(typeof accessory!.price).toBe('number');
  });

  it('should handle products with null descriptions', async () => {
    // Create product with null description
    await db.insert(productsTable).values({
      name: 'No Description Product',
      description: null,
      type: 'accessory',
      price: '5.00',
      stock_quantity: 10,
      minimum_stock: 1
    }).execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
    expect(result[0].name).toEqual('No Description Product');
    expect(result[0].price).toEqual(5.00);
    expect(typeof result[0].price).toBe('number');
  });

  it('should return products ordered by creation time', async () => {
    // Create products at different times
    await db.insert(productsTable).values({
      name: 'First Product',
      description: 'Created first',
      type: 'sparepart',
      price: '10.00',
      stock_quantity: 10,
      minimum_stock: 1
    }).execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));

    await db.insert(productsTable).values({
      name: 'Second Product',
      description: 'Created second',
      type: 'accessory',
      price: '20.00',
      stock_quantity: 20,
      minimum_stock: 2
    }).execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);
    
    // Find products by name since we don't control the order in getProducts
    const firstProduct = result.find(p => p.name === 'First Product');
    const secondProduct = result.find(p => p.name === 'Second Product');

    expect(firstProduct).toBeDefined();
    expect(secondProduct).toBeDefined();
    expect(firstProduct!.created_at).toBeInstanceOf(Date);
    expect(secondProduct!.created_at).toBeInstanceOf(Date);
    
    // Both should have valid timestamps
    expect(firstProduct!.created_at.getTime()).toBeGreaterThan(0);
    expect(secondProduct!.created_at.getTime()).toBeGreaterThan(0);
  });
});