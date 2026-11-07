import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import transactionRoutes from './transaction.routes.js';
import budgetRoutes from './budget.routes.js';
import accountRoutes from './account.routes.js';
import paymentRoutes from './payment.routes.js';
import statsRoutes from './stats.routes.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    name: 'SpendSense API',
    version: '1.0.0',
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'PATCH /api/auth/me',
      'POST /api/auth/change-password',
      'GET /api/categories',
      'POST /api/categories',
      'PATCH /api/categories/:id',
      'DELETE /api/categories/:id',
      'GET /api/transactions',
      'POST /api/transactions',
      'GET /api/transactions/monthly?year=',
      'GET /api/transactions/:id',
      'PATCH /api/transactions/:id',
      'DELETE /api/transactions/:id',
      'GET /api/budgets?month=',
      'POST /api/budgets',
      'PATCH /api/budgets/:id',
      'DELETE /api/budgets/:id',
      'GET /api/budgets/summary?month=',
      'GET /api/accounts?kind=',
      'POST /api/accounts',
      'GET /api/accounts/summary',
      'PATCH /api/accounts/:id',
      'DELETE /api/accounts/:id',
      'GET /api/payments?status=&isActive=',
      'POST /api/payments',
      'GET /api/payments/summary',
      'PATCH /api/payments/:id',
      'POST /api/payments/:id/pay',
      'DELETE /api/payments/:id',
      'GET /api/stats/overview?month=',
      'GET /api/stats/analytics?year=',
      'GET /api/health',
    ],
  });
});

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/transactions', transactionRoutes);
router.use('/budgets', budgetRoutes);
router.use('/accounts', accountRoutes);
router.use('/payments', paymentRoutes);
router.use('/stats', statsRoutes);

export default router;
