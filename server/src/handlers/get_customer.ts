import { db } from '../db';
import { customersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Customer } from '../schema';

export async function getCustomer(id: number): Promise<Customer | null> {
  try {
    const result = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const customer = result[0];
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      created_at: customer.created_at,
      updated_at: customer.updated_at
    };
  } catch (error) {
    console.error('Customer retrieval failed:', error);
    throw error;
  }
}