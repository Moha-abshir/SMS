import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { TimetableController } from './timetable.controller.js';

const router = Router();

router.use(authenticate);

// Config endpoints
router.get('/config', TimetableController.getConfig);
router.post('/config', TimetableController.saveConfig);

// Generation endpoint
router.post('/generate', TimetableController.generate);

// Timetable views
router.get('/master', TimetableController.getMasterTimetable);
router.get('/classes/:classId', TimetableController.getClassTimetable);
router.get('/teachers/:teacherId', TimetableController.getTeacherTimetable);

// Slot movement & swapping
router.post('/validate-movement', TimetableController.validateMovement);
router.patch('/swap', TimetableController.swapSlots);

export default router;
