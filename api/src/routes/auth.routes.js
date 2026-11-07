import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimiters.js';
import { requireAuth } from '../middleware/auth.js';
import { register, login, me, updateMe, changePassword } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', requireAuth, me);
router.patch('/me', requireAuth, updateMe);
router.post('/change-password', requireAuth, changePassword);

export default router;
