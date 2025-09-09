import { db } from '../db';
import { servicesTable } from '../db/schema';
import { type UpdateServiceInput, type Service } from '../schema';
import { eq } from 'drizzle-orm';

export const updateService = async (input: UpdateServiceInput): Promise<Service> => {
  try {
    // Build the update object with only provided fields
    const updateData: any = {
      updated_at: new Date(),
    };

    if (input.diagnosis !== undefined) {
      updateData['diagnosis'] = input.diagnosis;
    }

    if (input.repair_actions !== undefined) {
      updateData['repair_actions'] = input.repair_actions;
    }

    if (input.status !== undefined) {
      updateData['status'] = input.status;
      // Set completed_at when status changes to completed
      if (input.status === 'completed') {
        updateData['completed_at'] = new Date();
      }
    }

    if (input.actual_cost !== undefined) {
      updateData['actual_cost'] = input.actual_cost?.toString();
    }

    if (input.technician_id !== undefined) {
      updateData['technician_id'] = input.technician_id;
    }

    // Update the service record
    const result = await db.update(servicesTable)
      .set(updateData)
      .where(eq(servicesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Service with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const service = result[0];
    return {
      ...service,
      estimated_cost: service.estimated_cost ? parseFloat(service.estimated_cost) : null,
      actual_cost: service.actual_cost ? parseFloat(service.actual_cost) : null
    };
  } catch (error) {
    console.error('Service update failed:', error);
    throw error;
  }
};