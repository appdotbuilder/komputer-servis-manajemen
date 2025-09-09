import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getTechnicians } from '../handlers/get_technicians';

// Test data for creating users
const adminUser: CreateUserInput = {
  username: 'admin1',
  email: 'admin@example.com',
  password: 'password123',
  full_name: 'Admin User',
  role: 'admin'
};

const technicianUser1: CreateUserInput = {
  username: 'tech1',
  email: 'tech1@example.com',
  password: 'password123',
  full_name: 'Technician One',
  role: 'technician'
};

const technicianUser2: CreateUserInput = {
  username: 'tech2',
  email: 'tech2@example.com',
  password: 'password123',
  full_name: 'Technician Two',
  role: 'technician'
};

const inactiveTechnician: CreateUserInput = {
  username: 'tech3',
  email: 'tech3@example.com',
  password: 'password123',
  full_name: 'Inactive Technician',
  role: 'technician'
};

describe('getTechnicians', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no technicians exist', async () => {
    const result = await getTechnicians();
    expect(result).toEqual([]);
  });

  it('should return only users with technician role', async () => {
    // Create test users
    const adminResult = await db.insert(usersTable)
      .values({
        ...adminUser,
        password_hash: 'hashed_password_admin'
      })
      .returning()
      .execute();

    const tech1Result = await db.insert(usersTable)
      .values({
        ...technicianUser1,
        password_hash: 'hashed_password_tech1'
      })
      .returning()
      .execute();

    const tech2Result = await db.insert(usersTable)
      .values({
        ...technicianUser2,
        password_hash: 'hashed_password_tech2'
      })
      .returning()
      .execute();

    const result = await getTechnicians();

    // Should return only technicians
    expect(result).toHaveLength(2);
    
    const technicianIds = result.map(user => user.id);
    expect(technicianIds).toContain(tech1Result[0].id);
    expect(technicianIds).toContain(tech2Result[0].id);
    expect(technicianIds).not.toContain(adminResult[0].id);

    // Verify technician role
    result.forEach(user => {
      expect(user.role).toEqual('technician');
    });
  });

  it('should return technicians with all required fields', async () => {
    // Create a technician
    await db.insert(usersTable)
      .values({
        ...technicianUser1,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const result = await getTechnicians();

    expect(result).toHaveLength(1);
    const technician = result[0];

    // Verify all required fields are present
    expect(technician.id).toBeDefined();
    expect(typeof technician.id).toBe('number');
    expect(technician.username).toEqual('tech1');
    expect(technician.email).toEqual('tech1@example.com');
    expect(technician.password_hash).toEqual('hashed_password');
    expect(technician.full_name).toEqual('Technician One');
    expect(technician.role).toEqual('technician');
    expect(typeof technician.is_active).toBe('boolean');
    expect(technician.created_at).toBeInstanceOf(Date);
    expect(technician.updated_at).toBeInstanceOf(Date);
  });

  it('should include both active and inactive technicians', async () => {
    // Create active technician
    const activeTech = await db.insert(usersTable)
      .values({
        ...technicianUser1,
        password_hash: 'hashed_password_active',
        is_active: true
      })
      .returning()
      .execute();

    // Create inactive technician
    const inactiveTech = await db.insert(usersTable)
      .values({
        ...inactiveTechnician,
        password_hash: 'hashed_password_inactive',
        is_active: false
      })
      .returning()
      .execute();

    const result = await getTechnicians();

    expect(result).toHaveLength(2);
    
    const activeUser = result.find(user => user.id === activeTech[0].id);
    const inactiveUser = result.find(user => user.id === inactiveTech[0].id);

    expect(activeUser).toBeDefined();
    expect(activeUser?.is_active).toBe(true);
    expect(inactiveUser).toBeDefined();
    expect(inactiveUser?.is_active).toBe(false);
  });

  it('should return technicians ordered by creation time', async () => {
    // Create technicians in sequence
    const tech1 = await db.insert(usersTable)
      .values({
        ...technicianUser1,
        password_hash: 'hash1'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const tech2 = await db.insert(usersTable)
      .values({
        ...technicianUser2,
        password_hash: 'hash2'
      })
      .returning()
      .execute();

    const result = await getTechnicians();

    expect(result).toHaveLength(2);
    // Database default ordering should be consistent
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });

  it('should handle multiple technicians with different usernames', async () => {
    // Create multiple technicians with unique data
    const technicians = [
      {
        username: 'senior_tech',
        email: 'senior@example.com',
        password: 'password123',
        full_name: 'Senior Technician',
        role: 'technician' as const
      },
      {
        username: 'junior_tech',
        email: 'junior@example.com',
        password: 'password123',
        full_name: 'Junior Technician',
        role: 'technician' as const
      },
      {
        username: 'contract_tech',
        email: 'contract@example.com',
        password: 'password123',
        full_name: 'Contract Technician',
        role: 'technician' as const
      }
    ];

    // Insert all technicians
    for (const tech of technicians) {
      await db.insert(usersTable)
        .values({
          ...tech,
          password_hash: `hashed_${tech.username}`
        })
        .execute();
    }

    const result = await getTechnicians();

    expect(result).toHaveLength(3);
    
    const usernames = result.map(user => user.username);
    expect(usernames).toContain('senior_tech');
    expect(usernames).toContain('junior_tech');
    expect(usernames).toContain('contract_tech');

    // Verify all are technicians
    result.forEach(user => {
      expect(user.role).toEqual('technician');
    });
  });
});