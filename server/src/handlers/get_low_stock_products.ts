import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { lt, sql } from 'drizzle-orm';

export const getLowStockProducts = async (): Promise<Product[]> => {
  try {
    // Query products where stock_quantity < minimum_stock
    const results = await db.select()
      .from(productsTable)
      .where(lt(productsTable.stock_quantity, sql`${productsTable.minimum_stock}`))
      .execute();

    // Convert numeric fields to numbers before returning
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price)
    }));
  } catch (error) {
    console.error('Failed to fetch low stock products:', error);
    throw error;
  }
};