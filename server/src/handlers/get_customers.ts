import { db } from '../db';
import { customersTable } from '../db/schema';
import { type Customer } from '../schema';

export const getCustomers = async (): Promise<Customer[]> => {
  try {
    const results = await db.select()
      .from(customersTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get customers:', error);
    throw error;
  }
};