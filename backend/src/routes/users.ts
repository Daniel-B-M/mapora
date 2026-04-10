import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { getMe, toggleVisited } from '../controllers/userController';

const router = Router();

router.get('/me', requireAuth, getMe);
router.patch('/me/visited', requireAuth, toggleVisited);

export default router;
