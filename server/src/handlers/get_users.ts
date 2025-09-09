import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';

export const getUsers = async (): Promise<User[]> => {
  try {
    // Fetch all users from database
    const results = await db.select()
      .from(usersTable)
      .execute();

    // Return users with proper type conversion
    return results.map(user => ({
      ...user,
      // All other fields are already in correct format
      // (timestamps are automatically converted to Date objects)
    }));
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};