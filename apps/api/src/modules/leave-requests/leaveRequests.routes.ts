import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { LeaveRequestsController } from './leaveRequests.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', LeaveRequestsController.getLeaveRequests);
router.get('/:id/print', LeaveRequestsController.getLeaveSlipPrintData);
router.post('/', authorizePermission(['leave:manage', 'staff:manage']), LeaveRequestsController.createLeaveRequest);
router.put('/:id/status', authorizePermission(['leave:manage', 'staff:manage']), LeaveRequestsController.updateLeaveStatus);
router.put('/:id/report-back', authorizePermission(['leave:manage', 'staff:manage']), LeaveRequestsController.markReportedBack);

export default router;
