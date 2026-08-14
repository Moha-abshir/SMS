import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { MarkSubmissionsController } from './markSubmissions.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', MarkSubmissionsController.getSubmissions);
router.put('/:id/approve', authorizePermission('marks:approve'), MarkSubmissionsController.approveSubmission);
router.put('/:id/request-correction', authorizePermission('marks:approve'), MarkSubmissionsController.requestCorrection);
router.put('/:id/lock', authorizePermission('marks:approve'), MarkSubmissionsController.lockSubmission);

export default router;
