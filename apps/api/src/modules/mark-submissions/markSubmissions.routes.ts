import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { MarkSubmissionsController } from './markSubmissions.controller.js';

const router = Router();

router.use(authenticate);

// Teacher Mark Entry & Draft/Submission Endpoints
router.get('/entry-sheet', MarkSubmissionsController.getMarksheetEntry);
router.post('/save-draft', MarkSubmissionsController.saveMarksheetDraft);
router.post('/submit', MarkSubmissionsController.submitMarksheet);
router.post('/request-correction-by-teacher', MarkSubmissionsController.requestCorrectionByTeacher);

// Deputy Review & Approval Endpoints
router.get('/', MarkSubmissionsController.getSubmissions);
router.get('/:id/scores', MarkSubmissionsController.getSubmissionScores);
router.put('/:id/approve', authorizePermission('marks:approve'), MarkSubmissionsController.approveSubmission);
router.put('/:id/request-correction', authorizePermission('marks:approve'), MarkSubmissionsController.requestCorrection);
router.put('/:id/lock', authorizePermission('marks:approve'), MarkSubmissionsController.lockSubmission);

export default router;
