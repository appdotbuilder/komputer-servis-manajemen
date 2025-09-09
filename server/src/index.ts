import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schemas
import {
  createCustomerInputSchema,
  updateCustomerInputSchema,
  createProductInputSchema,
  updateProductInputSchema,
  createStockMovementInputSchema,
  createServiceInputSchema,
  updateServiceInputSchema,
  createTransactionInputSchema,
  createTransactionItemInputSchema,
  createUserInputSchema,
  getFinancialReportInputSchema
} from './schema';

// Import all handlers
import { createCustomer } from './handlers/create_customer';
import { getCustomers } from './handlers/get_customers';
import { getCustomer } from './handlers/get_customer';
import { updateCustomer } from './handlers/update_customer';

import { createProduct } from './handlers/create_product';
import { getProducts } from './handlers/get_products';
import { getProduct } from './handlers/get_product';
import { updateProduct } from './handlers/update_product';

import { createStockMovement } from './handlers/create_stock_movement';
import { getStockMovements } from './handlers/get_stock_movements';
import { getStockMovementsByProduct } from './handlers/get_stock_movements_by_product';

import { createService } from './handlers/create_service';
import { getServices } from './handlers/get_services';
import { getService } from './handlers/get_service';
import { updateService } from './handlers/update_service';

import { createTransaction } from './handlers/create_transaction';
import { getTransactions } from './handlers/get_transactions';
import { getTransaction } from './handlers/get_transaction';
import { createTransactionItem } from './handlers/create_transaction_item';

import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { getTechnicians } from './handlers/get_technicians';

import { getFinancialReport } from './handlers/get_financial_report';
import { getStockReport } from './handlers/get_stock_report';
import { getLowStockProducts } from './handlers/get_low_stock_products';

import { getCustomerHistory } from './handlers/get_customer_history';
import { getDashboardStats } from './handlers/get_dashboard_stats';

// Context type definition
export interface Context {
  user?: {
    id: number;
    role: 'admin' | 'technician' | 'staff';
    username: string;
  };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Customer management
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),
  
  getCustomers: publicProcedure
    .query(() => getCustomers()),
  
  getCustomer: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getCustomer(input.id)),
  
  updateCustomer: publicProcedure
    .input(updateCustomerInputSchema)
    .mutation(({ input }) => updateCustomer(input)),

  getCustomerHistory: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(({ input }) => getCustomerHistory(input.customerId)),

  // Product/Stock management
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),
  
  getProducts: publicProcedure
    .query(() => getProducts()),
  
  getProduct: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getProduct(input.id)),
  
  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),

  getLowStockProducts: publicProcedure
    .query(() => getLowStockProducts()),

  // Stock movement management
  createStockMovement: publicProcedure
    .input(createStockMovementInputSchema)
    .mutation(({ input, ctx }) => createStockMovement(input, ctx)),
  
  getStockMovements: publicProcedure
    .query(() => getStockMovements()),
  
  getStockMovementsByProduct: publicProcedure
    .input(z.object({ productId: z.number() }))
    .query(({ input }) => getStockMovementsByProduct(input.productId)),

  // Service management
  createService: publicProcedure
    .input(createServiceInputSchema)
    .mutation(({ input }) => createService(input)),
  
  getServices: publicProcedure
    .query(() => getServices()),
  
  getService: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getService(input.id)),
  
  updateService: publicProcedure
    .input(updateServiceInputSchema)
    .mutation(({ input }) => updateService(input)),

  // Transaction management
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input, ctx }) => createTransaction(input, ctx)),
  
  getTransactions: publicProcedure
    .query(() => getTransactions()),
  
  getTransaction: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getTransaction(input.id)),

  createTransactionItem: publicProcedure
    .input(createTransactionItemInputSchema)
    .mutation(({ input }) => createTransactionItem(input)),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  getTechnicians: publicProcedure
    .query(() => getTechnicians()),

  // Reports (Priority features)
  getFinancialReport: publicProcedure
    .input(getFinancialReportInputSchema)
    .query(({ input, ctx }) => getFinancialReport(input, ctx)),
  
  getStockReport: publicProcedure
    .query(() => getStockReport()),

  // Dashboard
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext({ req }): Context {
      // In a real application, you would extract user information from JWT token or session
      // For now, we'll simulate an authenticated context
      // You can replace this with your actual authentication logic
      const authHeader = req.headers.authorization;
      
      // Simulate user context - replace with actual authentication
      if (authHeader) {
        // This is where you would decode JWT or validate session
        // For demonstration, we'll create a mock user
        return {
          user: {
            id: 1,
            role: 'admin', // This would come from your authentication system
            username: 'admin'
          }
        };
      }
      
      return {};
    },
  });
  server.listen(port);
  console.log(`Computer Service Management TRPC server listening at port: ${port}`);
}

start();