import { db } from '../db';
import { customersTable, servicesTable, productsTable, transactionsTable } from '../db/schema';
import { eq, count, sql, and, gte, lte, lt } from 'drizzle-orm';

export interface DashboardStats {
    total_customers: number;
    pending_services: number;
    completed_services_today: number;
    low_stock_items: number;
    today_revenue: number;
    this_month_revenue: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
    try {
        // Calculate date ranges
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // Query 1: Total customers
        const totalCustomersResult = await db.select({
            count: count()
        })
        .from(customersTable)
        .execute();
        
        // Query 2: Pending services
        const pendingServicesResult = await db.select({
            count: count()
        })
        .from(servicesTable)
        .where(eq(servicesTable.status, 'pending'))
        .execute();
        
        // Query 3: Completed services today
        const completedServicesResult = await db.select({
            count: count()
        })
        .from(servicesTable)
        .where(
            and(
                eq(servicesTable.status, 'completed'),
                gte(servicesTable.completed_at, today),
                lt(servicesTable.completed_at, tomorrow)
            )
        )
        .execute();
        
        // Query 4: Low stock items (where stock_quantity <= minimum_stock)
        const lowStockResult = await db.select({
            count: count()
        })
        .from(productsTable)
        .where(sql`${productsTable.stock_quantity} <= ${productsTable.minimum_stock}`)
        .execute();
        
        // Query 5: Today's revenue
        const todayRevenueResult = await db.select({
            revenue: sql<string>`COALESCE(SUM(${transactionsTable.paid_amount}), 0)`
        })
        .from(transactionsTable)
        .where(
            and(
                gte(transactionsTable.created_at, today),
                lt(transactionsTable.created_at, tomorrow)
            )
        )
        .execute();
        
        // Query 6: This month's revenue
        const monthRevenueResult = await db.select({
            revenue: sql<string>`COALESCE(SUM(${transactionsTable.paid_amount}), 0)`
        })
        .from(transactionsTable)
        .where(gte(transactionsTable.created_at, firstDayOfMonth))
        .execute();
        
        return {
            total_customers: totalCustomersResult[0].count,
            pending_services: pendingServicesResult[0].count,
            completed_services_today: completedServicesResult[0].count,
            low_stock_items: lowStockResult[0].count,
            today_revenue: parseFloat(todayRevenueResult[0].revenue),
            this_month_revenue: parseFloat(monthRevenueResult[0].revenue)
        };
        
    } catch (error) {
        console.error('Dashboard stats retrieval failed:', error);
        throw error;
    }
}