import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { AcademicAllocationsController } from './academicAllocations.controller.js';

const router = Router();

router.use(authenticate);

// Invigilator routes
router.get('/invigilators', AcademicAllocationsController.getInvigilators);
router.get('/invigilators/available', AcademicAllocationsController.getAvailableInvigilators);
router.post('/invigilators', authorizePermission('exams:manage'), AcademicAllocationsController.assignInvigilator);
router.delete('/invigilators/:id', authorizePermission('exams:manage'), AcademicAllocationsController.removeInvigilator);

// Marking routes
router.get('/marking', AcademicAllocationsController.getMarkingAllocations);
router.get('/marking/self-contained-roster', AcademicAllocationsController.getSelfContainedRoster);
router.get('/marking/eligible-teachers', AcademicAllocationsController.getEligibleMarkingTeachers);
router.post('/marking', authorizePermission('exams:manage'), AcademicAllocationsController.assignMarking);
router.delete('/marking/:id', authorizePermission('exams:manage'), AcademicAllocationsController.removeMarking);

export default router;

