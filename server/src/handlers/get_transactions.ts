import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type Transaction } from '../schema';

export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    // Fetch all transactions from the database
    const results = await db.select()
      .from(transactionsTable)
      .execute();

    // Convert numeric fields from strings to numbers
    return results.map(transaction => ({
      ...transaction,
      total_amount: parseFloat(transaction.total_amount),
      paid_amount: parseFloat(transaction.paid_amount)
    }));
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    throw error;
  }
};