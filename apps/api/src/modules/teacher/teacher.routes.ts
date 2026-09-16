import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { TeacherController } from './teacher.controller.js';

const router = Router();

router.use(authenticate);

router.get('/workstation', TeacherController.getWorkstation);
router.get('/class-learners', TeacherController.getClassLearners);
router.get('/learners/:studentId/performance', TeacherController.getLearnerPerformance);
router.post('/send-learner-sms', TeacherController.sendLearnerControlledSms);

export default router;
