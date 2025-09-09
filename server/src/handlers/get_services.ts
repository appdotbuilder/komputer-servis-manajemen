import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type Service } from '../schema';

export async function getServices(): Promise<Service[]> {
  try {
    // Fetch all services from the database
    const results = await db.select()
      .from(servicesTable)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(service => ({
      ...service,
      estimated_cost: service.estimated_cost ? parseFloat(service.estimated_cost) : null,
      actual_cost: service.actual_cost ? parseFloat(service.actual_cost) : null
    }));
  } catch (error) {
    console.error('Failed to fetch services:', error);
    throw error;
  }
}