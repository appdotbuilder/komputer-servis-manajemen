import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type Service } from '../schema';
import { eq } from 'drizzle-orm';

export const getService = async (id: number): Promise<Service | null> => {
  try {
    const results = await db.select()
      .from(servicesTable)
      .where(eq(servicesTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const service = results[0];
    
    // Convert numeric fields back to numbers for return
    return {
      ...service,
      estimated_cost: service.estimated_cost ? parseFloat(service.estimated_cost) : null,
      actual_cost: service.actual_cost ? parseFloat(service.actual_cost) : null
    };
  } catch (error) {
    console.error('Service retrieval failed:', error);
    throw error;
  }
};