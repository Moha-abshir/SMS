import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from './auth.controller.js';
import { userRateLimiter } from '../../middleware/auth.js';

const router = Router();
// Bound aggregate auth traffic as well as per-account attempts, including email rotation.
router.use(rateLimit({ windowMs: 120_000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }));

router.post('/login', userRateLimiter, AuthController.login);
router.post('/verify-2fa', userRateLimiter, AuthController.verify2FA);
router.post('/resend-otp', userRateLimiter, AuthController.resendOtp);

import { InvitationsController } from '../staff/invitations.controller.js';
import { PasswordResetController } from './passwordReset.controller.js';
import { EmailChangeController } from './emailChange.controller.js';

router.post('/invitations/validate', userRateLimiter, InvitationsController.validateInvitation);
router.post('/invitations/accept', userRateLimiter, InvitationsController.acceptInvitation);

router.post('/password-reset/request', userRateLimiter, PasswordResetController.requestPasswordReset);
router.post('/password-reset/verify', userRateLimiter, PasswordResetController.verifyToken);
router.post('/password-reset/complete', userRateLimiter, PasswordResetController.completePasswordReset);

router.post('/email-change/verify', userRateLimiter, EmailChangeController.verifyToken);
router.post('/email-change/complete', userRateLimiter, EmailChangeController.completeEmailChange);

export default router;
