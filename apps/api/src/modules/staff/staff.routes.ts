import { Router } from 'express';
import { InvitationsController } from './invitations.controller.js';
import { StaffController } from './staff.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Apply auth middleware to all staff routes
router.use(authenticate);

router.get('/roles', StaffController.getRoles);
router.get('/', StaffController.getAllStaff);
router.post('/invitations', InvitationsController.createInvitation);
router.post('/invitations/:id/resend', InvitationsController.resendInvitation);
router.post('/invitations/:id/cancel', InvitationsController.cancelInvitation);

// Legacy routes (we might keep update/toggle/reset for ACTIVE staff)
router.put('/:id', StaffController.updateStaff);
router.patch('/:id/status', StaffController.toggleStatus);
router.post('/:id/reset-password', StaffController.resetPassword);

export default router;
