import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { getLowStockProducts } from '../handlers/get_low_stock_products';

// Test product inputs
const lowStockProduct: CreateProductInput = {
  name: 'Low Stock Item',
  description: 'Product with stock below minimum',
  type: 'sparepart',
  price: 25.99,
  stock_quantity: 5,
  minimum_stock: 10 // stock is below minimum
};

const adequateStockProduct: CreateProductInput = {
  name: 'Adequate Stock Item',
  description: 'Product with sufficient stock',
  type: 'accessory',
  price: 15.50,
  stock_quantity: 20,
  minimum_stock: 10 // stock is above minimum
};

const zeroStockProduct: CreateProductInput = {
  name: 'Zero Stock Item',
  description: 'Product with no stock',
  type: 'sparepart',
  price: 50.00,
  stock_quantity: 0,
  minimum_stock: 5 // stock is below minimum
};

const exactMinimumStockProduct: CreateProductInput = {
  name: 'Exact Minimum Stock Item',
  description: 'Product with stock equal to minimum',
  type: 'accessory',
  price: 30.00,
  stock_quantity: 15,
  minimum_stock: 15 // stock equals minimum (should not be considered low)
};

describe('getLowStockProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getLowStockProducts();
    expect(result).toHaveLength(0);
  });

  it('should return products with stock below minimum', async () => {
    // Insert test products
    await db.insert(productsTable).values([
      {
        ...lowStockProduct,
        price: lowStockProduct.price.toString()
      },
      {
        ...adequateStockProduct,
        price: adequateStockProduct.price.toString()
      }
    ]).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Low Stock Item');
    expect(result[0].stock_quantity).toEqual(5);
    expect(result[0].minimum_stock).toEqual(10);
    expect(typeof result[0].price).toBe('number');
    expect(result[0].price).toEqual(25.99);
  });

  it('should include products with zero stock', async () => {
    // Insert product with zero stock
    await db.insert(productsTable).values({
      ...zeroStockProduct,
      price: zeroStockProduct.price.toString()
    }).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Zero Stock Item');
    expect(result[0].stock_quantity).toEqual(0);
    expect(result[0].minimum_stock).toEqual(5);
    expect(result[0].price).toEqual(50.00);
  });

  it('should not include products with stock equal to minimum', async () => {
    // Insert product with stock equal to minimum
    await db.insert(productsTable).values({
      ...exactMinimumStockProduct,
      price: exactMinimumStockProduct.price.toString()
    }).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(0);
  });

  it('should return multiple low stock products', async () => {
    // Insert multiple products with varying stock levels
    await db.insert(productsTable).values([
      {
        ...lowStockProduct,
        price: lowStockProduct.price.toString()
      },
      {
        ...zeroStockProduct,
        price: zeroStockProduct.price.toString()
      },
      {
        ...adequateStockProduct,
        price: adequateStockProduct.price.toString()
      },
      {
        ...exactMinimumStockProduct,
        price: exactMinimumStockProduct.price.toString()
      }
    ]).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(2);
    
    // Verify both low stock products are returned
    const productNames = result.map(p => p.name);
    expect(productNames).toContain('Low Stock Item');
    expect(productNames).toContain('Zero Stock Item');
    
    // Verify adequate and exact minimum stock products are not returned
    expect(productNames).not.toContain('Adequate Stock Item');
    expect(productNames).not.toContain('Exact Minimum Stock Item');
  });

  it('should return all product fields correctly', async () => {
    // Insert a low stock product
    const insertResult = await db.insert(productsTable).values({
      ...lowStockProduct,
      price: lowStockProduct.price.toString()
    }).returning().execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(1);
    const product = result[0];
    
    // Verify all required fields are present
    expect(product.id).toBeDefined();
    expect(product.name).toEqual(lowStockProduct.name);
    expect(product.description).toEqual(lowStockProduct.description);
    expect(product.type).toEqual(lowStockProduct.type);
    expect(product.price).toEqual(lowStockProduct.price);
    expect(product.stock_quantity).toEqual(lowStockProduct.stock_quantity);
    expect(product.minimum_stock).toEqual(lowStockProduct.minimum_stock);
    expect(product.created_at).toBeInstanceOf(Date);
    expect(product.updated_at).toBeInstanceOf(Date);
  });

  it('should handle edge case with minimum stock of zero', async () => {
    // Product with minimum stock of 0 and current stock of 0 should not be considered low
    const edgeCaseProduct: CreateProductInput = {
      name: 'Edge Case Product',
      description: 'Product with minimum stock 0',
      type: 'sparepart',
      price: 10.00,
      stock_quantity: 0,
      minimum_stock: 0
    };

    await db.insert(productsTable).values({
      ...edgeCaseProduct,
      price: edgeCaseProduct.price.toString()
    }).execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(0);
  });
});