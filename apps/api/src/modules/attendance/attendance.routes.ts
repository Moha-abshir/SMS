import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { AttendanceController } from './attendance.controller.js';

const router = Router();

router.use(authenticate);

router.get('/school-wide', AttendanceController.getSchoolWideAttendance);
router.post('/notify-parent', authorizePermission('attendance:manage'), AttendanceController.notifyParentOfAbsence);

export default router;
