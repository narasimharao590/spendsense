import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listPayments,
  createPayment,
  updatePayment,
  deletePayment,
  payPayment,
  paymentsSummary,
} from '../controllers/payment.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/summary', paymentsSummary);
router.get('/', listPayments);
router.post('/', createPayment);
router.post('/:id/pay', payPayment);
router.patch('/:id', updatePayment);
router.delete('/:id', deletePayment);

export default router;
