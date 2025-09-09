import { db } from '../db';
import { servicesTable, transactionsTable } from '../db/schema';
import { type Service, type Transaction } from '../schema';
import { eq, desc } from 'drizzle-orm';

export interface CustomerHistory {
    services: Service[];
    transactions: Transaction[];
}

export async function getCustomerHistory(customerId: number): Promise<CustomerHistory> {
    try {
        // Fetch all services for the customer, ordered by creation date (most recent first)
        const servicesQuery = await db.select()
            .from(servicesTable)
            .where(eq(servicesTable.customer_id, customerId))
            .orderBy(desc(servicesTable.created_at))
            .execute();

        // Fetch all transactions for the customer, ordered by creation date (most recent first)
        const transactionsQuery = await db.select()
            .from(transactionsTable)
            .where(eq(transactionsTable.customer_id, customerId))
            .orderBy(desc(transactionsTable.created_at))
            .execute();

        // Convert numeric fields to numbers for services
        const services: Service[] = servicesQuery.map(service => ({
            ...service,
            estimated_cost: service.estimated_cost ? parseFloat(service.estimated_cost) : null,
            actual_cost: service.actual_cost ? parseFloat(service.actual_cost) : null
        }));

        // Convert numeric fields to numbers for transactions
        const transactions: Transaction[] = transactionsQuery.map(transaction => ({
            ...transaction,
            total_amount: parseFloat(transaction.total_amount),
            paid_amount: parseFloat(transaction.paid_amount)
        }));

        return {
            services,
            transactions
        };
    } catch (error) {
        console.error('Failed to fetch customer history:', error);
        throw error;
    }
}