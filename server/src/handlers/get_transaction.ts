import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const getTransaction = async (id: number): Promise<Transaction | null> => {
  try {
    const result = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const transaction = result[0];
    
    // Convert numeric fields back to numbers
    return {
      ...transaction,
      total_amount: parseFloat(transaction.total_amount),
      paid_amount: parseFloat(transaction.paid_amount)
    };
  } catch (error) {
    console.error('Transaction fetch failed:', error);
    throw error;
  }
};