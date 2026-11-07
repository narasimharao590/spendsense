import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { overview, analytics } from '../controllers/stats.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/overview', overview);
router.get('/analytics', analytics);

export default router;
