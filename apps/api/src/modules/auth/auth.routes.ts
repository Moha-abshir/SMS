import { Router } from 'express';
import { AuthController } from './auth.controller';
import { userRateLimiter } from '../../middleware/auth';

const router = Router();

router.post('/login', userRateLimiter(5, 60000), AuthController.login);
router.post('/verify-2fa', userRateLimiter(5, 60000), AuthController.verify2FA);

export default router;
