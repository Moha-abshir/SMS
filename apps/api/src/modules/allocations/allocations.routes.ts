import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { AllocationsController } from './allocations.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', AllocationsController.getAllocations);
router.post('/class-teacher', authorizePermission('staff:manage'), AllocationsController.assignClassTeacher);
router.post('/subject-teacher', authorizePermission('staff:manage'), AllocationsController.assignSubjectTeacher);
router.delete('/subject-teacher/:id', authorizePermission('staff:manage'), AllocationsController.removeSubjectAllocation);

export default router;
