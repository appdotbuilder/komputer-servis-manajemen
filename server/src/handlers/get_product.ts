import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { eq } from 'drizzle-orm';

export const getProduct = async (id: number): Promise<Product | null> => {
  try {
    // Query product by ID
    const results = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    // Return null if no product found
    if (results.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const product = results[0];
    return {
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Product retrieval failed:', error);
    throw error;
  }
};