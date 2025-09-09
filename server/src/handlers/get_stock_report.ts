import { db } from '../db';
import { productsTable, stockMovementsTable } from '../db/schema';
import { type StockReport } from '../schema';
import { eq, sum, and } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export async function getStockReport(): Promise<StockReport[]> {
  try {
    // Get all products with their basic info
    const products = await db.select()
      .from(productsTable)
      .execute();

    // Build comprehensive stock report for each product
    const stockReports: StockReport[] = [];

    for (const product of products) {
      // Get stock movements for this product
      const stockInResult = await db.select({
        total: sum(stockMovementsTable.quantity)
      })
      .from(stockMovementsTable)
      .where(and(
        eq(stockMovementsTable.product_id, product.id),
        eq(stockMovementsTable.type, 'in')
      ))
      .execute();

      const stockOutResult = await db.select({
        total: sum(stockMovementsTable.quantity)
      })
      .from(stockMovementsTable)
      .where(and(
        eq(stockMovementsTable.product_id, product.id),
        eq(stockMovementsTable.type, 'out')
      ))
      .execute();

      // Calculate stock movement totals (sum returns string, convert to number)
      const stockIn = stockInResult[0]?.total ? parseInt(stockInResult[0].total) : 0;
      const stockOut = stockOutResult[0]?.total ? parseInt(stockOutResult[0].total) : 0;

      // Calculate stock value (current stock * product price)
      const currentStock = product.stock_quantity;
      const productPrice = parseFloat(product.price);
      const stockValue = currentStock * productPrice;

      // Check if stock is below minimum threshold
      const isLowStock = currentStock <= product.minimum_stock;

      const stockReport: StockReport = {
        product_id: product.id,
        product_name: product.name,
        current_stock: currentStock,
        minimum_stock: product.minimum_stock,
        stock_in: stockIn,
        stock_out: stockOut,
        stock_value: stockValue,
        is_low_stock: isLowStock
      };

      stockReports.push(stockReport);
    }

    return stockReports;
  } catch (error) {
    console.error('Stock report generation failed:', error);
    throw error;
  }
}