import { db } from '../db';
import { stockMovementsTable } from '../db/schema';
import { type StockMovement } from '../schema';
import { desc } from 'drizzle-orm';

export async function getStockMovements(): Promise<StockMovement[]> {
  try {
    // Fetch all stock movements ordered by creation date (newest first)
    const results = await db.select()
      .from(stockMovementsTable)
      .orderBy(desc(stockMovementsTable.created_at))
      .execute();

    // Convert numeric fields from strings to numbers for price_per_unit
    return results.map(stockMovement => ({
      ...stockMovement,
      price_per_unit: stockMovement.price_per_unit ? parseFloat(stockMovement.price_per_unit) : null
    }));
  } catch (error) {
    console.error('Failed to fetch stock movements:', error);
    throw error;
  }
}