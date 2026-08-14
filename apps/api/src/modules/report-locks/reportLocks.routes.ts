import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { ReportLocksController } from './reportLocks.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', ReportLocksController.getReportLocks);
router.put('/toggle', authorizePermission('exams:manage'), ReportLocksController.toggleReportLock);

export default router;
