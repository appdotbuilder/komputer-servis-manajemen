import { db } from '../db';
import { customersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateCustomerInput, type Customer } from '../schema';

export const updateCustomer = async (input: UpdateCustomerInput): Promise<Customer> => {
  try {
    // Build update data object only with provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.phone !== undefined) {
      updateData.phone = input.phone;
    }
    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    if (input.address !== undefined) {
      updateData.address = input.address;
    }
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update the customer record
    const result = await db.update(customersTable)
      .set(updateData)
      .where(eq(customersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Customer with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Customer update failed:', error);
    throw error;
  }
};