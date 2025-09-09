import { db } from '../db';
import { stockMovementsTable } from '../db/schema';
import { type StockMovement } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getStockMovementsByProduct = async (productId: number): Promise<StockMovement[]> => {
  try {
    const results = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.product_id, productId))
      .orderBy(desc(stockMovementsTable.created_at))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(movement => ({
      ...movement,
      price_per_unit: movement.price_per_unit ? parseFloat(movement.price_per_unit) : null
    }));
  } catch (error) {
    console.error('Failed to get stock movements by product:', error);
    throw error;
  }
};