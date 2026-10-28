import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { TimetableController } from './timetable.controller.js';

const router = Router();

router.use(authenticate);

// Middleware to restrict timetable setup & management exclusively to Deputy Head Teacher
const requireDeputyHead = (req: any, res: any, next: any) => {
  const role = req.user?.roleName;
  if (role === 'DEPUTY_HEAD' || role === 'DEPUTY_HEAD_TEACHER') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access restricted: Only the Deputy Head Teacher is authorized to set up, configure, or modify the school timetable.',
  });
};

// Config endpoints
router.get('/config', TimetableController.getConfig);
router.post('/config', requireDeputyHead, TimetableController.saveConfig);

// Generation endpoint
router.post('/generate', requireDeputyHead, TimetableController.generate);

// Metadata & Status
router.get('/classes', TimetableController.getTargetClasses);
router.get('/teachers', TimetableController.getTargetTeachers);
router.get('/status', TimetableController.getAllocationsStatus);

// Timetable views
router.get('/master', requireDeputyHead, TimetableController.getMasterTimetable);
router.get('/classes/:classId', TimetableController.getClassTimetable);
router.get('/teachers/:teacherId', TimetableController.getTeacherTimetable);

// Slot movement & swapping
router.post('/validate-movement', requireDeputyHead, TimetableController.validateMovement);
router.get('/slots/:slotId/compatible-swaps', requireDeputyHead, TimetableController.getCompatibleSwaps);
router.patch('/swap', requireDeputyHead, TimetableController.swapSlots);

export default router;
