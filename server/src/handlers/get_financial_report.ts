import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type GetFinancialReportInput, type FinancialReport } from '../schema';
import { eq, gte, lte, and, count, sum, SQL } from 'drizzle-orm';

export async function getFinancialReport(input: GetFinancialReportInput): Promise<FinancialReport> {
  try {
    const startDate = new Date(input.start_date);
    const endDate = new Date(input.end_date);
    
    // Build query conditions for date range
    const conditions: SQL<unknown>[] = [];
    conditions.push(gte(transactionsTable.created_at, startDate));
    conditions.push(lte(transactionsTable.created_at, endDate));
    
    // Get aggregated data by transaction type
    const typeAggregateQuery = db.select({
      type: transactionsTable.type,
      total_amount: sum(transactionsTable.total_amount),
      transaction_count: count(transactionsTable.id)
    })
    .from(transactionsTable)
    .where(and(...conditions))
    .groupBy(transactionsTable.type);
    
    const typeResults = await typeAggregateQuery.execute();
    
    // Get overall totals
    const overallQuery = db.select({
      total_revenue: sum(transactionsTable.total_amount),
      total_count: count(transactionsTable.id)
    })
    .from(transactionsTable)
    .where(and(...conditions));
    
    const overallResult = await overallQuery.execute();
    
    // Initialize metrics
    let serviceRevenue = 0;
    let salesRevenue = 0;
    
    // Calculate metrics from type results
    for (const result of typeResults) {
      const amount = result.total_amount ? parseFloat(result.total_amount) : 0;
      
      if (result.type === 'service') {
        serviceRevenue = amount;
      } else if (result.type === 'sale') {
        salesRevenue = amount;
      }
    }
    
    const totalRevenue = overallResult[0]?.total_revenue 
      ? parseFloat(overallResult[0].total_revenue) 
      : 0;
    const totalTransactions = overallResult[0]?.total_count || 0;
    
    return {
      period: input.period,
      total_revenue: totalRevenue,
      service_revenue: serviceRevenue,
      sales_revenue: salesRevenue,
      total_transactions: totalTransactions,
      period_start: startDate,
      period_end: endDate
    };
  } catch (error) {
    console.error('Financial report generation failed:', error);
    throw error;
  }
}