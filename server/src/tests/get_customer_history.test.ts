import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, servicesTable, transactionsTable, usersTable } from '../db/schema';
import { getCustomerHistory } from '../handlers/get_customer_history';
import { eq } from 'drizzle-orm';

describe('getCustomerHistory', () => {
    let customerId: number;
    let userId: number;

    beforeEach(async () => {
        await createDB();

        // Create a test user first (required for foreign keys)
        const userResult = await db.insert(usersTable)
            .values({
                username: 'testuser',
                email: 'test@example.com',
                password_hash: 'hashedpassword',
                full_name: 'Test User',
                role: 'admin'
            })
            .returning()
            .execute();
        userId = userResult[0].id;

        // Create a test customer
        const customerResult = await db.insert(customersTable)
            .values({
                name: 'Test Customer',
                phone: '123-456-7890',
                email: 'customer@example.com',
                address: '123 Test St'
            })
            .returning()
            .execute();
        customerId = customerResult[0].id;
    });

    afterEach(resetDB);

    it('should return empty history for customer with no services or transactions', async () => {
        const history = await getCustomerHistory(customerId);

        expect(history.services).toHaveLength(0);
        expect(history.transactions).toHaveLength(0);
    });

    it('should fetch customer services with proper numeric conversions', async () => {
        // Create test services
        await db.insert(servicesTable)
            .values([
                {
                    customer_id: customerId,
                    device_type: 'smartphone',
                    device_brand: 'Apple',
                    device_model: 'iPhone 12',
                    problem_description: 'Screen cracked',
                    status: 'completed',
                    estimated_cost: '150.00',
                    actual_cost: '120.50',
                    technician_id: userId
                },
                {
                    customer_id: customerId,
                    device_type: 'laptop',
                    device_brand: 'Dell',
                    device_model: 'XPS 13',
                    problem_description: 'Battery not charging',
                    status: 'in_progress',
                    estimated_cost: '200.00',
                    actual_cost: null
                }
            ])
            .execute();

        const history = await getCustomerHistory(customerId);

        expect(history.services).toHaveLength(2);
        
        // Find services by device type since order may vary due to timestamp precision
        const smartphoneService = history.services.find(s => s.device_type === 'smartphone');
        const laptopService = history.services.find(s => s.device_type === 'laptop');

        expect(smartphoneService).toBeDefined();
        expect(laptopService).toBeDefined();

        // Check smartphone service
        expect(smartphoneService!.estimated_cost).toEqual(150.00);
        expect(smartphoneService!.actual_cost).toEqual(120.50);
        expect(typeof smartphoneService!.estimated_cost).toBe('number');
        expect(typeof smartphoneService!.actual_cost).toBe('number');

        // Check laptop service
        expect(laptopService!.estimated_cost).toEqual(200.00);
        expect(typeof laptopService!.estimated_cost).toBe('number');
        expect(laptopService!.actual_cost).toBeNull();
    });

    it('should fetch customer transactions with proper numeric conversions', async () => {
        // Create test transactions
        await db.insert(transactionsTable)
            .values([
                {
                    customer_id: customerId,
                    type: 'sale',
                    service_id: null,
                    total_amount: '75.50',
                    paid_amount: '75.50',
                    payment_method: 'cash',
                    notes: 'Phone case purchase',
                    created_by: userId
                },
                {
                    customer_id: customerId,
                    type: 'service',
                    service_id: null,
                    total_amount: '120.00',
                    paid_amount: '100.00',
                    payment_method: 'card',
                    notes: 'Repair service payment',
                    created_by: userId
                }
            ])
            .execute();

        const history = await getCustomerHistory(customerId);

        expect(history.transactions).toHaveLength(2);
        
        // Check transactions have proper numeric types
        history.transactions.forEach(transaction => {
            expect(typeof transaction.total_amount).toBe('number');
            expect(typeof transaction.paid_amount).toBe('number');
        });

        // Find transactions by type since order may vary due to timestamp precision
        const saleTransaction = history.transactions.find(t => t.type === 'sale');
        const serviceTransaction = history.transactions.find(t => t.type === 'service');

        expect(saleTransaction).toBeDefined();
        expect(serviceTransaction).toBeDefined();

        // Check sale transaction
        expect(saleTransaction!.total_amount).toEqual(75.50);
        expect(saleTransaction!.paid_amount).toEqual(75.50);
        expect(saleTransaction!.notes).toEqual('Phone case purchase');

        // Check service transaction
        expect(serviceTransaction!.total_amount).toEqual(120.00);
        expect(serviceTransaction!.paid_amount).toEqual(100.00);
        expect(serviceTransaction!.notes).toEqual('Repair service payment');
    });

    it('should return complete history with both services and transactions', async () => {
        // Create a service
        await db.insert(servicesTable)
            .values({
                customer_id: customerId,
                device_type: 'tablet',
                problem_description: 'Won\'t turn on',
                status: 'pending',
                estimated_cost: '80.00'
            })
            .execute();

        // Create a transaction
        await db.insert(transactionsTable)
            .values({
                customer_id: customerId,
                type: 'sale',
                service_id: null,
                total_amount: '25.99',
                paid_amount: '25.99',
                payment_method: 'cash',
                created_by: userId
            })
            .execute();

        const history = await getCustomerHistory(customerId);

        expect(history.services).toHaveLength(1);
        expect(history.transactions).toHaveLength(1);
        
        expect(history.services[0].device_type).toEqual('tablet');
        expect(history.services[0].estimated_cost).toEqual(80.00);
        
        expect(history.transactions[0].total_amount).toEqual(25.99);
        expect(history.transactions[0].type).toEqual('sale');
    });

    it('should only return history for the specified customer', async () => {
        // Create another customer
        const otherCustomerResult = await db.insert(customersTable)
            .values({
                name: 'Other Customer',
                phone: '987-654-3210',
                email: 'other@example.com'
            })
            .returning()
            .execute();
        const otherCustomerId = otherCustomerResult[0].id;

        // Create services for both customers
        await db.insert(servicesTable)
            .values([
                {
                    customer_id: customerId,
                    device_type: 'smartphone',
                    problem_description: 'Target customer service',
                    status: 'pending'
                },
                {
                    customer_id: otherCustomerId,
                    device_type: 'laptop',
                    problem_description: 'Other customer service',
                    status: 'pending'
                }
            ])
            .execute();

        // Create transactions for both customers
        await db.insert(transactionsTable)
            .values([
                {
                    customer_id: customerId,
                    type: 'sale',
                    service_id: null,
                    total_amount: '50.00',
                    paid_amount: '50.00',
                    created_by: userId
                },
                {
                    customer_id: otherCustomerId,
                    type: 'sale',
                    service_id: null,
                    total_amount: '30.00',
                    paid_amount: '30.00',
                    created_by: userId
                }
            ])
            .execute();

        const history = await getCustomerHistory(customerId);

        expect(history.services).toHaveLength(1);
        expect(history.transactions).toHaveLength(1);
        
        expect(history.services[0].problem_description).toEqual('Target customer service');
        expect(history.transactions[0].total_amount).toEqual(50.00);
    });

    it('should maintain proper ordering by creation date (most recent first)', async () => {
        // Create services with slight delay to ensure different timestamps
        const service1Result = await db.insert(servicesTable)
            .values({
                customer_id: customerId,
                device_type: 'phone',
                problem_description: 'First service',
                status: 'pending'
            })
            .returning()
            .execute();

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 10));

        const service2Result = await db.insert(servicesTable)
            .values({
                customer_id: customerId,
                device_type: 'tablet',
                problem_description: 'Second service',
                status: 'pending'
            })
            .returning()
            .execute();

        const history = await getCustomerHistory(customerId);

        expect(history.services).toHaveLength(2);
        
        // Most recent service should be first
        expect(history.services[0].problem_description).toEqual('Second service');
        expect(history.services[1].problem_description).toEqual('First service');
        
        // Verify ordering by comparing timestamps
        expect(history.services[0].created_at.getTime()).toBeGreaterThan(
            history.services[1].created_at.getTime()
        );
    });

    it('should handle customer with large number of records', async () => {
        // Create multiple services
        const serviceValues = Array.from({ length: 5 }, (_, i) => ({
            customer_id: customerId,
            device_type: `device_${i}`,
            problem_description: `Problem ${i}`,
            status: 'pending' as const,
            estimated_cost: `${(i + 1) * 10}.00`
        }));

        await db.insert(servicesTable)
            .values(serviceValues)
            .execute();

        // Create multiple transactions
        const transactionValues = Array.from({ length: 3 }, (_, i) => ({
            customer_id: customerId,
            type: 'sale' as const,
            service_id: null,
            total_amount: `${(i + 1) * 20}.00`,
            paid_amount: `${(i + 1) * 20}.00`,
            created_by: userId
        }));

        await db.insert(transactionsTable)
            .values(transactionValues)
            .execute();

        const history = await getCustomerHistory(customerId);

        expect(history.services).toHaveLength(5);
        expect(history.transactions).toHaveLength(3);
        
        // Verify all numeric conversions are correct
        history.services.forEach(service => {
            if (service.estimated_cost !== null) {
                expect(typeof service.estimated_cost).toBe('number');
            }
        });
        
        history.transactions.forEach(transaction => {
            expect(typeof transaction.total_amount).toBe('number');
            expect(typeof transaction.paid_amount).toBe('number');
        });
    });
});