import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { userRateLimiter } from '../../middleware/auth.js';

const router = Router();

router.post('/login', userRateLimiter, AuthController.login);
router.post('/verify-2fa', userRateLimiter, AuthController.verify2FA);
router.post('/resend-otp', userRateLimiter, AuthController.resendOtp);

export default router;
