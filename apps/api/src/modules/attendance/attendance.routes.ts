import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { AttendanceController } from './attendance.controller.js';

const router = Router();

router.use(authenticate);

router.get('/school-wide', AttendanceController.getSchoolWideAttendance);
router.get('/classes/:classId/register', AttendanceController.getClassRegister);
router.post('/classes/:classId/register', authorizePermission('attendance:manage'), AttendanceController.saveClassRegister);
router.post('/notify-parent', authorizePermission('attendance:manage'), AttendanceController.notifyParentOfAbsence);
router.post('/notify-all-absent', authorizePermission('attendance:manage'), AttendanceController.notifyAllUnnotifiedAbsent);

export default router;
