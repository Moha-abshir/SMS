import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { AllocationsController } from './allocations.controller.js';
import { AdmissionsController } from '../admissions/admissions.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', AllocationsController.getAllocations);
router.get('/classes', AdmissionsController.getClasses);
router.post('/class-teacher', authorizePermission(['allocations:manage', 'staff:manage']), AllocationsController.assignClassTeacher);
router.post('/subject-teacher', authorizePermission(['allocations:manage', 'staff:manage']), AllocationsController.assignSubjectTeacher);
router.delete('/subject-teacher/:id', authorizePermission(['allocations:manage', 'staff:manage']), AllocationsController.removeSubjectAllocation);

export default router;
