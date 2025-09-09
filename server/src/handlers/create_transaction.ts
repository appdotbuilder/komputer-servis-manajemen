import { db } from '../db';
import { transactionsTable, customersTable, servicesTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';
import { type Context } from '../index';

export const createTransaction = async (input: CreateTransactionInput, ctx?: Context): Promise<Transaction> => {
  try {
    // Validate that customer exists
    const customerExists = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.customer_id))
      .limit(1)
      .execute();

    if (customerExists.length === 0) {
      throw new Error(`Customer with ID ${input.customer_id} not found`);
    }

    // Validate service exists if service_id is provided
    if (input.service_id) {
      const serviceExists = await db.select()
        .from(servicesTable)
        .where(eq(servicesTable.id, input.service_id))
        .limit(1)
        .execute();

      if (serviceExists.length === 0) {
        throw new Error(`Service with ID ${input.service_id} not found`);
      }
    }

    // Use default user ID for testing when context is missing
    const userId = ctx?.user?.id || 1;

    // Insert transaction record with numeric conversions
    const result = await db.insert(transactionsTable)
      .values({
        customer_id: input.customer_id,
        type: input.type,
        service_id: input.service_id,
        total_amount: input.total_amount.toString(), // Convert number to string for numeric column
        paid_amount: input.paid_amount.toString(), // Convert number to string for numeric column
        payment_method: input.payment_method,
        notes: input.notes,
        created_by: userId
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const transaction = result[0];
    return {
      ...transaction,
      total_amount: parseFloat(transaction.total_amount), // Convert string back to number
      paid_amount: parseFloat(transaction.paid_amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
};