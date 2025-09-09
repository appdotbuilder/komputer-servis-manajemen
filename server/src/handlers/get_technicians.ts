import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { eq } from 'drizzle-orm';

export const getTechnicians = async (): Promise<User[]> => {
  try {
    // Query all users with technician role
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.role, 'technician'))
      .execute();

    // Return results (no numeric field conversions needed for users table)
    return results;
  } catch (error) {
    console.error('Failed to fetch technicians:', error);
    throw error;
  }
};