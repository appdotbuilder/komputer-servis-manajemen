import { db } from '../db';
import { productsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateProductInput, type Product } from '../schema';

export const updateProduct = async (input: UpdateProductInput): Promise<Product> => {
  try {
    // First, verify the product exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.id))
      .execute();

    if (existingProduct.length === 0) {
      throw new Error(`Product with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    
    if (input.type !== undefined) {
      updateData.type = input.type;
    }
    
    if (input.price !== undefined) {
      updateData.price = input.price.toString(); // Convert number to string for numeric column
    }
    
    if (input.stock_quantity !== undefined) {
      updateData.stock_quantity = input.stock_quantity;
    }
    
    if (input.minimum_stock !== undefined) {
      updateData.minimum_stock = input.minimum_stock;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Perform the update
    const result = await db.update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Product update failed:', error);
    throw error;
  }
};