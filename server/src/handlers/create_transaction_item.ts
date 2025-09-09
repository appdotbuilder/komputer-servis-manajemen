import { db } from '../db';
import { transactionItemsTable, productsTable, transactionsTable } from '../db/schema';
import { type CreateTransactionItemInput, type TransactionItem } from '../schema';
import { eq } from 'drizzle-orm';

export const createTransactionItem = async (input: CreateTransactionItemInput): Promise<TransactionItem> => {
  try {
    // Verify that the transaction exists
    const transaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, input.transaction_id))
      .limit(1)
      .execute();

    if (transaction.length === 0) {
      throw new Error(`Transaction with id ${input.transaction_id} not found`);
    }

    // Verify that the product exists and has sufficient stock
    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .limit(1)
      .execute();

    if (product.length === 0) {
      throw new Error(`Product with id ${input.product_id} not found`);
    }

    if (product[0].stock_quantity < input.quantity) {
      throw new Error(`Insufficient stock. Available: ${product[0].stock_quantity}, Requested: ${input.quantity}`);
    }

    // Calculate total price
    const totalPrice = input.quantity * input.unit_price;

    // Insert the transaction item
    const result = await db.insert(transactionItemsTable)
      .values({
        transaction_id: input.transaction_id,
        product_id: input.product_id,
        quantity: input.quantity,
        unit_price: input.unit_price.toString(), // Convert number to string for numeric column
        total_price: totalPrice.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Update product stock quantity (reduce by sold quantity)
    await db.update(productsTable)
      .set({
        stock_quantity: product[0].stock_quantity - input.quantity,
        updated_at: new Date()
      })
      .where(eq(productsTable.id, input.product_id))
      .execute();

    // Convert numeric fields back to numbers before returning
    const transactionItem = result[0];
    return {
      ...transactionItem,
      unit_price: parseFloat(transactionItem.unit_price), // Convert string back to number
      total_price: parseFloat(transactionItem.total_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Transaction item creation failed:', error);
    throw error;
  }
};