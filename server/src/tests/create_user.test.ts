import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input for admin user
const testAdminInput: CreateUserInput = {
  username: 'admin_test',
  email: 'admin@example.com',
  password: 'securepassword123',
  full_name: 'Admin Test User',
  role: 'admin'
};

// Test input for technician user
const testTechnicianInput: CreateUserInput = {
  username: 'tech_test',
  email: 'technician@example.com',
  password: 'techpassword456',
  full_name: 'Technician Test User',
  role: 'technician'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an admin user', async () => {
    const result = await createUser(testAdminInput);

    // Basic field validation
    expect(result.username).toEqual('admin_test');
    expect(result.email).toEqual('admin@example.com');
    expect(result.full_name).toEqual('Admin Test User');
    expect(result.role).toEqual('admin');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Password should be hashed (not plain text)
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('securepassword123');
    expect(result.password_hash.length).toBeGreaterThan(20); // Hashed passwords are longer
  });

  it('should create a technician user', async () => {
    const result = await createUser(testTechnicianInput);

    // Basic field validation
    expect(result.username).toEqual('tech_test');
    expect(result.email).toEqual('technician@example.com');
    expect(result.full_name).toEqual('Technician Test User');
    expect(result.role).toEqual('technician');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testAdminInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.username).toEqual('admin_test');
    expect(savedUser.email).toEqual('admin@example.com');
    expect(savedUser.full_name).toEqual('Admin Test User');
    expect(savedUser.role).toEqual('admin');
    expect(savedUser.is_active).toBe(true);
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should hash password correctly', async () => {
    const result = await createUser(testAdminInput);

    // Verify password is hashed and can be verified
    const isValidPassword = await Bun.password.verify('securepassword123', result.password_hash);
    expect(isValidPassword).toBe(true);

    // Verify wrong password fails verification
    const isInvalidPassword = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalidPassword).toBe(false);
  });

  it('should enforce unique username constraint', async () => {
    // Create first user
    await createUser(testAdminInput);

    // Try to create another user with same username
    const duplicateUsernameInput: CreateUserInput = {
      ...testTechnicianInput,
      username: 'admin_test' // Same username as first user
    };

    await expect(createUser(duplicateUsernameInput)).rejects.toThrow(/duplicate key/i);
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(testAdminInput);

    // Try to create another user with same email
    const duplicateEmailInput: CreateUserInput = {
      ...testTechnicianInput,
      email: 'admin@example.com' // Same email as first user
    };

    await expect(createUser(duplicateEmailInput)).rejects.toThrow(/duplicate key/i);
  });

  it('should create multiple users with different credentials', async () => {
    // Create admin user
    const adminResult = await createUser(testAdminInput);
    expect(adminResult.role).toEqual('admin');

    // Create technician user
    const techResult = await createUser(testTechnicianInput);
    expect(techResult.role).toEqual('technician');

    // Verify both users exist in database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(2);

    const usernames = allUsers.map(user => user.username);
    expect(usernames).toContain('admin_test');
    expect(usernames).toContain('tech_test');

    const roles = allUsers.map(user => user.role);
    expect(roles).toContain('admin');
    expect(roles).toContain('technician');
  });
});