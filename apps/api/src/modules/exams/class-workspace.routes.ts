import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { ClassWorkspaceController } from './class-workspace.controller.js';

const router = Router();

router.use(authenticate);

// 1. GET /api/examinations/class-workspace/:classId
router.get('/:classId', ClassWorkspaceController.getClassWorkspace);

// 2. GET /api/examinations/class-workspace/:classId/learners/:studentId
router.get('/:classId/learners/:studentId', ClassWorkspaceController.getLearnerDiagnostic);

// 3. POST /api/examinations/class-workspace/:classId/learners/:studentId/remark
router.post('/:classId/learners/:studentId/remark', ClassWorkspaceController.saveLearnerRemark);

// 4. POST /api/examinations/class-workspace/:classId/target-mean
router.post('/:classId/target-mean', ClassWorkspaceController.setTargetMean);

export default router;
