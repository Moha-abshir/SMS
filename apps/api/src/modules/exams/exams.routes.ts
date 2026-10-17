import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { ExamsController } from './exams.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', ExamsController.getExams);
router.post('/', authorizePermission('exams:manage'), ExamsController.createExam);
router.put('/:id', authorizePermission('exams:manage'), ExamsController.updateExam);
router.delete('/:id', authorizePermission('exams:manage'), ExamsController.deleteExam);
router.put('/:id/status', authorizePermission('exams:manage'), ExamsController.updateExamStatus);
router.get('/:id/progress', ExamsController.getExamProgress);
router.post('/generate-timetable', authorizePermission('exams:manage'), ExamsController.generateExamTimetable);
router.get('/:id/sessions', ExamsController.getExamSessions);
router.post('/sessions', authorizePermission('exams:manage'), ExamsController.createExamSession);
router.post('/sessions/swap', authorizePermission('exams:manage'), ExamsController.swapExamSessions);
router.put('/sessions/:id', authorizePermission('exams:manage'), ExamsController.updateExamSession);
router.delete('/sessions/:id', authorizePermission('exams:manage'), ExamsController.deleteExamSession);

export default router;
