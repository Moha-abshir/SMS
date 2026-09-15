import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { AdmissionsController } from './admissions.controller.js';

const router = Router();

router.use(authenticate);

router.get('/guardians/search', AdmissionsController.searchGuardians);
router.get('/classes', AdmissionsController.getClasses);
router.get('/template.csv', AdmissionsController.getImportTemplateCsv);
router.get('/pending', authorizePermission('students:approve'), AdmissionsController.getPendingAdmissions);
router.get('/students', AdmissionsController.getStudents);
router.post('/bulk-import', authorizePermission('students:create'), AdmissionsController.bulkImportStudents);
router.post('/students', authorizePermission('students:create'), AdmissionsController.admitStudent);
router.put('/students/:id/approve', authorizePermission('students:approve'), AdmissionsController.approveAdmission);
router.put('/students/:id/reject', authorizePermission('students:approve'), AdmissionsController.rejectAdmission);
router.put('/students/:id/expel', authorizePermission('students:approve'), AdmissionsController.expelStudent);
router.put('/students/:id/transfer', authorizePermission('students:transfer'), AdmissionsController.transferStudent);

export default router;
