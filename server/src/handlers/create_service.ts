import { db } from '../db';
import { servicesTable, customersTable } from '../db/schema';
import { type CreateServiceInput, type Service } from '../schema';
import { eq } from 'drizzle-orm';

export const createService = async (input: CreateServiceInput): Promise<Service> => {
  try {
    // Verify that the customer exists
    const customer = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, input.customer_id))
      .execute();

    if (customer.length === 0) {
      throw new Error(`Customer with id ${input.customer_id} not found`);
    }

    // Insert service record
    const result = await db.insert(servicesTable)
      .values({
        customer_id: input.customer_id,
        device_type: input.device_type,
        device_brand: input.device_brand,
        device_model: input.device_model,
        problem_description: input.problem_description,
        estimated_cost: input.estimated_cost?.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const service = result[0];
    return {
      ...service,
      estimated_cost: service.estimated_cost ? parseFloat(service.estimated_cost) : null,
      actual_cost: service.actual_cost ? parseFloat(service.actual_cost) : null
    };
  } catch (error) {
    console.error('Service creation failed:', error);
    throw error;
  }
};