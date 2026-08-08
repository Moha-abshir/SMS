import { Router } from 'express';
import { InvitationsController } from './invitations.controller.js';
import { StaffController } from './staff.controller.js';
import { PasswordResetController } from '../auth/passwordReset.controller.js';
import { TwoFactorResetController } from '../auth/twoFactorReset.controller.js';
import { authenticate, authorizePermission } from '../../middleware/auth.js';

const router = Router();

// Apply auth middleware to all staff routes
router.use(authenticate);

router.get('/roles', StaffController.getRoles);
router.get('/', StaffController.getAllStaff);
router.post('/invitations', InvitationsController.createInvitation);
router.post('/invitations/:id/resend', InvitationsController.resendInvitation);
router.post('/invitations/:id/cancel', InvitationsController.cancelInvitation);

// Administrator-Initiated Password Reset
router.post('/:id/password-reset-request', authorizePermission('users.password_reset'), PasswordResetController.initiatePasswordReset);

// Staff Detail Management
router.put('/:id', StaffController.updateStaff);
router.patch('/:id/status', StaffController.toggleStatus);

export default router;
