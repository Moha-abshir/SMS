import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { AdmissionsController } from './admissions.controller.js';

const router = Router();

router.use(authenticate);

router.get('/guardians/search', AdmissionsController.searchGuardians);
router.get('/classes', AdmissionsController.getClasses);
router.get('/students', AdmissionsController.getStudents);
router.post('/students', authorizePermission('students:create'), AdmissionsController.admitStudent);
router.put('/students/:id/approve', authorizePermission('students:approve'), AdmissionsController.approveAdmission);
router.put('/students/:id/transfer', authorizePermission('students:transfer'), AdmissionsController.transferStudent);

export default router;
