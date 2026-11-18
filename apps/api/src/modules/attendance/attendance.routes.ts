import { LeaveRequestsService } from '../leave-requests/leaveRequests.service.js';
import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { AttendanceController } from './attendance.controller.js';

const router = Router();

router.use(authenticate);
const leaders = ['HEAD_TEACHER', 'DEPUTY_HEAD', 'DEPUTY_HEAD_TEACHER', 'DOS', 'SECRETARY'];
const leadershipOnly = (req: any, res: any, next: any) => leaders.includes(req.user.roleName) ? next() : res.status(403).json({ success: false, message: 'Attendance oversight access denied' });
router.use('/classes/:classId', async (req, res, next) => {
  try {
    if (leaders.includes(req.user!.roleName) || (req.user!.roleName === 'TEACHER' && await LeaveRequestsService.isEffectiveClassTeacher(req.user!.id, req.params.classId))) return next();
    return res.status(403).json({ success: false, message: 'Attendance access requires your assigned class' });
  } catch { return res.status(503).json({ success: false, message: 'Attendance authorization temporarily unavailable' }); }
});

router.get('/school-wide', leadershipOnly, AttendanceController.getSchoolWideAttendance);
router.get('/classes/:classId/register', AttendanceController.getClassRegister);
router.get('/classes/:classId/history', AttendanceController.getClassAttendanceHistory);
router.post('/classes/:classId/register', AttendanceController.saveClassRegister);
router.post('/notify-parent', authorizePermission('attendance:manage'), AttendanceController.notifyParentOfAbsence);
router.post('/notify-all-absent', leadershipOnly, authorizePermission('attendance:manage'), AttendanceController.notifyAllUnnotifiedAbsent);

export default router;
