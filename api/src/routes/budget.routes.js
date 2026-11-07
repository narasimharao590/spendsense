import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  budgetSummary,
} from '../controllers/budget.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/summary', budgetSummary);
router.get('/', listBudgets);
router.post('/', createBudget);
router.patch('/:id', updateBudget);
router.delete('/:id', deleteBudget);

export default router;
