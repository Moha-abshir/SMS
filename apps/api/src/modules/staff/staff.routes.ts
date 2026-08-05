import { Router } from 'express';
import { StaffController } from './staff.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Apply auth middleware to all staff routes
router.use(authenticate);

router.get('/', StaffController.getAllStaff);
router.post('/', StaffController.createStaff);
router.put('/:id', StaffController.updateStaff);
router.patch('/:id/status', StaffController.toggleStatus);
router.post('/:id/reset-password', StaffController.resetPassword);

export default router;
