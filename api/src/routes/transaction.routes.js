import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listTransactions,
  createTransaction,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  monthlySummary,
} from '../controllers/transaction.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/monthly', monthlySummary);
router.get('/', listTransactions);
router.post('/', createTransaction);
router.get('/:id', getTransaction);
router.patch('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
