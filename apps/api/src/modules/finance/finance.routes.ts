import { Router } from 'express';
import { authenticate, authorizePermission } from '../../middleware/auth.js';
import { FinanceController } from './finance.controller.js';

const router = Router();

router.use(authenticate);

// Financial summary
router.get('/summary', authorizePermission('finance:view'), FinanceController.getFinancialSummary);

router.get('/billing-preview', authorizePermission('finance:view'), FinanceController.previewBilling);
router.post('/billing', authorizePermission('finance:bill'), FinanceController.generateBills);

// Fee payments
router.get('/payments', authorizePermission('finance:view'), FinanceController.getPayments);
router.post('/payments', authorizePermission('finance:record_payment'), FinanceController.recordPayment);

router.get('/reconciliation', authorizePermission('finance:view'), FinanceController.reconciliation);
router.get('/reversals/history', authorizePermission('finance:view'), FinanceController.reversalHistory);

// Payment reversals queue
router.get('/reversals/pending', authorizePermission('finance:view'), FinanceController.getPendingReversals);
router.post('/reversals', authorizePermission('finance:record_payment'), FinanceController.requestReversal);
router.put('/reversals/:id/approve', authorizePermission('finance:reversal_approve'), FinanceController.approveReversal);
router.put('/reversals/:id/reject', authorizePermission('finance:reversal_approve'), FinanceController.rejectReversal);

// Student statement
router.get('/students/:studentId/statement', authorizePermission('finance:view'), FinanceController.getStudentStatement);

export default router;
