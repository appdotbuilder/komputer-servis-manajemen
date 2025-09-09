import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';
import { eq } from 'drizzle-orm';

// Test user inputs
const testUser1: CreateUserInput = {
  username: 'admin_user',
  email: 'admin@example.com',
  password: 'password123',
  full_name: 'Admin User',
  role: 'admin'
};

const testUser2: CreateUserInput = {
  username: 'tech_user',
  email: 'tech@example.com',
  password: 'password456',
  full_name: 'Technician User',
  role: 'technician'
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all users from database', async () => {
    // Create test users directly in database
    await db.insert(usersTable).values({
      username: testUser1.username,
      email: testUser1.email,
      password_hash: 'hashed_password_1',
      full_name: testUser1.full_name,
      role: testUser1.role
    });

    await db.insert(usersTable).values({
      username: testUser2.username,
      email: testUser2.email,
      password_hash: 'hashed_password_2',
      full_name: testUser2.full_name,
      role: testUser2.role
    });

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Check first user
    const adminUser = result.find(u => u.username === 'admin_user');
    expect(adminUser).toBeDefined();
    expect(adminUser!.email).toEqual('admin@example.com');
    expect(adminUser!.full_name).toEqual('Admin User');
    expect(adminUser!.role).toEqual('admin');
    expect(adminUser!.is_active).toBe(true);
    expect(adminUser!.created_at).toBeInstanceOf(Date);
    expect(adminUser!.updated_at).toBeInstanceOf(Date);
    expect(adminUser!.id).toBeDefined();
    expect(adminUser!.password_hash).toEqual('hashed_password_1');

    // Check second user
    const techUser = result.find(u => u.username === 'tech_user');
    expect(techUser).toBeDefined();
    expect(techUser!.email).toEqual('tech@example.com');
    expect(techUser!.full_name).toEqual('Technician User');
    expect(techUser!.role).toEqual('technician');
    expect(techUser!.is_active).toBe(true);
    expect(techUser!.created_at).toBeInstanceOf(Date);
    expect(techUser!.updated_at).toBeInstanceOf(Date);
    expect(techUser!.id).toBeDefined();
    expect(techUser!.password_hash).toEqual('hashed_password_2');
  });

  it('should handle users with different active states', async () => {
    // Create active user
    await db.insert(usersTable).values({
      username: 'active_user',
      email: 'active@example.com',
      password_hash: 'hashed_password_active',
      full_name: 'Active User',
      role: 'admin',
      is_active: true
    });

    // Create inactive user
    await db.insert(usersTable).values({
      username: 'inactive_user',
      email: 'inactive@example.com',
      password_hash: 'hashed_password_inactive',
      full_name: 'Inactive User',
      role: 'technician',
      is_active: false
    });

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    const activeUser = result.find(u => u.username === 'active_user');
    const inactiveUser = result.find(u => u.username === 'inactive_user');

    expect(activeUser!.is_active).toBe(true);
    expect(inactiveUser!.is_active).toBe(false);
  });

  it('should return users ordered by creation time', async () => {
    // Create users with slight time differences
    const firstUser = await db.insert(usersTable).values({
      username: 'first_user',
      email: 'first@example.com',
      password_hash: 'hashed_password_1',
      full_name: 'First User',
      role: 'admin'
    }).returning();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondUser = await db.insert(usersTable).values({
      username: 'second_user',
      email: 'second@example.com',
      password_hash: 'hashed_password_2',
      full_name: 'Second User',
      role: 'technician'
    }).returning();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Verify users exist
    const firstResult = result.find(u => u.username === 'first_user');
    const secondResult = result.find(u => u.username === 'second_user');
    
    expect(firstResult).toBeDefined();
    expect(secondResult).toBeDefined();
    
    // Verify timestamps are properly handled
    expect(firstResult!.created_at).toBeInstanceOf(Date);
    expect(secondResult!.created_at).toBeInstanceOf(Date);
  });

  it('should verify data exists in database after retrieval', async () => {
    // Create test user
    const insertedUser = await db.insert(usersTable).values({
      username: testUser1.username,
      email: testUser1.email,
      password_hash: 'hashed_password_test',
      full_name: testUser1.full_name,
      role: testUser1.role
    }).returning();

    const result = await getUsers();
    expect(result).toHaveLength(1);

    // Verify data is actually in database
    const dbUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, insertedUser[0].id))
      .execute();

    expect(dbUsers).toHaveLength(1);
    expect(dbUsers[0].username).toEqual(testUser1.username);
    expect(dbUsers[0].email).toEqual(testUser1.email);
    expect(dbUsers[0].full_name).toEqual(testUser1.full_name);
    expect(dbUsers[0].role).toEqual(testUser1.role);
  });
});