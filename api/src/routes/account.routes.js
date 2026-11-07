import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listAccounts,
  createAccount,
  getAccountSummary,
  updateAccount,
  deleteAccount,
} from '../controllers/account.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/summary', getAccountSummary);
router.get('/', listAccounts);
router.post('/', createAccount);
router.patch('/:id', updateAccount);
router.delete('/:id', deleteAccount);

export default router;
