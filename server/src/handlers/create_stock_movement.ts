import { db } from '../db';
import { stockMovementsTable, productsTable } from '../db/schema';
import { type CreateStockMovementInput, type StockMovement } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const createStockMovement = async (input: CreateStockMovementInput): Promise<StockMovement> => {
  try {
    // First verify the product exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();

    if (existingProduct.length === 0) {
      throw new Error(`Product with ID ${input.product_id} not found`);
    }

    // Create stock movement record with numeric conversion for price_per_unit
    const result = await db.insert(stockMovementsTable)
      .values({
        product_id: input.product_id,
        type: input.type,
        quantity: input.quantity,
        price_per_unit: input.price_per_unit ? input.price_per_unit.toString() : null,
        notes: input.notes,
        created_by: 1 // TODO: Replace with actual user ID from context
      })
      .returning()
      .execute();

    const stockMovement = result[0];

    // Update product stock quantity based on movement type
    const quantityChange = input.type === 'in' ? input.quantity : -input.quantity;
    
    await db.update(productsTable)
      .set({
        stock_quantity: sql`${productsTable.stock_quantity} + ${quantityChange}`,
        updated_at: new Date()
      })
      .where(eq(productsTable.id, input.product_id))
      .execute();

    // Convert numeric fields back to numbers before returning
    return {
      ...stockMovement,
      price_per_unit: stockMovement.price_per_unit ? parseFloat(stockMovement.price_per_unit) : null
    };
  } catch (error) {
    console.error('Stock movement creation failed:', error);
    throw error;
  }
};